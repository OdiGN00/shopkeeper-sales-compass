
import { CartItem } from "@/types/sales";
import { getUserStorageKey } from "@/hooks/useUserStorage";

export interface Product {
  id: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  costPrice?: number;
  unitType?: string;
  category?: string;
  sku?: string;
  expiryDate?: string;
  createdAt: Date;
  updatedAt: Date;
  synced?: boolean;
}

export const updateInventoryAfterSale = (cartItems: CartItem[], userId?: string): { success: boolean; errors: string[] } => {
  try {
    console.log('Starting inventory update for cart items:', cartItems);
    
    const storageKey = getUserStorageKey('products', userId);
    const storedProducts = localStorage.getItem(storageKey);
    if (!storedProducts) {
      return { success: false, errors: ['No products found in inventory'] };
    }

    const products: Product[] = JSON.parse(storedProducts).map((product: any) => ({
      ...product,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt)
    }));

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

      console.log(`Updated inventory for ${cartItem.name}: ${product.quantity} -> ${product.quantity - cartItem.quantity}`);
    });

    if (errors.length > 0) {
      return { success: false, errors };
    }

    localStorage.setItem(storageKey, JSON.stringify(updatedProducts));
    window.dispatchEvent(new Event('storage'));

    console.log('Inventory updated successfully after sale');
    return { success: true, errors: [] };

  } catch (error) {
    console.error('Error updating inventory:', error);
    return { success: false, errors: ['Failed to update inventory: ' + (error as Error).message] };
  }
};

export const checkStockAvailability = (cartItems: CartItem[], userId?: string): { available: boolean; errors: string[] } => {
  try {
    const storageKey = getUserStorageKey('products', userId);
    const storedProducts = localStorage.getItem(storageKey);
    if (!storedProducts) {
      return { available: false, errors: ['No products found in inventory'] };
    }

    const products: Product[] = JSON.parse(storedProducts);
    const errors: string[] = [];

    cartItems.forEach(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      
      if (!product) {
        errors.push(`Product ${cartItem.name} not found in inventory`);
        return;
      }

      if (product.quantity < cartItem.quantity) {
        errors.push(`Insufficient stock for ${cartItem.name}. Available: ${product.quantity}, Required: ${cartItem.quantity}`);
      }
    });

    return { available: errors.length === 0, errors };

  } catch (error) {
    console.error('Error checking stock availability:', error);
    return { available: false, errors: ['Failed to check stock availability'] };
  }
};
