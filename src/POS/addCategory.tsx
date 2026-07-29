// components/AddCategoryModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/hooks/useCart";
import { Layers, Check } from "lucide-react";

interface AddCategoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCategory: (name: string, selectedProductIds: string[]) => void;
  existingProducts: Product[];
  existingCategories: string[];
}
import { toast } from "sonner";

export function AddCategoryModal({
  isOpen,
  onOpenChange,
  onAddCategory,
  existingProducts,
  existingCategories,
}: AddCategoryModalProps) {
  const [categoryName, setCategoryName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  

  // Toggle selection of products
  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    const trimmedName = categoryName.trim();
    
    // Validation
    if (!trimmedName) {
      setError("Category name is required");
      return;
    }
    if (existingCategories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      setError("This category already exists");
      return;
    }

    onAddCategory(trimmedName, selectedIds);

     toast.success(`Category "${categoryName}" created!`)
    // Reset and close
    setCategoryName("");
    setSelectedIds([]);
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#F5EFE6]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1C1412]">
            <Layers className="h-5 w-5 text-[#6B5B4E]" />
            Create New Category
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase text-[#9E8E7E] tracking-wider">Category Name</label>
            <Input
              autoFocus
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setError(""); // Clear error when typing
              }}
              placeholder="e.g. Seasonal Drinks"
              className="h-11 bg-white border-[#DDD5C8] text-[#1C1412] focus-visible:ring-[#C4B5A5]"
            />
            {error && <span className="text-[10px] font-bold uppercase text-red-500">{error}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase text-[#9E8E7E] tracking-wider">
              Select Items ({selectedIds.length} selected)
            </label>
            <span className="text-[10px] text-[#6B5B4E] mb-2 font-medium">
              Items selected will be moved from their current category to this new one.
            </span>
            
            {/* Scrollable list of existing products */}
            <div className="max-h-[35vh] overflow-y-auto border border-[#DDD5C8] rounded-xl p-2 flex flex-col gap-2 bg-[#E8DFD3]/30">
              {existingProducts.length === 0 ? (
                <p className="text-xs text-center py-8 text-[#9E8E7E] font-medium italic">No products available.</p>
              ) : (
                existingProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? "bg-[#1C1412]/5 border-[#1C1412] shadow-sm" 
                          : "bg-white border-[#DDD5C8]/50 hover:border-[#C4B5A5]"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-md overflow-hidden shrink-0 border border-[#DDD5C8]/50">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[#1C1412] truncate leading-tight">{product.name}</span>
                        <span className="text-[10px] font-medium text-[#6B5B4E] uppercase tracking-wide">{product.category}</span>
                      </div>
                      
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-[#1C1412] border-[#1C1412]" : "border-[#C4B5A5]"}`}>
                        {isSelected && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-[#E8DFD3]/20 p-4 -mx-6 -mb-6 border-t border-[#D4C9BB] sm:justify-end gap-2">
          <Button variant="ghost" className="text-[#6B5B4E] hover:bg-[#E8DFD3]" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-[#1C1412] text-white hover:bg-[#2C2018] rounded-full px-6 font-bold"
          >
            Create Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}