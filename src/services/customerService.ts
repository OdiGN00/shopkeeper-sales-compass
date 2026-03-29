
import { supabase } from "@/integrations/supabase/client";
import { Customer, CreditTransaction } from "@/types/customer";
import { handleSupabaseError } from "@/utils/errorHandling";
import { logger } from "@/utils/logger";

export const customerService = {
  // Customer operations
  async getCustomers(userId: string): Promise<Customer[]> {
    logger.debug('CustomerService: Fetching customers');
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('CustomerService: Error fetching customers');
      const safeError = handleSupabaseError(error);
      throw new Error(safeError.message);
    }

    logger.debug('CustomerService: Fetched customers count:', data?.length);
    return data.map(customer => ({
      ...customer,
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at),
      synced: customer.sync_status === 'synced'
    }));
  },

  async addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'synced'>, userId: string): Promise<Customer> {
    logger.debug('CustomerService: Adding customer');
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customerData.name,
        phone: customerData.phone,
        location: customerData.location,
        notes: customerData.notes,
        user_id: userId,
        sync_status: 'synced'
      })
      .select()
      .single();

    if (error) {
      logger.error('CustomerService: Error adding customer');
      const safeError = handleSupabaseError(error);
      throw new Error(safeError.message);
    }

    logger.debug('CustomerService: Customer added successfully');
    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      synced: data.sync_status === 'synced'
    };
  },

  async updateCustomer(customerId: string, updates: Partial<Customer>, userId: string): Promise<Customer> {
    logger.debug('CustomerService: Updating customer');
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: updates.name,
        phone: updates.phone,
        location: updates.location,
        notes: updates.notes,
        sync_status: 'synced'
      })
      .eq('id', customerId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('CustomerService: Error updating customer');
      const safeError = handleSupabaseError(error);
      throw new Error(safeError.message);
    }

    logger.debug('CustomerService: Customer updated successfully');
    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      synced: data.sync_status === 'synced'
    };
  },

  async deleteCustomer(customerId: string, userId: string): Promise<void> {
    logger.debug('CustomerService: Deleting customer');
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('user_id', userId);

    if (error) {
      logger.error('CustomerService: Error deleting customer');
      const safeError = handleSupabaseError(error);
      throw new Error(safeError.message);
    }

    logger.debug('CustomerService: Customer deleted successfully');
  },

  // Credit transaction operations
  async getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    logger.debug('CustomerService: Fetching credit transactions');
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (error) {
      logger.error('CustomerService: Error fetching credit transactions');
      const safeError = handleSupabaseError(error);
      throw new Error(safeError.message);
    }

    logger.debug('CustomerService: Fetched credit transactions count:', data?.length);
    return data.map(transaction => ({
      id: transaction.id,
      customerId: transaction.customer_id,
      type: transaction.transaction_type as 'sale' | 'payment',
      amount: Number(transaction.amount),
      notes: transaction.notes,
      date: new Date(transaction.transaction_date),
      synced: transaction.sync_status === 'synced'
    }));
  },

  async addCreditTransaction(transaction: Omit<CreditTransaction, 'id' | 'synced'>, userId: string): Promise<CreditTransaction> {
    logger.debug('CustomerService: Adding credit transaction');
    const { data, error } = await supabase
      .from('credit_transactions')
      .insert({
        customer_id: transaction.customerId,
        transaction_type: transaction.type,
        amount: transaction.amount,
        notes: transaction.notes,
        transaction_date: transaction.date.toISOString(),
        user_id: userId,
        sync_status: 'synced'
      })
      .select()
      .single();

    if (error) {
      logger.error('CustomerService: Error adding credit transaction');
      const safeError = handleSupabaseError(error);
      throw new Error(safeError.message);
    }

    logger.debug('CustomerService: Credit transaction added successfully');
    return {
      id: data.id,
      customerId: data.customer_id,
      type: data.transaction_type as 'sale' | 'payment',
      amount: Number(data.amount),
      notes: data.notes,
      date: new Date(data.transaction_date),
      synced: data.sync_status === 'synced'
    };
  }
};
