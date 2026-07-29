import { useState } from "react";
import type { Product, Recipe } from "@/types/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  FlaskConical,
  Package,
  RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/hooks/useInventory";

interface ProductsGridProps {
  products: Product[];
  recipes: Recipe[];
  onToggleStock: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductsGrid({
  products,
  recipes,
  onToggleStock,
  onDelete
}: ProductsGridProps) {
  const { restockProduct } = useInventory();
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Restock form state
  const [restockQty, setRestockQty] = useState("");
  const [restockSupplier, setRestockSupplier] = useState("");
  const [restockNotes, setRestockNotes] = useState("");

  const handleRestockSubmit = () => {
    if (selectedProduct && restockQty) {
      restockProduct(selectedProduct.id, {
        quantityAdded: Number(restockQty),
        supplier: restockSupplier || undefined,
        notes: restockNotes || undefined,
      });
      setIsRestockOpen(false);
      setRestockQty("");
      setRestockSupplier("");
      setRestockNotes("");
      setSelectedProduct(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock / Recipe</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const variant = product.variants[0]; 
              const recipe = recipes.find(r => r.id === variant?.recipeId);
              
              return (
                <TableRow key={product.id} className={!product.inStock ? "bg-muted/20 text-muted-foreground" : ""}>
                  <TableCell>
                    <img 
                      src={product.image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image"} 
                      alt={product.name} 
                      className="h-10 w-10 rounded-md object-cover border bg-white"
                    />
                  </TableCell>
                  <TableCell className="font-bold">{product.name}</TableCell>
                  <TableCell>
                    {product.type === 'made-to-order' ? (
                      <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                        <FlaskConical className="h-3 w-3" /> Made-to-order
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                        <Package className="h-3 w-3" /> Ready-made
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-lg">
                    ₱{variant?.price || 0}
                  </TableCell>
                  <TableCell>
                    {product.type === 'ready-made' ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{product.quantity} in stock</span>
                        <span className="text-[10px] text-muted-foreground">Threshold: {product.lowStockThreshold}</span>
                      </div>
                    ) : (
                      recipe ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                          {recipe.name}
                        </Badge>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">No recipe linked</span>
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={product.inStock ? "outline" : "destructive"}
                      size="sm"
                      className={`h-8 gap-2 px-3 rounded-full text-[10px] font-bold uppercase transition-all ${
                        product.inStock 
                          ? "border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800" 
                          : ""
                      }`}
                      onClick={() => onToggleStock(product.id)}
                    >
                      {product.inStock ? (
                        <>
                          <Eye className="h-3 w-3" />
                          In Stock
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Out of Stock
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {product.type === 'ready-made' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsRestockOpen(true);
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restock
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            <Edit className="h-4 w-4 mr-2" /> Edit (Coming Soon)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No products added yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Restock Modal for Products */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Product</p>
              <p className="text-lg font-bold">{selectedProduct?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Current Stock: {selectedProduct?.quantity} pcs</p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Quantity to Add</label>
              <Input 
                type="number" 
                placeholder="0" 
                value={restockQty} 
                onChange={(e) => setRestockQty(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Supplier (Optional)</label>
              <Input 
                placeholder="e.g. Local Bakery" 
                value={restockSupplier} 
                onChange={(e) => setRestockSupplier(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input 
                placeholder="e.g. Weekly delivery" 
                value={restockNotes} 
                onChange={(e) => setRestockNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestockOpen(false)}>Cancel</Button>
            <Button onClick={handleRestockSubmit} disabled={!restockQty || Number(restockQty) <= 0}>
              Confirm Restock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
