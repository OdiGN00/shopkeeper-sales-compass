import { supabase } from "@/integrations/supabase/client";
import { Product } from "../inventoryService";
import { Customer } from "@/types/customer";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export class DuplicatePreventionService {
  private static instance: DuplicatePreventionService;
  
  static getInstance(): DuplicatePreventionService {
    if (!DuplicatePreventionService.instance) {
      DuplicatePreventionService.instance = new DuplicatePreventionService();
    }
    return DuplicatePreventionService.instance;
  }

  async checkProductDuplicates(product: Product): Promise<{ isDuplicate: boolean; existingId?: string; conflicts: string[] }> {
    const conflicts: string[] = [];
    try {
      if (product.sku) {
        const { data: skuMatch, error: skuError } = await supabase
          .from('products')
          .select('id, name')
          .eq('sku', product.sku)
          .neq('id', product.id);
        if (skuError) {
          console.error('DuplicatePreventionService: SKU check error:', skuError);
        } else if (skuMatch && skuMatch.length > 0) {
          conflicts.push(`SKU '${product.sku}' already exists for product: ${skuMatch[0].name}`);
          return { isDuplicate: true, existingId: skuMatch[0].id, conflicts };
        }
      }
      const { data: nameMatch, error: nameError } = await supabase
        .from('products')
        .select('id, name, category, sku')
        .eq('name', product.name)
        .eq('category', product.category || '')
        .neq('id', product.id);
      if (nameError) {
        console.error('DuplicatePreventionService: Name check error:', nameError);
      } else if (nameMatch && nameMatch.length > 0) {
        conflicts.push(`Product '${product.name}' in category '${product.category}' already exists`);
        return { isDuplicate: true, existingId: nameMatch[0].id, conflicts };
      }
      return { isDuplicate: false, conflicts: [] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      conflicts.push(`Duplicate check failed: ${errorMsg}`);
      return { isDuplicate: false, conflicts };
    }
  }

  async checkCustomerDuplicates(customer: Customer): Promise<{ isDuplicate: boolean; existingId?: string; conflicts: string[] }> {
    const conflicts: string[] = [];
    try {
      const { data: phoneMatch, error: phoneError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('phone', customer.phone)
        .neq('id', customer.id);
      if (phoneError) {
        console.error('DuplicatePreventionService: Phone check error:', phoneError);
      } else if (phoneMatch && phoneMatch.length > 0) {
        conflicts.push(`Phone number '${customer.phone}' already exists for customer: ${phoneMatch[0].name}`);
        return { isDuplicate: true, existingId: phoneMatch[0].id, conflicts };
      }
      if (customer.name && customer.name.length > 3) {
        const { data: nameMatch, error: nameError } = await supabase
          .from('customers')
          .select('id, name, phone')
          .ilike('name', `%${customer.name}%`)
          .neq('id', customer.id)
          .limit(5);
        if (nameError) {
          console.error('DuplicatePreventionService: Name similarity check error:', nameError);
        } else if (nameMatch && nameMatch.length > 0) {
          for (const match of nameMatch) {
            if (this.arePhonesRelated(customer.phone, match.phone)) {
              conflicts.push(`Similar customer found: ${match.name} (${match.phone})`);
            }
          }
        }
      }
      return { isDuplicate: false, conflicts };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      conflicts.push(`Duplicate check failed: ${errorMsg}`);
      return { isDuplicate: false, conflicts };
    }
  }

  private arePhonesRelated(phone1: string, phone2: string): boolean {
    const clean1 = phone1.replace(/\D/g, '');
    const clean2 = phone2.replace(/\D/g, '');
    if (clean1.length >= 4 && clean2.length >= 4) {
      return clean1.slice(-4) === clean2.slice(-4);
    }
    return false;
  }

  async deduplicateLocalStorage(userId?: string): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixed = 0;

    try {
      const productsKey = getUserStorageKey('products', userId);
      const products = JSON.parse(localStorage.getItem(productsKey) || '[]');
      const uniqueProducts = new Map<string, any>();
      
      for (const product of products) {
        const key = `${product.name}-${product.category || 'default'}`;
        if (!uniqueProducts.has(key)) {
          uniqueProducts.set(key, product);
        } else {
          fixed++;
        }
      }
      
      if (fixed > 0) {
        localStorage.setItem(productsKey, JSON.stringify(Array.from(uniqueProducts.values())));
      }

      const customersKey = getUserStorageKey('customers', userId);
      const customers = JSON.parse(localStorage.getItem(customersKey) || '[]');
      const uniqueCustomers = new Map<string, any>();
      
      for (const customer of customers) {
        if (!uniqueCustomers.has(customer.phone)) {
          uniqueCustomers.set(customer.phone, customer);
        } else {
          fixed++;
        }
      }
      
      if (uniqueCustomers.size < customers.length) {
        localStorage.setItem(customersKey, JSON.stringify(Array.from(uniqueCustomers.values())));
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Local storage deduplication failed: ${errorMsg}`);
    }

    return { fixed, errors };
  }
}

export const duplicatePreventionService = DuplicatePreventionService.getInstance();
