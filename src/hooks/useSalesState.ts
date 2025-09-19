
import { useState } from "react";
import { Sale, CartItem, SalesStep } from "@/types/sales";
import { Customer } from "@/types/customer";
import { updateInventoryAfterSale } from "@/services/inventoryService";
import { salesService } from "@/services/salesService";
import { useToast } from "@/hooks/use-toast";

export const useSalesState = () => {
  const [currentStep, setCurrentStep] = useState<SalesStep>('products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'mobile-money' | 'credit'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [completedSale, setCompletedSale] = useState<Sale | undefined>();
  const { toast } = useToast();

  const addToCart = (product: { id: string; name: string; price: number }) => {
    console.log('Adding product to cart:', product);
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePaymentSelection = (payment: 'cash' | 'mobile-money' | 'credit') => {
    setPaymentType(payment);
    if (payment === 'credit') {
      setCurrentStep('customer');
    } else {
      setCurrentStep('confirm');
    }
  };

  const handleCustomerSelection = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCurrentStep('confirm');
  };

  const handleConfirmSale = async () => {
    console.log('Confirming sale, updating inventory...');
    console.log('Cart items for inventory update:', cart);
    
    // Update inventory before saving the sale
    const inventoryResult = updateInventoryAfterSale(cart);
    
    if (!inventoryResult.success) {
      // Show error toast and don't proceed with sale
      toast({
        title: "Inventory Error",
        description: inventoryResult.errors.join(', '),
        variant: "destructive"
      });
      console.error('Inventory update failed:', inventoryResult.errors);
      return;
    }

    // If inventory update successful, proceed with sale
    const sale: Sale = {
      items: cart,
      total: getTotalAmount(),
      paymentType,
      customer: selectedCustomer,
      timestamp: new Date()
    };
    
    // Save sale to localStorage first with synced: false
    const saleWithMeta = { 
      ...sale, 
      id: Date.now(), 
      synced: false  // Mark as unsynced initially
    };
    
    const existingSales = JSON.parse(localStorage.getItem('sales') || '[]');
    existingSales.push(saleWithMeta);
    localStorage.setItem('sales', JSON.stringify(existingSales));
    
    // If it's a credit sale, also save the credit transaction locally
    if (paymentType === 'credit' && selectedCustomer) {
      console.log('Saving credit transaction locally for customer:', selectedCustomer.id);
      
      const creditTransaction = {
        id: `credit_${Date.now()}`, // Unique local ID
        customerId: selectedCustomer.id,
        type: 'sale' as const,
        amount: getTotalAmount(),
        notes: `Credit sale - ${cart.length} items`,
        date: new Date(),
        synced: false // Mark as unsynced initially
      };
      
      const existingCreditTransactions = JSON.parse(localStorage.getItem('creditTransactions') || '[]');
      existingCreditTransactions.push(creditTransaction);
      localStorage.setItem('creditTransactions', JSON.stringify(existingCreditTransactions));
      
      console.log('Credit transaction saved locally:', creditTransaction);
    }
    
    // Try to save to Supabase in background
    console.log('Attempting to save sale to database...');
    const saveResult = await salesService.saveSale(sale);
    
    if (saveResult.success) {
      // Mark as synced in localStorage
      const updatedSales = existingSales.map((s: any) => 
        s.id === saleWithMeta.id ? { ...s, synced: true } : s
      );
      localStorage.setItem('sales', JSON.stringify(updatedSales));
      
      // If it was a credit sale, mark the credit transaction as synced too
      if (paymentType === 'credit' && selectedCustomer) {
        const existingCreditTransactions = JSON.parse(localStorage.getItem('creditTransactions') || '[]');
        const updatedCreditTransactions = existingCreditTransactions.map((t: any) => 
          t.customerId === selectedCustomer.id && t.amount === getTotalAmount() && !t.synced
            ? { ...t, synced: true } 
            : t
        );
        localStorage.setItem('creditTransactions', JSON.stringify(updatedCreditTransactions));
      }
      
      console.log('Sale saved to database and marked as synced');
    } else {
      console.log('Sale saved locally but failed to sync to database:', saveResult.error);
      // Sale is already saved locally with synce: false, so it will be retried later
    }
    
    // Dispatch custom event to notify other components of new sale
    window.dispatchEvent(new Event('storage'));
    
    console.log('Sale completed successfully. Inventory updated and sale saved locally.');
    
    // Show success toast
    const successMessage = paymentType === 'credit' 
      ? `Credit sale of $${getTotalAmount()} completed for ${selectedCustomer?.name}. Customer credit updated.`
      : `Sale of $${getTotalAmount()} completed successfully. Inventory updated.`;
    
    toast({
      title: "Sale Completed",
      description: successMessage + (saveResult.success ? "" : " (Will sync when online)"),
    });
    
    setCompletedSale(sale);
    setCurrentStep('summary');
  };

  const handleNewSale = () => {
    setCart([]);
    setPaymentType('cash');
    setSelectedCustomer(undefined);
    setCompletedSale(undefined);
    setCurrentStep('products');
  };

  return {
    currentStep,
    setCurrentStep,
    cart,
    paymentType,
    selectedCustomer,
    completedSale,
    addToCart,
    updateQuantity,
    removeFromCart,
    getTotalAmount,
    handlePaymentSelection,
    handleCustomerSelection,
    handleConfirmSale,
    handleNewSale
  };
};
