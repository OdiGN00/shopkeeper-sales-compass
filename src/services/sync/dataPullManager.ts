
import { SyncResult } from "./types";
import { connectivityService } from "./connectivityService";
import { productSync } from "./productSync";
import { customerSync } from "./customerSync";
import { creditTransactionSync } from "./creditTransactionSync";
import { supabase } from "@/integrations/supabase/client";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export class DataPullManager {
  // Force sync from Supabase to localStorage (for data recovery)
  async pullFromSupabase(): Promise<SyncResult> {
    console.log('DataPullManager: Pulling data from Supabase...');
    const errors: string[] = [];
    let synced = 0;

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, errors: ['User not authenticated'], synced: 0 };
      }

      // Check connectivity first
      const isOnline = await connectivityService.checkConnectivity();
      if (!isOnline) {
        return { success: false, errors: ['No internet connection'], synced: 0 };
      }

      // Pull products
      synced += await this.pullProducts(errors, user.id);

      // Pull customers
      synced += await this.pullCustomers(errors, user.id);

      // Pull credit transactions
      synced += await this.pullCreditTransactions(errors, user.id);

      // Update metadata
      this.updatePullMetadata(errors, user.id);

      // Dispatch storage event to update UI
      window.dispatchEvent(new Event('storage'));

      return { success: errors.length === 0, errors, synced };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      return { success: false, errors, synced };
    }
  }

  private async pullProducts(errors: string[], userId: string): Promise<number> {
    try {
      const storageKey = getUserStorageKey('products', userId);
      const productsResult = await productSync.pullProducts();
      
      if (productsResult.errors.length > 0) {
        errors.push(...productsResult.errors);
        return 0;
      } else {
        // Get existing local products for merge safety
        const existingProducts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Only replace if server has data OR local is empty
        // This prevents accidental data loss when RLS returns empty results
        if (productsResult.products.length > 0 || existingProducts.length === 0) {
          localStorage.setItem(storageKey, JSON.stringify(productsResult.products));
          return productsResult.products.length;
        } else {
          console.warn('DataPullManager: Server returned empty products but local has data - keeping local data');
          return 0;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to pull products: ${errorMsg}`);
      return 0;
    }
  }

  private async pullCustomers(errors: string[], userId: string): Promise<number> {
    try {
      const storageKey = getUserStorageKey('customers', userId);
      const customersResult = await customerSync.pullCustomers();
      
      if (customersResult.errors.length > 0) {
        errors.push(...customersResult.errors);
        return 0;
      } else {
        // Get existing local customers for merge safety
        const existingCustomers = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (customersResult.customers.length > 0 || existingCustomers.length === 0) {
          localStorage.setItem(storageKey, JSON.stringify(customersResult.customers));
          return customersResult.customers.length;
        } else {
          console.warn('DataPullManager: Server returned empty customers but local has data - keeping local data');
          return 0;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to pull customers: ${errorMsg}`);
      return 0;
    }
  }

  private async pullCreditTransactions(errors: string[], userId: string): Promise<number> {
    try {
      const storageKey = getUserStorageKey('creditTransactions', userId);
      const transactionsResult = await creditTransactionSync.pullCreditTransactions();
      
      if (transactionsResult.errors.length > 0) {
        errors.push(...transactionsResult.errors);
        return 0;
      } else {
        // Get existing local transactions for merge safety
        const existingTransactions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (transactionsResult.transactions.length > 0 || existingTransactions.length === 0) {
          localStorage.setItem(storageKey, JSON.stringify(transactionsResult.transactions));
          return transactionsResult.transactions.length;
        } else {
          console.warn('DataPullManager: Server returned empty transactions but local has data - keeping local data');
          return 0;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to pull credit transactions: ${errorMsg}`);
      return 0;
    }
  }

  private updatePullMetadata(errors: string[], userId: string) {
    const syncMetaKey = getUserStorageKey('syncMeta', userId);
    const syncMeta = {
      lastSync: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined
    };
    localStorage.setItem(syncMetaKey, JSON.stringify(syncMeta));
  }
}
