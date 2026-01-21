import { useState, useEffect } from "react";
import { Search, Plus, Minus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartItem } from "@/types/sales";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/utils";
import { useUserStorage } from "@/hooks/useUserStorage";

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  unitType?: string;
  category?: string;
}

interface ProductSelectionProps {
  cart: CartItem[];
  onAddToCart: (product: { id: string; name: string; price: number }) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  totalAmount: number;
  onProceedToPayment: () => void;
}

export const ProductSelection = ({
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  totalAmount,
  onProceedToPayment
}: ProductSelectionProps) => {
  const { currency } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const { getItem, userId } = useUserStorage();

  // Load products from user-specific localStorage on component mount
  useEffect(() => {
    const loadProducts = () => {
      try {
        if (userId) {
          const parsedProducts = getItem<Product[]>('products', []);
          setProducts(parsedProducts);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    loadProducts();

    // Listen for storage events to update products when they change
    const handleStorageChange = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId, getItem]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCartQuantity = (productId: string) => {
    const cartItem = cart.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAddToCart = (product: Product) => {
    onAddToCart({
      id: product.id,
      name: product.name,
      price: product.sellingPrice
    });
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    onUpdateQuantity(productId, newQuantity);
  };

  if (products.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Select Products</h1>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No products available</h3>
            <p className="text-muted-foreground mb-4">
              Add products to your inventory first before recording sales
            </p>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('switchToProducts'))}>
              Go to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Select Products</h1>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {formatCurrency(totalAmount, currency)}
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Scrollable Products Grid */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredProducts.map((product) => {
                const cartQuantity = getCartQuantity(product.id);
                return (
                  <Card key={product.id} className="relative">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-primary font-bold text-lg">{formatCurrency(product.sellingPrice, currency)}</span>
                            <span className="text-xs text-muted-foreground">
                              {product.quantity} {product.unitType || 'pcs'}
                            </span>
                          </div>
                          {product.category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {product.category}
                            </Badge>
                          )}
                        </div>

                        {cartQuantity > 0 ? (
                          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(product.id, cartQuantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-semibold text-sm px-2">{cartQuantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(product.id, cartQuantity + 1)}
                              disabled={cartQuantity >= product.quantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            className="w-full h-8 text-xs"
                            onClick={() => handleAddToCart(product)}
                            disabled={product.quantity === 0}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {/* Add bottom padding to ensure last items aren't hidden behind cart */}
            {cart.length > 0 && <div className="h-48" />}
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Cart Summary */}
      {cart.length > 0 && (
        <div className="flex-shrink-0 border-t bg-background">
          <Card className="bg-primary/5 border-primary/20 rounded-none border-x-0 border-b-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cart ({cart.length} items)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-32 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{item.name}</span>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.price, currency)} = {formatCurrency(item.quantity * item.price, currency)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFromCart(item.id)}
                    className="text-destructive hover:text-destructive ml-2 flex-shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-bold text-lg">Total: {formatCurrency(totalAmount, currency)}</span>
                <Button onClick={onProceedToPayment} size="lg" className="min-w-[120px]">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
