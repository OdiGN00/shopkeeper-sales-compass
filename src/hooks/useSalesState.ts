
import { useState } from "react";
import { Sale, CartItem, SalesStep } from "@/types/sales";
import { Customer } from "@/types/customer";
import { salesService } from "@/services/salesService";
import { useToast } from "@/hooks/use-toast";
import { useUserStorage } from "@/hooks/useUserStorage";

export const useSalesState = () => {
  const [currentStep, setCurrentStep] = useState<SalesStep>('products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'mobile-money' | 'credit'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [completedSale, setCompletedSale] = useState<Sale | undefined>();
  const { toast } = useToast();
  const { getItem, setItem, userId } = useUserStorage();

  const addToCart = (product: { id: string; name: string; price: number }) => {
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

  const updateInventoryAfterSale = (cartItems: CartItem[]): { success: boolean; errors: string[] } => {
    try {
      if (!userId) {
        return { success: false, errors: ['User not authenticated'] };
      }

      const products = getItem<any[]>('products', []);
      if (products.length === 0) {
        return { success: false, errors: ['No products found in inventory'] };
      }

      const errors: string[] = [];
      const updatedProducts = [...products];

      cartItems.forEach(cartItem => {
        const productIndex = updatedProducts.findIndex(product => product.id === cartItem.id);
        
        if (productIndex === -1) {
          errors.push(`Product ${cartItem.name} not found in inventory`);
          return;
        }

        const product = updatedProducts[productIndex];
        
        if (product.quantity < cartItem.quantity) {
          errors.push(`Insufficient stock for ${cartItem.name}. Available: ${product.quantity}, Required: ${cartItem.quantity}`);
          return;
        }

        updatedProducts[productIndex] = {
          ...product,
          quantity: product.quantity - cartItem.quantity,
          updatedAt: new Date()
        };
      });

      if (errors.length > 0) {
        return { success: false, errors };
      }

      setItem('products', updatedProducts);
      return { success: true, errors: [] };

    } catch (error) {
      return { success: false, errors: ['Failed to update inventory: ' + (error as Error).message] };
    }
  };

  const handleConfirmSale = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to complete a sale",
        variant: "destructive"
      });
      return;
    }

    const inventoryResult = updateInventoryAfterSale(cart);
    
    if (!inventoryResult.success) {
      toast({
        title: "Inventory Error",
        description: inventoryResult.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    const sale: Sale = {
      items: cart,
      total: getTotalAmount(),
      paymentType,
      customer: selectedCustomer,
      timestamp: new Date()
    };
    
    const saleWithMeta = { 
      ...sale, 
      id: Date.now(), 
      synced: false
    };
    
    const existingSales = getItem<any[]>('sales', []);
    existingSales.push(saleWithMeta);
    setItem('sales', existingSales);
    
    if (paymentType === 'credit' && selectedCustomer) {
      const creditTransaction = {
        id: `credit_${Date.now()}`,
        customerId: selectedCustomer.id,
        type: 'sale' as const,
        amount: getTotalAmount(),
        notes: `Credit sale - ${cart.length} items`,
        date: new Date(),
        synced: false
      };
      
      const existingCreditTransactions = getItem<any[]>('creditTransactions', []);
      existingCreditTransactions.push(creditTransaction);
      setItem('creditTransactions', existingCreditTransactions);
    }
    
    const saveResult = await salesService.saveSale(sale);
    
    if (saveResult.success) {
      const updatedSales = existingSales.map((s: any) => 
        s.id === saleWithMeta.id ? { ...s, synced: true } : s
      );
      setItem('sales', updatedSales);
      
      if (paymentType === 'credit' && selectedCustomer) {
        const existingCreditTransactions = getItem<any[]>('creditTransactions', []);
        const updatedCreditTransactions = existingCreditTransactions.map((t: any) => 
          t.customerId === selectedCustomer.id && t.amount === getTotalAmount() && !t.synced
            ? { ...t, synced: true } 
            : t
        );
        setItem('creditTransactions', updatedCreditTransactions);
      }
    }
    
    const successMessage = paymentType === 'credit' 
      ? `Credit sale of $${getTotalAmount()} completed for ${selectedCustomer?.name}.`
      : `Sale of $${getTotalAmount()} completed successfully.`;
    
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
