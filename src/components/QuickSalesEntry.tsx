import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SalesEntry } from "./SalesEntry";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
}

export const QuickSalesEntry = () => {
  const { currency } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadProducts = () => {
      const stored = localStorage.getItem('products');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Take first 5 products for quick add
        setProducts(parsed.slice(0, 5));
      }
    };

    loadProducts();
    window.addEventListener('storage', loadProducts);
    return () => window.removeEventListener('storage', loadProducts);
  }, []);

  return (
    <>
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Sale
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90" 
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Start New Sale
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[100vh] p-0">
              <SalesEntry />
            </SheetContent>
          </Sheet>
          
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Add Products</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {products.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-start hover:bg-muted/50"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="font-medium text-sm">{product.name}</span>
                  <div className="flex justify-between w-full mt-1">
                    <span className="text-primary font-semibold">{formatCurrency(product.sellingPrice, currency)}</span>
                    <span className="text-xs text-muted-foreground">Stock: {product.quantity}</span>
                  </div>
                </Button>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                  No products added yet. Add products in the Products tab.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
