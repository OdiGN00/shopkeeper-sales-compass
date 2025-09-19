import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/services/customerService";
import { Customer, CreditTransaction } from "@/types/customer";
import { useAuth } from "@/contexts/AuthContext";

export const useCustomerOperations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all customers for the current user
  const {
    data: customers = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['customers', user?.id],
    queryFn: () => customerService.getCustomers(user!.id),
    enabled: !!user?.id
  });

  // Get all credit transactions for the current user (from Supabase + local storage)
  const {
    data: supabaseCreditTransactions = [],
    isLoading: creditTransactionsLoading,
    error: creditTransactionsError,
    refetch: refetchCreditTransactions
  } = useQuery({
    queryKey: ['creditTransactions', user?.id],
    queryFn: () => customerService.getCreditTransactions(user!.id),
    enabled: !!user?.id
  });

  // Merge Supabase credit transactions with local ones
  const creditTransactions = [...supabaseCreditTransactions];
  
  // Add local credit transactions that haven't been synced yet
  if (typeof window !== 'undefined') {
    const localCreditTransactions = JSON.parse(localStorage.getItem('creditTransactions') || '[]');
    localCreditTransactions.forEach((localTransaction: any) => {
      // Only add if it's not already in the Supabase data
      const existsInSupabase = supabaseCreditTransactions.some(
        supabaseTransaction => 
          supabaseTransaction.customerId === localTransaction.customerId &&
          supabaseTransaction.amount === localTransaction.amount &&
          Math.abs(new Date(supabaseTransaction.date).getTime() - new Date(localTransaction.date).getTime()) < 5000
      );
      
      if (!existsInSupabase) {
        creditTransactions.push({
          id: localTransaction.id,
          customerId: localTransaction.customerId,
          type: localTransaction.type,
          amount: localTransaction.amount,
          notes: localTransaction.notes,
          date: new Date(localTransaction.date),
          synced: localTransaction.synced || false
        });
      }
    });
  }

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => 
      customerService.addCustomer(customerData, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: ({ customerId, updates }: { customerId: string; updates: Partial<Customer> }) =>
      customerService.updateCustomer(customerId, updates, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: string) => customerService.deleteCustomer(customerId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
    },
  });

  // Add credit transaction mutation
  const addCreditTransactionMutation = useMutation({
    mutationFn: (transaction: Omit<CreditTransaction, 'id' | 'synced'>) =>
      customerService.addCreditTransaction(transaction, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditTransactions', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['customers', user?.id] });
    },
  });

  // Helper functions
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => {
    return addCustomerMutation.mutateAsync(customerData);
  };

  const updateCustomer = (customerId: string, updates: Partial<Customer>) => {
    return updateCustomerMutation.mutateAsync({ customerId, updates });
  };

  const deleteCustomer = (customerId: string) => {
    return deleteCustomerMutation.mutateAsync(customerId);
  };

  const addCreditTransaction = (transaction: Omit<CreditTransaction, 'id' | 'synced'>) => {
    return addCreditTransactionMutation.mutateAsync(transaction);
  };

  // Calculate customer credit balances
  const getCustomerCreditBalance = (customerId: string): number => {
    return creditTransactions
      .filter(transaction => transaction.customerId === customerId)
      .reduce((balance, transaction) => {
        return transaction.type === 'sale' 
          ? balance + transaction.amount
          : balance - transaction.amount;
      }, 0);
  };

  const getCustomersWithCreditBalances = () => {
    return customers.map(customer => ({
      ...customer,
      creditBalance: getCustomerCreditBalance(customer.id)
    }));
  };

  return {
    // Data
    customers,
    creditTransactions,
    customersWithCreditBalances: getCustomersWithCreditBalances(),
    
    // Loading states (backward compatibility)
    isLoading,
    customersLoading: isLoading,
    creditTransactionsLoading,
    transactionsLoading: creditTransactionsLoading,
    
    // Errors (backward compatibility)
    error,
    customersError: error,
    creditTransactionsError,
    
    // Mutations
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCreditTransaction,
    
    // Mutation states
    isAddingCustomer: addCustomerMutation.isPending,
    isUpdatingCustomer: updateCustomerMutation.isPending,
    isDeletingCustomer: deleteCustomerMutation.isPending,
    isAddingCreditTransaction: addCreditTransactionMutation.isPending,
    
    // Refetch functions
    refetchCustomers: refetch,
    refetchCreditTransactions,
    
    // Helper functions (backward compatibility)
    getCustomerCreditBalance,
    getCustomerCredit: getCustomerCreditBalance,
    
    // Additional exports for backward compatibility
    addCustomerMutation,
    queryClient,
  };
};