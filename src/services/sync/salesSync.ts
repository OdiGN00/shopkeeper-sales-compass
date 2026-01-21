
import { supabase } from "@/integrations/supabase/client";
import { Sale } from "@/types/sales";
import { SyncResult } from "./types";
import { productEnsureSync } from "./productEnsureSync";
import { getUserStorageKey } from "@/hooks/useUserStorage";

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const salesSync = {
  async syncSales(): Promise<SyncResult> {
    console.log('SalesSync: Starting enhanced sales sync...');
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, errors: ['User not authenticated'], synced: 0 };
    }

    const salesStorageKey = getUserStorageKey('sales', user.id);
    const productsStorageKey = getUserStorageKey('products', user.id);
    
    const sales: (Sale & { id: number; synced: boolean })[] = JSON.parse(localStorage.getItem(salesStorageKey) || '[]').map((s: any) => ({
      ...s,
      timestamp: new Date(s.timestamp)
    }));

    const unsyncedSales = sales.filter(s => !s.synced);
    if (unsyncedSales.length === 0) {
      return { success: true, errors: [], synced: 0 };
    }

    // Get all products from localStorage to ensure they exist
    const storedProducts = localStorage.getItem(productsStorageKey);
    const localProducts = storedProducts ? JSON.parse(storedProducts).map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    })) : [];

    // Get unique products used in sales
    const usedProductIds = new Set<string>();
    unsyncedSales.forEach(sale => {
      sale.items.forEach(item => {
        usedProductIds.add(item.id);
      });
    });

    const requiredProducts = localProducts.filter((p: any) => usedProductIds.has(p.id));
    
    // Ensure all required products exist in Supabase
    console.log('SalesSync: Ensuring required products exist in Supabase...');
    const productEnsureResult = await productEnsureSync.ensureProductsExist(requiredProducts);
    
    if (!productEnsureResult.success) {
      console.error('SalesSync: Failed to ensure products exist:', productEnsureResult.errors);
      return { success: false, errors: productEnsureResult.errors, synced: 0 };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const sale of unsyncedSales) {
      try {
        console.log(`SalesSync: Processing sale with ${sale.items.length} items...`);

        // Map sale items to use Supabase product IDs and validate inventory
        const mappedSaleItems = sale.items.map(item => {
          const supabaseProductId = productEnsureResult.productMap.get(item.id);
          if (!supabaseProductId) {
            throw new Error(`Product mapping not found for item: ${item.name} (${item.id})`);
          }
          
          return {
            product_id: supabaseProductId,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price
          };
        });

        // Validate inventory constraints before proceeding
        const inventoryValidation = await productEnsureSync.validateInventoryConstraints(
          mappedSaleItems.map(item => ({ ...item, product_id: item.product_id })), 
          productEnsureResult.productMap
        );

        if (!inventoryValidation.valid) {
          console.warn(`SalesSync: Inventory validation failed for sale:`, inventoryValidation.errors);
          errors.push(...inventoryValidation.errors.map(err => `Sale inventory validation: ${err}`));
          continue;
        }

        // Map payment type
        const paymentTypeMap = {
          'mobile-money': 'mobile_money' as const,
          'cash': 'cash' as const,
          'credit': 'credit' as const
        };

        // Get current user ID for RLS
        const { data: { user } } = await supabase.auth.getUser();

        // Create sale in a transaction to ensure consistency
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            total_amount: sale.total,
            payment_type: paymentTypeMap[sale.paymentType],
            customer_id: sale.customer?.id || null,
            sale_date: sale.timestamp.toISOString(),
            user_id: user?.id,
            sync_status: 'synced'
          })
          .select()
          .single();

        if (saleError) {
          errors.push(`Failed to sync sale: ${saleError.message}`);
          console.error('SalesSync: Error creating sale:', saleError);
          continue;
        }

        console.log('SalesSync: Sale created successfully, now creating sale items...');

        // Create sale items with proper product IDs
        const saleItemsWithSaleId = mappedSaleItems.map(item => ({
          ...item,
          sale_id: saleData.id,
          sync_status: 'synced' as const
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsWithSaleId);

        if (itemsError) {
          errors.push(`Failed to sync sale items: ${itemsError.message}`);
          console.error('SalesSync: Error creating sale items:', itemsError);
          continue;
        }

        console.log('SalesSync: Sale items created successfully');

        // If credit sale, create credit transaction
        if (sale.paymentType === 'credit' && sale.customer) {
          console.log('SalesSync: Creating credit transaction...');
          
          // Get current user ID for RLS
          const { data: { user } } = await supabase.auth.getUser();
          
          const { error: creditError } = await supabase
            .from('credit_transactions')
            .insert({
              customer_id: sale.customer.id,
              sale_id: saleData.id,
              transaction_type: 'sale',
              amount: sale.total,
              transaction_date: sale.timestamp.toISOString(),
              notes: `Credit sale - ${sale.items.length} items`,
              user_id: user?.id,
              sync_status: 'synced'
            });

          if (creditError) {
            errors.push(`Failed to create credit transaction: ${creditError.message}`);
            console.error('SalesSync: Error creating credit transaction:', creditError);
            continue;
          }

          console.log('SalesSync: Credit transaction created successfully');
        }

        // Mark as synced in localStorage
        const updatedSales = sales.map(s => 
          s.id === sale.id ? { ...s, synced: true } : s
        );
        localStorage.setItem(salesStorageKey, JSON.stringify(updatedSales));
        synced++;

        console.log(`SalesSync: Successfully synced sale ${sale.id}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync sale: ${errorMsg}`);
        console.error('SalesSync: Unexpected error syncing sale:', error);
      }
    }

    console.log(`SalesSync: Completed. Synced: ${synced}, Errors: ${errors.length}`);
    return { success: errors.length === 0, errors, synced };
  }
};
