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
    
    let colorClass = "bg-[#E6007E]"; // OK (Vivid Pink)
    let statusLabel = "OK";
    let textColorClass = "text-[#E6007E]";

    if (current === 0) {
      colorClass = "bg-[#FF3366]"; // Out (Neon Red)
      statusLabel = "Out";
      textColorClass = "text-[#FF3366]";
    } else if (current <= threshold * 0.25) {
      colorClass = "bg-[#FF3366]"; // Critical (Neon Red)
      statusLabel = "Critical";
      textColorClass = "text-[#FF3366]";
    } else if (current <= threshold) {
      colorClass = "bg-[#f59e0b]"; // Low (Yellow/Orange)
      statusLabel = "Low";
      textColorClass = "text-[#f59e0b]";
    }

    return { percentage, colorClass, statusLabel, textColorClass };
  };

  return (
    <div className="bg-[#1E2333] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.2)] overflow-hidden border border-[#2D3448]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#131824]">
            <TableRow className="hover:bg-transparent border-b border-[#232A3B]">
              <TableHead className="w-12 text-[10px] font-bold uppercase text-[#94A3B8] text-center">#</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8]">Name</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8] text-center">Stock</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8] text-center">Unit</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8] w-48">Level</TableHead>
              <TableHead className="text-[10px] font-bold uppercase text-[#94A3B8] text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const { percentage, colorClass, statusLabel, textColorClass } = getStockLevelInfo(item.currentStock, item.lowStockThreshold);
              
              return (
                <TableRow key={item.id} className="hover:bg-[#282E42] transition-colors border-b border-[#232A3B] last:border-0">
                  <TableCell className="text-center font-medium text-[#94A3B8] text-xs">{index + 1}</TableCell>
                  <TableCell className="font-bold text-[#E2E8F0] text-sm">{item.name}</TableCell>
                  <TableCell className="text-center font-black text-[#E6007E] text-sm">{item.currentStock}</TableCell>
                  <TableCell className="text-center text-[#94A3B8] text-xs font-medium">{item.unit}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 min-w-32">
                      <div className="h-2 w-full bg-[#131824] rounded-full overflow-hidden border border-[#232A3B]">
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
                        className="h-9 w-9 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#131824] cursor-pointer"
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
                        className="h-9 w-9 text-[#94A3B8] hover:text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer"
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
        <div className="p-12 flex flex-col items-center justify-center text-[#94A3B8] gap-2">
          <div className="p-3 bg-[#131824] rounded-full border border-[#232A3B]">
            <Trash2 className="h-6 w-6 text-[#94A3B8]" />
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
        <DialogContent className="sm:max-w-md bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#E2E8F0] text-lg font-bold">Edit {selectedItem?.originalType === 'ingredient' ? 'Ingredient' : 'Product'}</DialogTitle>
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
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Name</label>
                <Input name="name" defaultValue={selectedItem?.name} placeholder="e.g. Espresso Beans" required className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Unit</label>
                <Select name="unit" defaultValue={selectedItem?.unit || "grams"} disabled={selectedItem?.originalType === 'product'}>
                  <SelectTrigger className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
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
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Current Stock</label>
                <Input name="currentStock" type="number" defaultValue={selectedItem?.currentStock || 0} required className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8]">Low Threshold</label>
                <Input name="lowStockThreshold" type="number" defaultValue={selectedItem?.lowStockThreshold || 100} required className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
              </div>
            </div>
            {selectedItem?.originalType === 'ingredient' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-[#94A3B8]">Cost per Unit</label>
                  <Input name="costPerUnit" type="number" step="0.01" placeholder="0.00" className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-[#94A3B8]">Supplier</label>
                  <Input name="supplier" placeholder="e.g. Nestle" className="bg-[#131824] border-[#2D3448] text-[#E2E8F0]" />
                </div>
              </div>
            )}
            <DialogFooter className="mt-4 flex flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none border-[#2D3448] text-[#94A3B8] hover:bg-[#282E42]" onClick={() => {
                setIsEditOpen(false);
                setSelectedItem(null);
              }}>Cancel</Button>
              <Button type="submit" className="flex-1 sm:flex-none font-black bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF]">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
