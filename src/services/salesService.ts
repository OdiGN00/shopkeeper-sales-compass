
import { supabase } from "@/integrations/supabase/client";
import { Sale, CartItem } from "@/types/sales";
import { Customer } from "@/types/customer";
import { Product } from "./inventoryService";
import { productEnsureSync } from "./sync/productEnsureSync";
import { getUserStorageKey } from "@/hooks/useUserStorage";
import { logger } from "@/utils/logger";

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const salesService = {
  async saveSale(sale: Sale): Promise<{ saleId: string; success: boolean; error?: string }> {
    try {
      logger.debug('SalesService: Saving sale');
      
      const paymentTypeMap = {
        'mobile-money': 'mobile_money' as const,
        'cash': 'cash' as const,
        'credit': 'credit' as const
      };
      
      // Get current user for user-specific storage
      const { data: { user } } = await supabase.auth.getUser();
      
      const storageKey = getUserStorageKey('products', user?.id);
      const storedProducts = localStorage.getItem(storageKey);
      if (!storedProducts) {
        return { saleId: '', success: false, error: 'No products found in local inventory' };
      }

      const localProducts: Product[] = JSON.parse(storedProducts).map((product: any) => ({
        ...product,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt)
      }));

      const saleProductIds = sale.items.map(item => item.id);
      const relevantProducts = localProducts.filter(product => saleProductIds.includes(product.id));
      
      if (relevantProducts.length === 0) {
        return { saleId: '', success: false, error: 'No matching products found in inventory' };
      }

      logger.debug('SalesService: Ensuring products exist');
      const productEnsureResult = await productEnsureSync.ensureProductsExist(relevantProducts);
      
      if (!productEnsureResult.success) {
        return { saleId: '', success: false, error: `Product sync failed: ${productEnsureResult.errors.join(', ')}` };
      }

      const mappedSaleItems = sale.items.map(item => {
        const supabaseProductId = productEnsureResult.productMap.get(item.id);
        if (!supabaseProductId) {
          throw new Error(`Product mapping not found for item: ${item.name}`);
        }
        return {
          product_id: supabaseProductId,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.quantity * item.price
        };
      });

      const inventoryValidation = await productEnsureSync.validateInventoryConstraints(
        mappedSaleItems, 
        productEnsureResult.productMap
      );

      if (!inventoryValidation.valid) {
        return { saleId: '', success: false, error: `Inventory validation failed: ${inventoryValidation.errors.join(', ')}` };
      }

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          total_amount: sale.total,
          payment_type: paymentTypeMap[sale.paymentType],
          customer_id: sale.customer?.id || null,
          sale_date: sale.timestamp.toISOString(),
          user_id: user?.id,
          sync_status: 'synced' as const
        })
        .select()
        .single();

      if (saleError) {
        return { saleId: '', success: false, error: saleError.message };
      }

      const saleItemsWithSaleId = mappedSaleItems.map(item => ({
        ...item,
        sale_id: saleData.id,
        sync_status: 'synced' as const
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsWithSaleId);

      if (itemsError) {
        return { saleId: saleData.id, success: false, error: itemsError.message };
      }

      if (sale.paymentType === 'credit' && sale.customer) {
        const { error: creditError } = await supabase
          .from('credit_transactions')
          .insert({
            customer_id: sale.customer.id,
            sale_id: saleData.id,
            transaction_type: 'sale' as const,
            amount: sale.total,
            transaction_date: sale.timestamp.toISOString(),
            notes: `Credit sale - ${sale.items.length} items`,
            user_id: user?.id,
            sync_status: 'synced' as const
          });

        if (creditError) {
          return { saleId: saleData.id, success: false, error: creditError.message };
        }
      }

      return { saleId: saleData.id, success: true };
    } catch (error) {
      logger.error('SalesService: Unexpected error');
      return { saleId: '', success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' };
    }
  }
};
