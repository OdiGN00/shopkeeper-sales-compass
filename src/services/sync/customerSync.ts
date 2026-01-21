
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customer";
import { SyncResult } from "./types";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export const customerSync = {
  async syncCustomers(): Promise<SyncResult> {
    console.log('CustomerSync: Syncing customers...');
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, errors: ['User not authenticated'], synced: 0 };
    }

    const storageKey = getUserStorageKey('customers', user.id);
    const customers: Customer[] = JSON.parse(localStorage.getItem(storageKey) || '[]').map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt)
    }));

    const unsyncedCustomers = customers.filter(c => !c.synced);
    if (unsyncedCustomers.length === 0) {
      return { success: true, errors: [], synced: 0 };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const customer of unsyncedCustomers) {
      try {
        // Check if customer already exists for this user
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customer.phone)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingCustomer) {
          // Create new customer with user_id
          const { error } = await supabase
            .from('customers')
            .insert({
              name: customer.name,
              phone: customer.phone,
              location: customer.location || null,
              notes: customer.notes || null,
              sync_status: 'synced',
              user_id: user.id
            });

          if (error) {
            errors.push(`Failed to sync customer ${customer.name}: ${error.message}`);
            continue;
          }
        }

        // Mark as synced in localStorage
        const updatedCustomers = customers.map(c => 
          c.id === customer.id ? { ...c, synced: true } : c
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedCustomers));
        synced++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync customer ${customer.name}: ${errorMsg}`);
      }
    }

    return { success: errors.length === 0, errors, synced };
  },

  async pullCustomers(): Promise<{ customers: any[], errors: string[] }> {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) {
        return { customers: [], errors: [`Failed to pull customers: ${customersError.message}`] };
      }

      if (customersData) {
        const localCustomers = customersData.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          location: c.location || undefined,
          notes: c.notes || undefined,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
          synced: true
        }));
        return { customers: localCustomers, errors: [] };
      }

      return { customers: [], errors: [] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { customers: [], errors: [errorMsg] };
    }
  }
};
