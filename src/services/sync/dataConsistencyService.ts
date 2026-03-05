
import { supabase } from "@/integrations/supabase/client";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export interface ConsistencyCheckResult {
  issues: string[];
  fixes: string[];
  success: boolean;
}

export const dataConsistencyService = {
  async checkAndFixConsistency(): Promise<ConsistencyCheckResult> {
    console.log('DataConsistency: Starting comprehensive consistency check...');
    const issues: string[] = [];
    const fixes: string[] = [];

    try {
      // 1. Check for products with negative quantities
      const { data: negativeQuantityProducts, error: negQtyError } = await supabase
        .from('products')
        .select('id, name, quantity')
        .lt('quantity', 0);

      if (negQtyError) {
        issues.push(`Failed to check negative quantities: ${negQtyError.message}`);
      } else if (negativeQuantityProducts && negativeQuantityProducts.length > 0) {
        issues.push(`Found ${negativeQuantityProducts.length} products with negative quantities`);
        for (const product of negativeQuantityProducts) {
          const { error: fixError } = await supabase
            .from('products')
            .update({ quantity: 0 })
            .eq('id', product.id);
          if (fixError) {
            issues.push(`Failed to fix negative quantity for ${product.name}: ${fixError.message}`);
          } else {
            fixes.push(`Fixed negative quantity for ${product.name}: ${product.quantity} → 0`);
          }
        }
      }

      // 2. Check for orphaned sale items
      const { data: orphanedSaleItems, error: orphanError } = await supabase
        .from('sale_items')
        .select(`id, sale_id, sales!inner(id)`)
        .is('sales.id', null);

      if (orphanError) {
        issues.push(`Failed to check orphaned sale items: ${orphanError.message}`);
      } else if (orphanedSaleItems && orphanedSaleItems.length > 0) {
        issues.push(`Found ${orphanedSaleItems.length} orphaned sale items`);
        const { error: cleanupError } = await supabase
          .from('sale_items')
          .delete()
          .in('id', orphanedSaleItems.map(item => item.id));
        if (cleanupError) {
          issues.push(`Failed to cleanup orphaned sale items: ${cleanupError.message}`);
        } else {
          fixes.push(`Cleaned up ${orphanedSaleItems.length} orphaned sale items`);
        }
      }

      // 3. Check for sale items referencing non-existent products
      const { data: invalidProductRefs, error: invalidProdError } = await supabase
        .from('sale_items')
        .select(`id, product_id, products!inner(id, name)`)
        .is('products.id', null);

      if (invalidProdError) {
        issues.push(`Failed to check invalid product references: ${invalidProdError.message}`);
      } else if (invalidProductRefs && invalidProductRefs.length > 0) {
        issues.push(`Found ${invalidProductRefs.length} sale items with invalid product references`);
        fixes.push(`Identified ${invalidProductRefs.length} sale items with invalid product references (manual intervention required)`);
      }

      // 4. Check for credit transactions without corresponding customers
      const { data: invalidCreditTxns, error: invalidCreditError } = await supabase
        .from('credit_transactions')
        .select(`id, customer_id, customers!inner(id, name)`)
        .is('customers.id', null);

      if (invalidCreditError) {
        issues.push(`Failed to check invalid credit transactions: ${invalidCreditError.message}`);
      } else if (invalidCreditTxns && invalidCreditTxns.length > 0) {
        issues.push(`Found ${invalidCreditTxns.length} credit transactions with invalid customer references`);
        const { error: cleanupCreditError } = await supabase
          .from('credit_transactions')
          .delete()
          .in('id', invalidCreditTxns.map(txn => txn.id));
        if (cleanupCreditError) {
          issues.push(`Failed to cleanup invalid credit transactions: ${cleanupCreditError.message}`);
        } else {
          fixes.push(`Cleaned up ${invalidCreditTxns.length} invalid credit transactions`);
        }
      }

      // 5. Check for duplicate products
      const { data: duplicateProducts, error: dupError } = await supabase
        .from('products')
        .select('name')
        .then(result => {
          if (result.error) return result;
          const nameCounts = result.data?.reduce((acc: Record<string, number>, product) => {
            acc[product.name] = (acc[product.name] || 0) + 1;
            return acc;
          }, {});
          const duplicates = Object.entries(nameCounts || {})
            .filter(([_, count]) => count > 1)
            .map(([name]) => name);
          return { data: duplicates, error: null };
        });

      if (dupError) {
        issues.push(`Failed to check duplicate products: ${dupError.message}`);
      } else if (duplicateProducts && duplicateProducts.length > 0) {
        issues.push(`Found ${duplicateProducts.length} products with duplicate names`);
        fixes.push(`Identified duplicate products: ${duplicateProducts.join(', ')} (manual consolidation recommended)`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`Consistency check failed: ${errorMsg}`);
    }

    const success = issues.length === 0 || fixes.length > 0;
    console.log(`DataConsistency: Check completed. Issues: ${issues.length}, Fixes: ${fixes.length}`);
    return { issues, fixes, success };
  },

  async validateLocalStorageData(userId?: string): Promise<{ valid: boolean; errors: string[]; fixes: string[] }> {
    console.log('DataConsistency: Validating localStorage data...');
    const errors: string[] = [];
    const fixes: string[] = [];

    try {
      // Validate products
      const productsKey = getUserStorageKey('products', userId);
      const productsData = localStorage.getItem(productsKey);
      if (productsData) {
        const products = JSON.parse(productsData);
        let fixedProducts = false;

        const validatedProducts = products.map((product: any) => {
          const fixed = { ...product };
          if (fixed.quantity < 0) {
            errors.push(`Product ${fixed.name} has negative quantity: ${fixed.quantity}`);
            fixed.quantity = 0;
            fixes.push(`Fixed negative quantity for ${fixed.name}`);
            fixedProducts = true;
          }
          if (!fixed.sellingPrice || fixed.sellingPrice <= 0) {
            errors.push(`Product ${fixed.name} has invalid selling price: ${fixed.sellingPrice}`);
            fixed.sellingPrice = fixed.sellingPrice || 1;
            fixes.push(`Fixed selling price for ${fixed.name}`);
            fixedProducts = true;
          }
          return fixed;
        });

        if (fixedProducts) {
          localStorage.setItem(productsKey, JSON.stringify(validatedProducts));
          window.dispatchEvent(new Event('storage'));
        }
      }

      // Validate sales
      const salesKey = getUserStorageKey('sales', userId);
      const salesData = localStorage.getItem(salesKey);
      if (salesData) {
        const sales = JSON.parse(salesData);
        let fixedSales = false;

        const validatedSales = sales.map((sale: any) => {
          const fixed = { ...sale };
          if (!fixed.timestamp || isNaN(new Date(fixed.timestamp).getTime())) {
            errors.push(`Sale ${fixed.id} has invalid timestamp: ${fixed.timestamp}`);
            fixed.timestamp = new Date().toISOString();
            fixes.push(`Fixed timestamp for sale ${fixed.id}`);
            fixedSales = true;
          }
          const calculatedTotal = fixed.items?.reduce((sum: number, item: any) => 
            sum + (item.price * item.quantity), 0) || 0;
          if (Math.abs(fixed.total - calculatedTotal) > 0.01) {
            errors.push(`Sale ${fixed.id} total mismatch: ${fixed.total} vs calculated ${calculatedTotal}`);
            fixed.total = calculatedTotal;
            fixes.push(`Fixed total for sale ${fixed.id}`);
            fixedSales = true;
          }
          return fixed;
        });

        if (fixedSales) {
          localStorage.setItem(salesKey, JSON.stringify(validatedSales));
          window.dispatchEvent(new Event('storage'));
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`localStorage validation failed: ${errorMsg}`);
    }

    return { valid: errors.length === 0, errors, fixes };
  }
};
