import type { Ingredient, Recipe } from "@/types/inventory";

export interface StockCheckableProduct {
  id: string;
  name: string;
  type?: string;
  quantity?: number;
  inStock?: boolean;
  variants?: any[];
  variantId?: string;
}

/**
 * Calculates the exact available stock count for a given product or variant.
 * - For ready-made items: returns product.quantity
 * - For made-to-order items: calculates max portions based on required recipe ingredients
 * - For items explicitly marked out of stock: returns 0
 */
export function calculateAvailableStock(
  product: StockCheckableProduct,
  ingredients?: Ingredient[],
  recipes?: Recipe[]
): number {
  if (product.inStock === false) return 0;

  // 1. Ready-made products or products with explicit quantity field
  if (product.type === "ready-made" || product.quantity !== undefined) {
    return Math.max(0, product.quantity ?? 0);
  }

  // 2. Made-to-order products with recipe ingredients
  if (product.type === "made-to-order" && ingredients && recipes && product.variants && product.variants.length > 0) {
    const variant = product.variants.find((v: any) => v.id === product.variantId) || product.variants[0];
    if (variant && variant.recipeId) {
      const recipe = recipes.find(r => r.id === variant.recipeId);
      if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
        let minPortions = Infinity;
        for (const ri of recipe.ingredients) {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (!ing || ing.currentStock <= 0) return 0;
          const portions = Math.floor(ing.currentStock / ri.quantity);
          if (portions < minPortions) minPortions = portions;
        }
        return minPortions === Infinity ? 999 : Math.max(0, minPortions);
      }
    }
  }

  // Fallback for general items without specific stock tracking
  return 999;
}
