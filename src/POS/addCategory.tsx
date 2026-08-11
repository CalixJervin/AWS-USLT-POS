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
import { toast } from "sonner";

interface AddCategoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCategory: (name: string, selectedProductIds: string[]) => void;
  existingProducts: Product[];
  existingCategories: string[];
}

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

    toast.success(`Category "${categoryName}" created!`);
    // Reset and close
    setCategoryName("");
    setSelectedIds([]);
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1E2333] border border-[#2D3448] text-[#E2E8F0]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#E2E8F0] font-bold text-lg">
            <Layers className="h-5 w-5 text-[#E6007E]" />
            Create New Category
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider">Category Name</label>
            <Input
              autoFocus
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setError(""); // Clear error when typing
              }}
              placeholder="e.g. Seasonal Drinks"
              className="h-11 bg-[#131824] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#E6007E]"
            />
            {error && <span className="text-[10px] font-bold uppercase text-[#FF3366]">{error}</span>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider">
              Select Items ({selectedIds.length} selected)
            </label>
            <span className="text-[10px] text-[#94A3B8] mb-2 font-medium">
              Items selected will be moved from their current category to this new one.
            </span>
            
            {/* Scrollable list of existing products */}
            <div className="max-h-[35vh] overflow-y-auto border border-[#2D3448] rounded-xl p-2 flex flex-col gap-2 bg-[#131824]">
              {existingProducts.length === 0 ? (
                <p className="text-xs text-center py-8 text-[#94A3B8] font-medium italic">No products available.</p>
              ) : (
                existingProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? "bg-[#00F2FE]/15 border-[#00F2FE] shadow-sm" 
                          : "bg-[#1E2333] border-[#2D3448] hover:border-[#00F2FE]/50"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-md overflow-hidden shrink-0 border border-[#2D3448] bg-[#131824]">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[#E2E8F0] break-words whitespace-normal leading-tight">{product.name}</span>
                        <span className="text-[10px] font-bold text-[#E6007E] uppercase tracking-wide">{product.category}</span>
                      </div>
                      
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-[#00F2FE] border-[#00F2FE]" : "border-[#2D3448]"}`}>
                        {isSelected && <Check className="h-3 w-3 text-[#0B0E14] stroke-[3px]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-[#131824] p-4 -mx-6 -mb-6 border-t border-[#232A3B] sm:justify-end gap-2">
          <Button variant="ghost" className="text-[#94A3B8] hover:bg-[#1E2333] hover:text-[#E2E8F0]" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] rounded-full px-6 font-black"
          >
            Create Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}