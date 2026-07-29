import { useMemo, useState } from "react";
import { useInventory } from "@/hooks/useInventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  BookOpen,
} from "lucide-react";
import { InventoryTable, type InventoryItem } from "./inventory/InventoryTable";
import { RecipesGrid } from "./inventory/RecipesGrid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface InventorySystemProps {
  externalSearchQuery?: string;
  onAddClick?: () => void;
}

export function InventorySystem({ externalSearchQuery = "", onAddClick }: InventorySystemProps) {
  const {
    ingredients,
    products,
    recipes,
    updateIngredient,
    deleteIngredient,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    deleteProduct,
  } = useInventory();

  const [activeTab, setActiveTab] = useState("made-to-order");

  const inventoryItems = useMemo(() => {
    const ingItems: InventoryItem[] = ingredients.map(ing => ({
      id: ing.id,
      name: ing.name,
      type: 'made-to-order' as const,
      currentStock: ing.currentStock,
      unit: ing.unit,
      lowStockThreshold: ing.lowStockThreshold,
      status: ing.status,
      lastRestocked: ing.restockLog[0]?.date,
      originalType: 'ingredient' as const
    }));

    const readyMadeItems: InventoryItem[] = products
      .filter(p => p.type === 'ready-made')
      .map(p => {
        const qty = p.quantity || 0;
        const threshold = p.lowStockThreshold || 0;
        let status: 'good' | 'low' | 'critical' | 'out' = 'good';
        if (qty === 0) status = 'out';
        else if (qty <= threshold * 0.25) status = 'critical';
        else if (qty <= threshold) status = 'low';

        return {
          id: p.id,
          name: p.name,
          type: 'ready-made' as const,
          currentStock: qty,
          unit: 'pcs',
          lowStockThreshold: threshold,
          status: status,
          lastRestocked: p.restockLog?.[0]?.date,
          originalType: 'product' as const
        };
      });

    return [...ingItems, ...readyMadeItems];
  }, [ingredients, products]);

  const filteredItems = (type: 'made-to-order' | 'ready-made') => 
    inventoryItems.filter(item => 
      item.type === type && 
      item.name.toLowerCase().includes(externalSearchQuery.toLowerCase())
    );

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(externalSearchQuery.toLowerCase())
    );
  }, [recipes, externalSearchQuery]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeTab === "recipes" ? (
            <BookOpen className="h-5 w-5 text-[#6B5B4E]" />
          ) : (
            <BarChart3 className="h-5 w-5 text-[#6B5B4E]" />
          )}
          <h2 className="text-lg font-bold text-[#1C1412]">
            {activeTab === "recipes" ? "Recipe Book" : "Stock Levels"}
          </h2>
        </div>
        
        {activeTab !== "recipes" && (
          <Button 
            onClick={onAddClick}
            className="bg-[#1C1412] text-white hover:bg-[#2C2018] gap-2 h-10 px-5 rounded-full shadow-md font-semibold text-sm transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex h-14 bg-[#E8DFD3] p-1.5 rounded-xl mb-6 shadow-inner border border-[#D4C9BB]">
          <TabsTrigger value="made-to-order" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-[#6B5B4E] data-[state=active]:text-[#1C1412] text-sm">Made to Order</TabsTrigger>
          <TabsTrigger value="ready-made" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-[#6B5B4E] data-[state=active]:text-[#1C1412] text-sm">Ready Made</TabsTrigger>
          <TabsTrigger value="recipes" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-[#6B5B4E] data-[state=active]:text-[#1C1412] text-sm">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="made-to-order" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <InventoryTable 
            items={filteredItems('made-to-order')} 
            onUpdateIngredient={updateIngredient}
            onDeleteIngredient={deleteIngredient}
            onDeleteProduct={deleteProduct}
          />
        </TabsContent>

        <TabsContent value="ready-made" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <InventoryTable 
            items={filteredItems('ready-made')} 
            onUpdateIngredient={updateIngredient}
            onDeleteIngredient={deleteIngredient}
            onDeleteProduct={deleteProduct}
          />
        </TabsContent>

        <TabsContent value="recipes" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RecipesGrid 
            recipes={filteredRecipes}
            ingredients={ingredients}
            products={products}
            onAdd={addRecipe}
            onUpdate={updateRecipe}
            onDelete={deleteRecipe}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
