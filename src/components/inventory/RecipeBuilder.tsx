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
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold uppercase text-muted-foreground">Recipe Name</label>
          <Input 
            placeholder="e.g. Latte - Medium" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold uppercase text-muted-foreground">Standard Yield</label>
          <Input 
            type="number" 
            placeholder="1" 
            value={yieldQty} 
            onChange={(e) => setYieldQty(Number(e.target.value))} 
          />
          <p className="text-[10px] text-muted-foreground italic">How many servings this recipe makes</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <label className="text-sm font-bold uppercase text-muted-foreground">Ingredients & Quantities</label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredientRow} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Add
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
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select Ingredient" />
                    </SelectTrigger>
                    <SelectContent>
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
                    className="h-10"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeIngredientRow(index)}
                  className="h-10 w-10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {recipeIngredients.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
              No ingredients added yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name || recipeIngredients.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          Save Recipe
        </Button>
      </div>
    </div>
  );
}
