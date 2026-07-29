import { useState, useRef } from "react";
import type { 
  Ingredient, 
  Recipe, 
  Product, 
  ProductAvailability,
  ProductType
} from "@/types/inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  Camera,
  Check, 
  X,
  Package,
  FlaskConical,
  Info
} from "lucide-react";
import { RecipeBuilder } from "./RecipeBuilder";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddProductWizardProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  categories: string[];
  onComplete: (data: Omit<Product, 'id'>) => Promise<void>;
  onAddRecipe: (data: Omit<Recipe, 'id'>) => Promise<string | undefined>;
}

export function AddProductWizard({
  ingredients,
  recipes,
  categories,
  onComplete,
  onAddRecipe
}: AddProductWizardProps) {
  const [step, setStep] = useState(1);
  const [showInlineRecipeBuilder, setShowInlineRecipeBuilder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Product state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(() => {
    const validCategories = categories.filter(c => c !== "All");
    return validCategories[0] || "Uncategorized";
  });
  const [availability, setAvailability] = useState<ProductAvailability>("all-day");
  const [type, setType] = useState<ProductType>("made-to-order");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name) {
        toast.error("Please enter a product name");
        return;
      }
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!price || Number(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (type === 'ready-made' && (!quantity || Number(quantity) < 0)) {
      toast.error("Please enter starting quantity");
      return;
    }

    setIsSaving(true);
    try {
      const productData: Omit<Product, 'id'> = {
        name,
        category,
        type,
        availability,
        variants: [
          {
            id: "", // Placeholder, Supabase will generate this or we can generate it
            size: "Regular",
            price: Number(price),
            recipeId: type === 'made-to-order' ? recipeId : null
          }
        ],
        image: image || "https://placehold.co/600x600/e2e8f0/64748b?text=No+Image",
        inStock: true,
        ...(type === 'ready-made' ? {
          quantity: Number(quantity),
          lowStockThreshold: Number(lowStockThreshold) || 0,
          restockLog: []
        } : {})
      };
      await onComplete(productData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInlineRecipe = async (recipeData: Omit<Recipe, 'id'>) => {
    setIsSaving(true);
    try {
      const newId = await onAddRecipe(recipeData);
      if (newId) {
        setRecipeId(newId);
        setShowInlineRecipeBuilder(false);
        toast.success("New recipe created and linked!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const labelClass = "text-[11px] font-bold uppercase text-[#6B5B4E] tracking-[0.08em] mb-1.5 block";
  const inputClass = "h-[48px] rounded-[10px] border-[1.5px] border-[#C4B5A5] bg-[#EDE5DA] text-[#1C1412] text-base focus-visible:ring-[#C4B5A5]";

  return (
    <div className="flex flex-col h-full bg-[#FAF6F0]">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {step === 1 ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Product Name</label>
                <Input 
                  placeholder="e.g. Signature Latte" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <Select value={category} onValueChange={(val) => setCategory(val)}>
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
                <div>
                  <label className={labelClass}>Availability</label>
                  <Select value={availability} onValueChange={(val) => setAvailability(val as ProductAvailability)}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-day">All Day</SelectItem>
                      <SelectItem value="morning">Morning Only</SelectItem>
                      <SelectItem value="weekend">Weekends Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClass}>Stocking Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setType("made-to-order")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 min-h-[80px] ${
                      type === "made-to-order" 
                        ? "border-[#3D2B1F] bg-[#3D2B1F]/5 text-[#3D2B1F]" 
                        : "border-[#C4B5A5] text-[#9E8E7E] hover:bg-[#EDE5DA]"
                    }`}
                  >
                    <FlaskConical className="h-6 w-6" />
                    <span className="text-xs font-bold">Made-to-order</span>
                  </button>

                  <button
                    onClick={() => setType("ready-made")}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 min-h-[80px] ${
                      type === "ready-made" 
                        ? "border-[#3D2B1F] bg-[#3D2B1F]/5 text-[#3D2B1F]" 
                        : "border-[#C4B5A5] text-[#9E8E7E] hover:bg-[#EDE5DA]"
                    }`}
                  >
                    <Package className="h-6 w-6" />
                    <span className="text-xs font-bold">Ready-made</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Image Upload Zone */}
            <div className="space-y-1.5">
              <label className={labelClass}>Product Image</label>
              <div 
                className={cn(
                  "relative w-full min-h-[160px] rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden",
                  image 
                    ? "border-transparent bg-black" 
                    : "border-[#C4B5A5] bg-[#F5EFE6] hover:bg-[#EDE5DA] hover:border-[#A89080]"
                )}
                onClick={() => !image && fileInputRef.current?.click()}
              >
                {image ? (
                  <>
                    <img 
                      src={image} 
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
                          setImage(null);
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

            {/* Price Field */}
            <div>
              <label className={labelClass}>Price (₱)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1C1412] font-semibold">₱</span>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="0.00" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  className={cn(inputClass, "pl-8")}
                />
              </div>
            </div>

            {/* Linked Recipe / Stock Info */}
            {type === 'made-to-order' ? (
              <div className="space-y-4">
                {showInlineRecipeBuilder ? (
                  <div className="p-4 bg-[#F5EFE6] rounded-xl border border-[#C4B5A5] space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase text-[#6B5B4E]">Recipe Builder</h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowInlineRecipeBuilder(false)} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <RecipeBuilder 
                      ingredients={ingredients}
                      onSave={handleAddInlineRecipe}
                      onCancel={() => setShowInlineRecipeBuilder(false)}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={cn(labelClass, "mb-0")}>Linked Recipe</label>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-[11px] font-bold text-[#3D2B1F]" 
                        onClick={() => setShowInlineRecipeBuilder(true)}
                      >
                        + New Recipe
                      </Button>
                    </div>
                    <Select 
                      value={recipeId || "none"} 
                      onValueChange={(val) => setRecipeId(val === "none" ? null : val)}
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
                    {(!recipeId || recipeId === "none") && (
                      <p className="text-[11px] text-[#9E8E7E] mt-1.5 flex items-start gap-1">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        This product will be tracked by quantity only — no ingredients will be deducted.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start Qty</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Alert At</label>
                  <Input 
                    type="number" 
                    placeholder="5" 
                    value={lowStockThreshold} 
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="p-5 bg-[#FAF6F0] border-t border-[#E8DFD3] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
           <div className={cn(
             "h-[6px] rounded-full transition-all duration-300",
             step === 1 ? "bg-[#3D2B1F] w-[20px]" : "bg-[#C4B5A5] w-[6px]"
           )} />
           <div className={cn(
             "h-[6px] rounded-full transition-all duration-300",
             step === 2 ? "bg-[#3D2B1F] w-[20px]" : "bg-[#C4B5A5] w-[6px]"
           )} />
        </div>
        
        <div className="flex gap-4 items-center">
          {step === 2 && (
            <Button 
              variant="ghost" 
              onClick={() => setStep(1)} 
              className="h-[48px] px-2 text-[#6B5B4E] hover:bg-transparent hover:text-[#3D2B1F] font-semibold text-[14px] flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          
          <Button 
            onClick={step === 1 ? handleNext : handleSave} 
            disabled={isSaving}
            className="h-[48px] px-6 bg-[#3D2B1F] hover:bg-[#2C1F17] text-white rounded-[10px] font-semibold text-[14px] shadow-sm flex items-center gap-2"
          >
            {isSaving ? (
              "Saving..."
            ) : step === 1 ? (
              "Continue"
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Product
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
