export type IngredientUnit = 'grams' | 'ml' | 'pcs' | 'bottles' | 'packs';
export type IngredientStatus = 'good' | 'low' | 'critical' | 'out';

export interface RestockEntry {
  date: string;
  quantityAdded: number;
  supplier?: string;
  notes?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  currentStock: number;
  lowStockThreshold: number;
  costPerUnit?: number | null;
  supplier?: string | null;
  restockLog: RestockEntry[];
  status: IngredientStatus;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  yield: number;
}

export interface ProductVariant {
  id: string;
  size: string;
  price: number;
  recipeId: string | null;
}

export type ProductCategory = string;
export type ProductAvailability = 'all-day' | 'morning' | 'weekend';
export type ProductType = 'made-to-order' | 'ready-made';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  type: ProductType;
  variants: ProductVariant[];
  image?: string | null; // base64
  inStock: boolean;
  availability: ProductAvailability;
  
  // Ready-made specific fields
  quantity?: number;
  lowStockThreshold?: number;
  restockLog?: RestockEntry[];
}

export interface Sale {
  id: string;
  date: string;
  productId: string;
  variantIndex: number;
  quantity: number;
  totalPrice: number;
}
