
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/services/inventoryService";
import { SyncResult } from "./types";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export const productSync = {
  async syncProducts(): Promise<SyncResult> {
    console.log('ProductSync: Syncing products...');
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, errors: ['User not authenticated'], synced: 0 };
    }

    const storageKey = getUserStorageKey('products', user.id);
    const products: (Product & { synced?: boolean })[] = JSON.parse(localStorage.getItem(storageKey) || '[]').map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    }));

    const unsyncedProducts = products.filter(p => !p.synced);
    if (unsyncedProducts.length === 0) {
      return { success: true, errors: [], synced: 0 };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const product of unsyncedProducts) {
      try {
        // Check if product already exists for this user
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('name', product.name)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingProduct) {
          // Create new product with user_id
          const { error } = await supabase
            .from('products')
            .insert({
              name: product.name,
              selling_price: product.sellingPrice,
              cost_price: product.costPrice || null,
              quantity: product.quantity,
              unit_type: product.unitType || 'piece',
              category: product.category || null,
              sku: product.sku || null,
              expiry_date: product.expiryDate || null,
              sync_status: 'synced',
              user_id: user.id
            });

          if (error) {
            errors.push(`Failed to sync product ${product.name}: ${error.message}`);
            continue;
          }
        }

        // Mark as synced in localStorage
        const updatedProducts = products.map(p => 
          p.id === product.id ? { ...p, synced: true } : p
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedProducts));
        synced++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync product ${product.name}: ${errorMsg}`);
      }
    }

    return { success: errors.length === 0, errors, synced };
  },

  async pullProducts(): Promise<{ products: any[], errors: string[] }> {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) {
        return { products: [], errors: [`Failed to pull products: ${productsError.message}`] };
      }

      if (productsData) {
        const localProducts = productsData.map(p => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity || 0,
          sellingPrice: Number(p.selling_price),
          costPrice: p.cost_price ? Number(p.cost_price) : undefined,
          unitType: p.unit_type || 'piece',
          category: p.category || undefined,
          sku: p.sku || undefined,
          expiryDate: p.expiry_date || undefined,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
          synced: true
        }));
        return { products: localProducts, errors: [] };
      }

      return { products: [], errors: [] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { products: [], errors: [errorMsg] };
    }
  }
};
