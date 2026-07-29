import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Check, Camera, Package, FlaskConical, Info, X } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

interface EditProductModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null; // Accepting Inventory Product structure
  categories: string[];
  onSave: (updatedProduct: any) => void;
}

export function EditProductModal({ isOpen, onOpenChange, product, categories, onSave }: EditProductModalProps) {
  const { recipes } = useInventory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  
  const [editedItem, setEditedItem] = useState({ 
    name: "", 
    category: "", 
    price: "", 
    recipeId: "", 
    image: "", 
    inStock: true,
    type: "made-to-order" as "made-to-order" | "ready-made",
    quantity: "0",
    lowStockThreshold: "5"
  });

  useEffect(() => {
    if (product && isOpen) {
      setEditedItem({
        name: product.name,
        category: product.category,
        price: (product.variants?.[0]?.price || 0).toString(),
        recipeId: product.variants?.[0]?.recipeId || "",
        image: product.image || "",
        inStock: product.inStock,
        type: product.type || "made-to-order",
        quantity: (product.quantity || 0).toString(),
        lowStockThreshold: (product.lowStockThreshold || 0).toString()
      });
      setImageError(null);
    }
  }, [product, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError(null);

    if (file) {
      if (!file.type.startsWith("image/")) {
        setImageError("Please upload an image file (JPG, PNG, or WEBP).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Image is too large. Please use a file under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedItem({ ...editedItem, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!product || !editedItem.name || !editedItem.price) return;
    
    onSave({
      id: product.id,
      name: editedItem.name,
      category: editedItem.category,
      price: Number(editedItem.price),
      recipeId: editedItem.recipeId || null,
      image: editedItem.image,
      inStock: editedItem.inStock,
      type: editedItem.type,
      quantity: Number(editedItem.quantity),
      lowStockThreshold: Number(editedItem.lowStockThreshold)
    });
    onOpenChange(false);
  };

  const labelClass = "text-[11px] font-bold uppercase text-[#6B5B4E] tracking-[0.08em] mb-1.5 block";
  const inputClass = "h-[48px] rounded-[10px] border-[1.5px] border-[#C4B5A5] bg-[#EDE5DA] text-[#1C1412] text-base focus-visible:ring-[#C4B5A5]";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] w-[calc(100%-32px)] p-0 overflow-hidden bg-[#FAF6F0] border-none rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-[#1C1412] text-lg font-bold">Edit Product</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Product Name */}
          <div>
            <label className={labelClass}>Product Name</label>
            <Input 
              placeholder="e.g. Signature Latte" 
              value={editedItem.name} 
              onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Image Upload Zone */}
          <div className="space-y-1.5">
            <label className={labelClass}>Product Image</label>
            <div 
              className={cn(
                "relative w-full min-h-[160px] rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
                editedItem.image 
                  ? "border-transparent bg-black" 
                  : "border-[#C4B5A5] bg-[#F5EFE6] hover:bg-[#EDE5DA] hover:border-[#A89080]"
              )}
              onClick={() => !editedItem.image && fileInputRef.current?.click()}
            >
              {editedItem.image ? (
                <>
                  <img 
                    src={editedItem.image} 
                    alt="Preview" 
                    className="absolute inset-0 w-full h-full object-cover rounded-[12px]"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 flex justify-between items-center bg-gradient-to-t from-black/60 to-transparent">
                    <Button 
                      size="sm" 
                      className="h-8 bg-black/55 hover:bg-black/70 text-white text-[12px] rounded-[6px] px-3 border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Change
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-8 bg-[#C0392B]/75 hover:bg-[#C0392B]/90 text-white text-[12px] rounded-[6px] px-3 border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditedItem({ ...editedItem, image: "" });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="h-[32px] w-[32px] text-[#C4B5A5] mb-2" />
                  <span className="text-[14px] font-semibold text-[#6B5B4E]">Tap to upload product image</span>
                  <span className="text-[12px] text-[#9E8E7E]">JPG, PNG or WEBP · Max 5MB</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              capture="environment"
              onChange={handleImageUpload} 
            />
            {imageError && (
              <p className="text-[12px] text-[#C0392B] mt-1.5">{imageError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className={labelClass}>Category</label>
              <Select 
                value={editedItem.category} 
                onValueChange={(val) => setEditedItem({ ...editedItem, category: val })}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== "All").map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Price */}
            <div>
              <label className={labelClass}>Price (₱)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1C1412] font-semibold">₱</span>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="0.00" 
                  value={editedItem.price} 
                  onChange={(e) => setEditedItem({ ...editedItem, price: e.target.value })} 
                  className={cn(inputClass, "pl-8")}
                />
              </div>
            </div>
          </div>

          {/* Availability/Stock Status */}
          <div className="space-y-2">
            <label className={labelClass}>Stock Status</label>
            <button
              onClick={() => setEditedItem({ ...editedItem, inStock: !editedItem.inStock })}
              className={cn(
                "w-full h-[48px] rounded-[10px] border-[1.5px] font-bold text-sm transition-all flex items-center justify-center gap-2",
                editedItem.inStock 
                  ? "bg-[#3D2B1F]/5 border-[#3D2B1F] text-[#3D2B1F]" 
                  : "bg-[#C0392B]/5 border-[#C0392B] text-[#C0392B]"
              )}
            >
              {editedItem.inStock ? (
                <><Check className="h-4 w-4" /> In Stock</>
              ) : (
                <><X className="h-4 w-4" /> Out of Stock</>
              )}
            </button>
          </div>

          {/* Stocking Method */}
          <div className="space-y-2">
            <label className={labelClass}>Stocking Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEditedItem({ ...editedItem, type: "made-to-order" })}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 min-h-[80px]",
                  editedItem.type === "made-to-order" 
                    ? "border-[#3D2B1F] bg-[#3D2B1F]/5 text-[#3D2B1F]" 
                    : "border-[#C4B5A5] text-[#9E8E7E] hover:bg-[#EDE5DA]"
                )}
              >
                <FlaskConical className="h-6 w-6" />
                <span className="text-xs font-bold">Made-to-order</span>
              </button>

              <button
                onClick={() => setEditedItem({ ...editedItem, type: "ready-made" })}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 min-h-[80px]",
                  editedItem.type === "ready-made" 
                    ? "border-[#3D2B1F] bg-[#3D2B1F]/5 text-[#3D2B1F]" 
                    : "border-[#C4B5A5] text-[#9E8E7E] hover:bg-[#EDE5DA]"
                )}
              >
                <Package className="h-6 w-6" />
                <span className="text-xs font-bold">Ready-made</span>
              </button>
            </div>
          </div>

          {/* Linked Recipe / Stock Info */}
          {editedItem.type === 'made-to-order' ? (
            <div>
              <label className={labelClass}>Linked Recipe</label>
              <Select 
                value={editedItem.recipeId || "none"} 
                onValueChange={(val) => setEditedItem({ ...editedItem, recipeId: val === "none" ? "" : val })}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select existing recipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual Stock Management</SelectItem>
                  {recipes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!editedItem.recipeId || editedItem.recipeId === "none") && (
                <p className="text-[11px] text-[#9E8E7E] mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  This product will be tracked by quantity only — no ingredients will be deducted.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Current Qty</label>
                <Input 
                  type="number" 
                  value={editedItem.quantity} 
                  onChange={(e) => setEditedItem({ ...editedItem, quantity: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Alert At</label>
                <Input 
                  type="number" 
                  value={editedItem.lowStockThreshold} 
                  onChange={(e) => setEditedItem({ ...editedItem, lowStockThreshold: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="p-5 bg-[#FAF6F0] border-t border-[#E8DFD3] flex items-center justify-end gap-4">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="h-[48px] px-4 text-[#6B5B4E] hover:bg-transparent hover:text-[#3D2B1F] font-semibold text-[14px]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!editedItem.name || !editedItem.price}
            className="h-[48px] px-8 bg-[#3D2B1F] hover:bg-[#2C1F17] text-white rounded-[10px] font-semibold text-[14px] shadow-sm flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

