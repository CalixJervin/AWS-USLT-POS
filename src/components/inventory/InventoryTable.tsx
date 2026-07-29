import { useState } from "react";
import type { Ingredient, IngredientUnit } from "@/types/inventory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Pencil, 
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useInventory } from "@/hooks/useInventory";

export type InventoryItem = {
  id: string;
  name: string;
  type: 'made-to-order' | 'ready-made';
  currentStock: number;
  unit: string;
  lowStockThreshold: number;
  status: 'good' | 'low' | 'critical' | 'out';
  lastRestocked?: string;
  originalType: 'ingredient' | 'product';
};

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateIngredient: (id: string, data: Partial<Ingredient>) => void;
  onDeleteIngredient: (id: string) => void;
  onDeleteProduct: (id: string) => void;
}

export function InventoryTable({
  items,
  onUpdateIngredient,
  onDeleteIngredient,
  onDeleteProduct,
}: InventoryTableProps) {
  const { updateProduct } = useInventory();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const getStockLevelInfo = (current: number, threshold: number) => {
    const percentage = Math.min(100, Math.max(0, (current / (threshold * 2)) * 100));
    
    let colorClass = "bg-[#22c55e]"; // OK (Green)
    let statusLabel = "OK";
    let textColorClass = "text-[#22c55e]";

    if (current === 0) {
      colorClass = "bg-[#C0392B]"; // Out (Red)
      statusLabel = "Out";
      textColorClass = "text-[#C0392B]";
    } else if (current <= threshold * 0.25) {
      colorClass = "bg-[#C0392B]"; // Critical (Red)
      statusLabel = "Critical";
      textColorClass = "text-[#C0392B]";
    } else if (current <= threshold) {
      colorClass = "bg-[#f59e0b]"; // Low (Yellow/Orange)
      statusLabel = "Low";
      textColorClass = "text-[#f59e0b]";
    }

    return { percentage, colorClass, statusLabel, textColorClass };
  };

  return (
    <div className="bg-[#F5EFE6] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden border border-[#DDD5C8]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#E8DFD3]">
            <TableRow className="hover:bg-transparent border-b border-[#D4C9BB]">
              <TableHead className="w-12 text-[10px] font-bold uppercase text-[#9E8E7E] text-center">#</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#9E8E7E]">Name</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#9E8E7E] text-center">Stock</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#9E8E7E] text-center">Unit</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#9E8E7E] w-48">Level</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#9E8E7E] text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const { percentage, colorClass, statusLabel, textColorClass } = getStockLevelInfo(item.currentStock, item.lowStockThreshold);
              
              return (
                <TableRow key={item.id} className="hover:bg-[#E2D9CC]/30 transition-colors border-b border-[#DDD5C8]/50 last:border-0">
                  <TableCell className="text-center font-medium text-[#9E8E7E] text-xs">{index + 1}</TableCell>
                  <TableCell className="font-bold text-[#1C1412] text-sm">{item.name}</TableCell>
                  <TableCell className="text-center font-black text-[#1C1412] text-sm">{item.currentStock}</TableCell>
                  <TableCell className="text-center text-[#6B5B4E] text-xs font-medium">{item.unit}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 min-w-32">
                      <div className="h-2 w-full bg-[#E8DFD3] rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", textColorClass)}>
                        {statusLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-[#9E8E7E] hover:text-[#1C1412] hover:bg-[#1C1412]/5 cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-[#9E8E7E] hover:text-[#C0392B] hover:bg-[#C0392B]/5 cursor-pointer"
                        onClick={() => {
                          if (item.originalType === 'ingredient') onDeleteIngredient(item.id);
                          else onDeleteProduct(item.id);
                          toast.success(`${item.name} deleted`);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {items.length === 0 && (
        <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <div className="p-3 bg-muted/50 rounded-full">
            <Trash2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">No items found</p>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog 
        open={isEditOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false);
            setSelectedItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {selectedItem?.originalType === 'ingredient' ? 'Ingredient' : 'Product'}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 py-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              name: formData.get("name") as string,
              unit: formData.get("unit") as IngredientUnit,
              currentStock: Number(formData.get("currentStock")),
              lowStockThreshold: Number(formData.get("lowStockThreshold")),
              costPerUnit: formData.get("costPerUnit") ? Number(formData.get("costPerUnit")) : null,
              supplier: formData.get("supplier") as string || null,
            };

            if (selectedItem) {
              if (selectedItem.originalType === 'ingredient') {
                onUpdateIngredient(selectedItem.id, data);
              } else {
                updateProduct(selectedItem.id, {
                  name: data.name,
                  quantity: data.currentStock,
                  lowStockThreshold: data.lowStockThreshold
                });
              }
              toast.success("Updated successfully");
            }
            setIsEditOpen(false);
            setSelectedItem(null);
          }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                <Input name="name" defaultValue={selectedItem?.name} placeholder="e.g. Espresso Beans" required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Unit</label>
                <Select name="unit" defaultValue={selectedItem?.unit || "grams"} disabled={selectedItem?.originalType === 'product'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grams">Grams (g)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Current Stock</label>
                <Input name="currentStock" type="number" defaultValue={selectedItem?.currentStock || 0} required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Low Threshold</label>
                <Input name="lowStockThreshold" type="number" defaultValue={selectedItem?.lowStockThreshold || 100} required />
              </div>
            </div>
            {selectedItem?.originalType === 'ingredient' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Cost per Unit</label>
                  <Input name="costPerUnit" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Supplier</label>
                  <Input name="supplier" placeholder="e.g. Nestle" />
                </div>
              </div>
            )}
            <DialogFooter className="mt-4 flex flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => {
                setIsEditOpen(false);
                setSelectedItem(null);
              }}>Cancel</Button>
              <Button type="submit" className="flex-1 sm:flex-none">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
