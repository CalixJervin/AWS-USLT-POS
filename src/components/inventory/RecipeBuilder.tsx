import { useState } from "react";
import type { Ingredient, Recipe, RecipeIngredient } from "@/types/inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";

interface RecipeBuilderProps {
  ingredients: Ingredient[];
  initialData?: Recipe;
  onSave: (data: Omit<Recipe, 'id'>) => void;
  onCancel: () => void;
}

export function RecipeBuilder({
  ingredients,
  initialData,
  onSave,
  onCancel
}: RecipeBuilderProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    initialData?.ingredients || []
  );
  const [yieldQty, setYieldQty] = useState(initialData?.yield || 1);

  const addIngredientRow = () => {
    setRecipeIngredients([...recipeIngredients, { ingredientId: "", quantity: 0 }]);
  };

  const updateIngredientRow = (index: number, data: Partial<RecipeIngredient>) => {
    const newRows = [...recipeIngredients];
    newRows[index] = { ...newRows[index], ...data };
    setRecipeIngredients(newRows);
  };

  const removeIngredientRow = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name || recipeIngredients.length === 0) return;
    onSave({
      name,
      ingredients: recipeIngredients.filter(ri => ri.ingredientId && ri.quantity > 0),
      yield: yieldQty,
    });
  };

  return (
    <div className="space-y-6 text-[#E2E8F0]">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-xs font-bold uppercase text-[#94A3B8]">Recipe Name</label>
          <Input 
            placeholder="e.g. Latte - Medium" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="bg-[#131824] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#00F2FE]"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs font-bold uppercase text-[#94A3B8]">Standard Yield</label>
          <Input 
            type="number" 
            placeholder="1" 
            value={yieldQty} 
            onChange={(e) => setYieldQty(Number(e.target.value))} 
            className="bg-[#131824] border-[#2D3448] text-[#E2E8F0] focus-visible:ring-[#00F2FE]"
          />
          <p className="text-[10px] text-[#94A3B8] italic">How many servings this recipe makes</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <label className="text-xs font-bold uppercase text-[#94A3B8]">Ingredients & Quantities</label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredientRow} className="h-8 border-[#2D3448] text-[#00F2FE] hover:bg-[#131824]">
            <Plus className="h-4 w-4 mr-1 text-[#00F2FE]" /> Add
          </Button>
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
          {recipeIngredients.map((ri, index) => {
            return (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Select 
                    value={ri.ingredientId} 
                    onValueChange={(val) => updateIngredientRow(index, { ingredientId: val })}
                  >
                    <SelectTrigger className="h-10 bg-[#131824] border-[#2D3448] text-[#E2E8F0]">
                      <SelectValue placeholder="Select Ingredient" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input 
                    type="number" 
                    placeholder="Qty" 
                    value={ri.quantity} 
                    onChange={(e) => updateIngredientRow(index, { quantity: Number(e.target.value) })}
                    className="h-10 bg-[#131824] border-[#2D3448] text-[#E2E8F0]"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeIngredientRow(index)}
                  className="h-10 w-10 text-[#94A3B8] hover:text-[#FF3366] hover:bg-[#FF3366]/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {recipeIngredients.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-[#2D3448] rounded-lg text-[#94A3B8] text-sm">
              No ingredients added yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#232A3B]">
        <Button variant="outline" className="border-[#2D3448] text-[#94A3B8] hover:bg-[#131824]" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name || recipeIngredients.length === 0} className="bg-[#00F2FE] text-[#0B0E14] hover:bg-[#38F9FF] font-black">
          <Save className="h-4 w-4 mr-2 text-[#0B0E14]" />
          Save Recipe
        </Button>
      </div>
    </div>
  );
}
