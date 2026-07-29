import { supabase } from './supabase';
import type { Ingredient, Recipe, Product, Sale, IngredientStatus } from '../types/inventory';

export const calculateIngredientStatus = (currentStock: number, threshold: number): IngredientStatus => {
  if (currentStock === 0) return 'out';
  if (currentStock <= threshold * 0.25) return 'critical';
  if (currentStock <= threshold) return 'low';
  return 'good';
};

export const storage = {
  // Staff
  getStaff: async () => {
    const { data, error } = await supabase.from('staff').select('*');
    if (error) throw error;
    return data.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      avatarColor: s.avatar_color,
      avatarInitials: s.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      canManageMenu: s.can_manage_menu,
      canManageInventory: s.can_manage_inventory
    }));
  },

  // Ingredients
  getIngredients: async (): Promise<Ingredient[]> => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*, restock_logs(*)');
    if (error) throw error;
    
    return (data || []).map(i => ({
      id: i.id,
      name: i.name,
      unit: i.unit as any,
      currentStock: Number(i.current_stock),
      lowStockThreshold: Number(i.low_stock_threshold),
      costPerUnit: i.cost_per_unit ? Number(i.cost_per_unit) : null,
      supplier: i.supplier,
      restockLog: (i.restock_logs || [])
        .filter((l: any) => l.ingredient_id === i.id)
        .map((l: any) => ({
          date: l.created_at,
          quantityAdded: Number(l.quantity_added),
          supplier: l.supplier,
          notes: l.notes
        })),
      status: calculateIngredientStatus(Number(i.current_stock), Number(i.low_stock_threshold))
    }));
  },

  // Recipes
  getRecipes: async (): Promise<Recipe[]> => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)');
    if (error) throw error;
    
    return (data || []).map(r => ({
      id: r.id,
      name: r.name,
      yield: r.yield,
      ingredients: (r.recipe_ingredients || []).map((ri: any) => ({
        ingredientId: ri.ingredient_id,
        quantity: Number(ri.quantity)
      }))
    }));
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*), restock_logs(*)');
    if (error) throw error;
    
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      type: p.type as any,
      image: p.image_url,
      inStock: p.in_stock,
      availability: p.availability as any,
      quantity: p.quantity ? Number(p.quantity) : undefined,
      lowStockThreshold: p.low_stock_threshold ? Number(p.low_stock_threshold) : undefined,
      variants: (p.product_variants || []).map((v: any) => ({
        id: v.id,
        size: v.size,
        price: Number(v.price),
        recipeId: v.recipe_id
      })),
      restockLog: (p.restock_logs || [])
        .filter((l: any) => l.product_id === p.id)
        .map((l: any) => ({
          date: l.created_at,
          quantityAdded: Number(l.quantity_added),
          supplier: l.supplier,
          notes: l.notes
        }))
    }));
  },

  // Sales/Transactions
  getSales: async (): Promise<Sale[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)');
    if (error) throw error;
    
    const sales: Sale[] = [];
    (data || []).forEach(order => {
      (order.order_items || []).forEach((item: any) => {
        sales.push({
          id: item.id,
          date: order.created_at,
          productId: item.product_id,
          variantIndex: 0, // Simplified as order_items stores variant_id
          quantity: item.quantity,
          totalPrice: Number(item.price) * item.quantity
        });
      });
    });
    return sales;
  },

  // Image Upload
  uploadImage: async (file: File | string): Promise<string> => {
    let blob: Blob;
    if (typeof file === 'string') {
      // Handle base64
      const res = await fetch(file);
      blob = await res.blob();
    } else {
      blob = file;
    }
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, blob, { contentType: 'image/png', upsert: true });
    
    if (error) {
      console.error("Supabase storage upload error:", error);
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
      
    return publicUrl;
  },

  // Compatibility helpers (can be removed once all components are updated)
  getItem: <T>(key: string, defaultValue: T): T => {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  },
  setItem: (key: string, value: any) => {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
  },
  saveIngredients: () => {},
  saveRecipes: () => {},
  saveProducts: () => {},
  saveSales: () => {},
  saveStaff: () => {},
  clearAll: () => {
    sessionStorage.clear();
  }
};
