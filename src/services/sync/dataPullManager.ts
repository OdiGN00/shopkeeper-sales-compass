
import { SyncResult } from "./types";
import { connectivityService } from "./connectivityService";
import { productSync } from "./productSync";
import { customerSync } from "./customerSync";
import { creditTransactionSync } from "./creditTransactionSync";

export class DataPullManager {
  // Force sync from Supabase to localStorage (for data recovery)
  async pullFromSupabase(): Promise<SyncResult> {
    console.log('DataPullManager: Pulling data from Supabase...');
    const errors: string[] = [];
    let synced = 0;

    try {
      // Check connectivity first
      const isOnline = await connectivityService.checkConnectivity();
      if (!isOnline) {
        return { success: false, errors: ['No internet connection'], synced: 0 };
      }

      // Pull products
      synced += await this.pullProducts(errors);

      // Pull customers
      synced += await this.pullCustomers(errors);

      // Pull credit transactions
      synced += await this.pullCreditTransactions(errors);

      // Update metadata
      this.updatePullMetadata(errors);

      // Dispatch storage event to update UI
      window.dispatchEvent(new Event('storage'));

      return { success: errors.length === 0, errors, synced };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      localStorage.setItem('syncErrors', JSON.stringify(errors));
      return { success: false, errors, synced };
    }
  }

  private async pullProducts(errors: string[]): Promise<number> {
    try {
      const productsResult = await productSync.pullProducts();
      if (productsResult.errors.length > 0) {
        errors.push(...productsResult.errors);
        return 0;
      } else {
        // Get existing local products for merge safety
        const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
        
        // Only replace if server has data OR local is empty
        // This prevents accidental data loss when RLS returns empty results
        if (productsResult.products.length > 0 || existingProducts.length === 0) {
          localStorage.setItem('products', JSON.stringify(productsResult.products));
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

  private async pullCustomers(errors: string[]): Promise<number> {
    try {
      const customersResult = await customerSync.pullCustomers();
      if (customersResult.errors.length > 0) {
        errors.push(...customersResult.errors);
        return 0;
      } else {
        localStorage.setItem('customers', JSON.stringify(customersResult.customers));
        return customersResult.customers.length;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to pull customers: ${errorMsg}`);
      return 0;
    }
  }

  private async pullCreditTransactions(errors: string[]): Promise<number> {
    try {
      const transactionsResult = await creditTransactionSync.pullCreditTransactions();
      if (transactionsResult.errors.length > 0) {
        errors.push(...transactionsResult.errors);
        return 0;
      } else {
        localStorage.setItem('creditTransactions', JSON.stringify(transactionsResult.transactions));
        return transactionsResult.transactions.length;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to pull credit transactions: ${errorMsg}`);
      return 0;
    }
  }

  private updatePullMetadata(errors: string[]) {
    localStorage.setItem('lastSync', new Date().toISOString());
    
    // Clear sync errors if pull was successful
    if (errors.length === 0) {
      localStorage.removeItem('syncErrors');
    } else {
      localStorage.setItem('syncErrors', JSON.stringify(errors));
    }
  }
}
