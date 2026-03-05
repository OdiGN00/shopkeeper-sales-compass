

# Fix Data Isolation and Persistence

## Problems Identified

There are three categories of issues causing data loss and cross-user data leakage:

### 1. Multiple services still use global localStorage keys (not user-specific)
These files directly access `localStorage.getItem('products')`, `localStorage.getItem('sales')`, etc. instead of user-specific keys:

| File | Issue |
|------|-------|
| `src/services/inventoryService.ts` | Reads/writes `'products'` globally (lines 24, 80, 96) |
| `src/services/salesService.ts` | Reads `'products'` globally (line 27) |
| `src/services/sync/syncStatusManager.ts` | Reads `'sales'`, `'products'`, `'customers'`, `'creditTransactions'` globally (lines 102-119) |
| `src/services/sync/dataConsistencyService.ts` | Reads/writes `'products'`, `'sales'` globally (lines 162, 190, 196, 227) |
| `src/services/sync/duplicatePreventionService.ts` | Reads/writes `'products'`, `'customers'` globally (lines 139, 153, 157, 170) |
| `src/hooks/useCustomerOperations.ts` | Reads `'creditTransactions'` globally (line 39) |
| `src/services/sync/syncMetadataManager.ts` | Reads/writes `'lastSync'`, `'syncErrors'`, etc. globally |

### 2. Pull queries don't filter by user_id
The `pullProducts()`, `pullCustomers()`, and `pullCreditTransactions()` methods in the sync services do `supabase.from('...').select('*')` **without** `.eq('user_id', user.id)`. Combined with the RLS policy that allows `user_id IS NULL` records to be visible, this pulls in other users' unassigned data.

### 3. Products RLS allows `user_id IS NULL` records
The current SELECT policy `Users can view own or shared products` includes `OR user_id IS NULL`, which exposes 25 legacy products to all users.

### 4. No auto-sync on login / no data recovery after logout
When a user logs out and back in, their user-specific localStorage is intact but the old global keys are gone. There's no mechanism to restore data from the server on login.

---

## Plan

### Task 1: Database migration - Remove NULL user_id visibility from products RLS
- Drop the existing `"Users can view own or shared products"` policy
- Create a new strict policy: `USING (auth.uid() = user_id)` (SELECT only own)
- Keep UPDATE/DELETE policies strict too (remove `OR user_id IS NULL`)
- This hides the 25 legacy unowned products from all users

### Task 2: Add user_id filtering to all pull/query methods
Update these sync pull methods to filter by `user_id`:
- **`productSync.pullProducts()`**: Add `.eq('user_id', user.id)` — requires passing user.id or fetching it internally
- **`customerSync.pullCustomers()`**: Same
- **`creditTransactionSync.pullCreditTransactions()`**: Same
- **`productEnsureSync.ensureProductsExist()`**: Add `.eq('user_id', user.id)` to the name lookup and set `user_id` on insert

### Task 3: Fix all global localStorage access to use user-specific keys
Update these service files to accept/fetch user.id and use `getUserStorageKey()`:

- **`src/services/inventoryService.ts`** — Accept userId parameter, use `getUserStorageKey('products', userId)`
- **`src/services/salesService.ts`** — Fetch user, use user-specific products key
- **`src/services/sync/syncStatusManager.ts`** — Fetch user, use user-specific keys for counting pending syncs
- **`src/services/sync/dataConsistencyService.ts`** — Fetch user, use user-specific keys
- **`src/services/sync/duplicatePreventionService.ts`** — Fetch user, use user-specific keys
- **`src/hooks/useCustomerOperations.ts`** — Use `useUserStorage` hook to read local credit transactions with user-specific key
- **`src/services/sync/syncMetadataManager.ts`** — Use user-specific keys for sync metadata

### Task 4: Auto-migrate legacy localStorage data on login
Add a one-time migration in the AuthContext (or a new hook) that runs after login:
- Check if user-specific keys exist (e.g., `products_{userId}`)
- If not, check if legacy global keys exist (`products`, `sales`, `customers`, `creditTransactions`)
- If legacy data exists, copy it to user-specific keys and delete the legacy keys
- Set a flag `migrated_{userId}` to prevent re-migration

### Task 5: Auto-pull from server on login
After successful authentication, trigger an automatic pull from Supabase to populate user-specific localStorage with server data (if local is empty). This ensures data survives logout/login cycles.

### Technical Details

**Migration SQL:**
```sql
DROP POLICY IF EXISTS "Users can view own or shared products" ON public.products;
CREATE POLICY "Users can view their own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);
```

**Pull methods pattern** (applied to all three sync services):
```typescript
async pullProducts(): Promise<{ products: any[], errors: string[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { products: [], errors: ['Not authenticated'] };
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id);  // <-- Added filter
  // ...
}
```

**Legacy migration hook pattern:**
```typescript
// In AuthContext or a dedicated useDataMigration hook
useEffect(() => {
  if (!user?.id) return;
  const migrationKey = `migrated_${user.id}`;
  if (localStorage.getItem(migrationKey)) return;
  
  ['products', 'sales', 'customers', 'creditTransactions'].forEach(key => {
    const legacy = localStorage.getItem(key);
    const userKey = `${key}_${user.id}`;
    if (legacy && !localStorage.getItem(userKey)) {
      localStorage.setItem(userKey, legacy);
    }
  });
  localStorage.setItem(migrationKey, 'true');
}, [user?.id]);
```

**Files to modify (13 total):**
1. `src/services/inventoryService.ts`
2. `src/services/salesService.ts`
3. `src/services/sync/syncStatusManager.ts`
4. `src/services/sync/dataConsistencyService.ts`
5. `src/services/sync/duplicatePreventionService.ts`
6. `src/services/sync/productSync.ts`
7. `src/services/sync/customerSync.ts`
8. `src/services/sync/creditTransactionSync.ts`
9. `src/services/sync/productEnsureSync.ts`
10. `src/services/sync/syncMetadataManager.ts`
11. `src/hooks/useCustomerOperations.ts`
12. `src/contexts/AuthContext.tsx`
13. New migration SQL

