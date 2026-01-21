
import { supabase } from "@/integrations/supabase/client";
import { CreditTransaction } from "@/types/customer";
import { SyncResult } from "./types";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export const creditTransactionSync = {
  async syncCreditTransactions(): Promise<SyncResult> {
    console.log('CreditTransactionSync: Syncing credit transactions...');
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, errors: ['User not authenticated'], synced: 0 };
    }

    const storageKey = getUserStorageKey('creditTransactions', user.id);
    const transactions: (CreditTransaction & { synced: boolean })[] = JSON.parse(localStorage.getItem(storageKey) || '[]').map((t: any) => ({
      ...t,
      date: new Date(t.date)
    }));

    const unsyncedTransactions = transactions.filter(t => !t.synced);
    if (unsyncedTransactions.length === 0) {
      return { success: true, errors: [], synced: 0 };
    }

    const errors: string[] = [];
    let synced = 0;

    for (const transaction of unsyncedTransactions) {
      try {
        const { error } = await supabase
          .from('credit_transactions')
          .insert({
            customer_id: transaction.customerId,
            transaction_type: transaction.type,
            amount: transaction.amount,
            notes: transaction.notes || null,
            transaction_date: transaction.date.toISOString(),
            sync_status: 'synced',
            user_id: user.id
          });

        if (error) {
          errors.push(`Failed to sync credit transaction: ${error.message}`);
          continue;
        }

        // Mark as synced in localStorage
        const updatedTransactions = transactions.map(t => 
          t.id === transaction.id ? { ...t, synced: true } : t
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedTransactions));
        synced++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync credit transaction: ${errorMsg}`);
      }
    }

    return { success: errors.length === 0, errors, synced };
  },

  async pullCreditTransactions(): Promise<{ transactions: any[], errors: string[] }> {
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('*');

      if (transactionsError) {
        return { transactions: [], errors: [`Failed to pull credit transactions: ${transactionsError.message}`] };
      }

      if (transactionsData) {
        const localTransactions = transactionsData.map(t => ({
          id: t.id,
          customerId: t.customer_id,
          type: t.transaction_type as 'sale' | 'payment',
          amount: Number(t.amount),
          notes: t.notes || undefined,
          date: new Date(t.transaction_date),
          synced: true
        }));
        return { transactions: localTransactions, errors: [] };
      }

      return { transactions: [], errors: [] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { transactions: [], errors: [errorMsg] };
    }
  }
};
