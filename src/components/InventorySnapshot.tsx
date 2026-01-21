
import { useState, useEffect } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
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
}

export const InventorySnapshot = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load products from localStorage
  const loadProducts = () => {
    try {
      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        const parsedProducts = JSON.parse(storedProducts).map((product: any) => ({
          ...product,
          createdAt: new Date(product.createdAt),
          updatedAt: new Date(product.updatedAt)
        }));
        setProducts(parsedProducts);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();

    // Listen for storage changes to update when products are modified
    const handleStorageChange = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event listener for when products are updated within the same tab
    const handleProductsUpdate = () => {
      loadProducts();
    };
    
    window.addEventListener('productsUpdated', handleProductsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('productsUpdated', handleProductsUpdate);
    };
  }, []);

  // Calculate metrics
  const totalProducts = products.length;
  const lowStockItems = products.filter(product => product.quantity <= 10);
  const lowStockCount = lowStockItems.length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Inventory
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
            <div className="text-sm text-muted-foreground">Total Products</div>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
            <div className="text-sm text-muted-foreground">Low Stock</div>
          </div>
        </div>

        {lowStockCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Needs Restocking</span>
            </div>
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex justify-between items-center p-2 bg-destructive/5 rounded border-l-2 border-destructive">
                <span className="text-sm font-medium">{item.name}</span>
                <Badge variant="destructive" className="text-xs">
                  {item.quantity} {item.unitType || 'pcs'} left
                </Badge>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <div className="text-xs text-muted-foreground text-center">
                +{lowStockItems.length - 5} more items need restocking
              </div>
            )}
          </div>
        )}

        {totalProducts === 0 && (
          <div className="text-center py-4">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No products in inventory</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
