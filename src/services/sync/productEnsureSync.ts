
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/services/inventoryService";

export const productEnsureSync = {
  async ensureProductsExist(products: Product[]): Promise<{ success: boolean; errors: string[]; productMap: Map<string, string> }> {
    console.log('ProductEnsureSync: Ensuring products exist before sales sync...');
    const errors: string[] = [];
    const productMap = new Map<string, string>();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, errors: ['Not authenticated'], productMap };
    }

    for (const product of products) {
      try {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, name, quantity, selling_price')
          .eq('name', product.name)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingProduct) {
          productMap.set(product.id, existingProduct.id);
        } else {
          const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
              name: product.name,
              selling_price: product.sellingPrice,
              cost_price: product.costPrice || null,
              quantity: Math.max(0, product.quantity),
              unit_type: product.unitType || 'piece',
              category: product.category || null,
              sku: product.sku || null,
              expiry_date: product.expiryDate || null,
              sync_status: 'synced',
              user_id: user.id
            })
            .select('id')
            .single();

          if (error) {
            errors.push(`Failed to create product ${product.name}: ${error.message}`);
            continue;
          }

          if (newProduct) {
            productMap.set(product.id, newProduct.id);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to ensure product ${product.name}: ${errorMsg}`);
      }
    }

    return { success: errors.length === 0, errors, productMap };
  },

  async validateInventoryConstraints(saleItems: any[], productMap: Map<string, string>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const item of saleItems) {
      try {
        const supabaseProductId = productMap.get(item.product_id);
        if (!supabaseProductId) {
          errors.push(`Product mapping not found for item: ${item.product_id}`);
          continue;
        }

        const { data: productData, error } = await supabase
          .from('products')
          .select('quantity, name')
          .eq('id', supabaseProductId)
          .single();

        if (error) {
          errors.push(`Failed to check inventory for product ${supabaseProductId}: ${error.message}`);
          continue;
        }

        if (productData.quantity < item.quantity) {
          errors.push(`Insufficient inventory for ${productData.name}. Available: ${productData.quantity}, Required: ${item.quantity}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Inventory validation error: ${errorMsg}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
};
