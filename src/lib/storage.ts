import { supabase } from './supabase';
import type { Ingredient, Recipe, Product, Sale, IngredientStatus } from '../types/inventory';

export const calculateIngredientStatus = (currentStock: number, threshold: number): IngredientStatus => {
  if (currentStock === 0) return 'out';
  if (currentStock <= threshold * 0.25) return 'critical';
  if (currentStock <= threshold) return 'low';
  return 'good';
};

const CACHE_KEYS = {
  STAFF: 'timpla_cache_staff',
  INGREDIENTS: 'timpla_cache_ingredients',
  RECIPES: 'timpla_cache_recipes',
  PRODUCTS: 'timpla_cache_products',
  SALES: 'timpla_cache_sales',
  CATEGORIES: 'timpla_cache_categories',
};

export const storage = {
  // Staff
  getStaff: async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, avatar_color, can_manage_menu, can_manage_inventory');
      if (error) throw error;
      const mapped = (data || []).map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        avatarColor: s.avatar_color,
        avatarInitials: (s.name || "").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        canManageMenu: s.can_manage_menu,
        canManageInventory: s.can_manage_inventory
      }));
      try { localStorage.setItem(CACHE_KEYS.STAFF, JSON.stringify(mapped)); } catch (e) {}
      return mapped;
    } catch (e) {
      console.warn("Using offline cached staff data:", e);
      const cached = localStorage.getItem(CACHE_KEYS.STAFF);
      return cached ? JSON.parse(cached) : [];
    }
  },

  // Ingredients
  getIngredients: async (): Promise<Ingredient[]> => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*, restock_logs(*)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const mapped = (data || []).map(i => ({
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
      try { localStorage.setItem(CACHE_KEYS.INGREDIENTS, JSON.stringify(mapped)); } catch (e) {}
      return mapped;
    } catch (e) {
      console.warn("Using offline cached ingredients data:", e);
      const cached = localStorage.getItem(CACHE_KEYS.INGREDIENTS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  // Recipes
  getRecipes: async (): Promise<Recipe[]> => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(*)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const mapped = (data || []).map(r => ({
        id: r.id,
        name: r.name,
        yield: r.yield,
        ingredients: (r.recipe_ingredients || []).map((ri: any) => ({
          ingredientId: ri.ingredient_id,
          quantity: Number(ri.quantity)
        }))
      }));
      try { localStorage.setItem(CACHE_KEYS.RECIPES, JSON.stringify(mapped)); } catch (e) {}
      return mapped;
    } catch (e) {
      console.warn("Using offline cached recipes data:", e);
      const cached = localStorage.getItem(CACHE_KEYS.RECIPES);
      return cached ? JSON.parse(cached) : [];
    }
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(*), restock_logs(*)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      const mapped = (data || []).map(p => ({
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
      try { localStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(mapped)); } catch (e) {}
      return mapped;
    } catch (e) {
      console.warn("Using offline cached products data:", e);
      const cached = localStorage.getItem(CACHE_KEYS.PRODUCTS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  // Sales/Transactions
  getSales: async (): Promise<Sale[]> => {
    try {
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
      try { localStorage.setItem(CACHE_KEYS.SALES, JSON.stringify(sales)); } catch (e) {}
      return sales;
    } catch (e) {
      console.warn("Using offline cached sales data:", e);
      const cached = localStorage.getItem(CACHE_KEYS.SALES);
      return cached ? JSON.parse(cached) : [];
    }
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

  // Categories
  getCategories: async (): Promise<string[]> => {
    let catNames: string[] = [];

    // 1. Fetch custom categories from Supabase categories table
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        catNames = data.map((c: any) => c.name);
      }
    } catch (e) {
      console.warn("Could not fetch categories table, falling back to products", e);
    }

    // 2. Fetch distinct categories used in products table
    try {
      const { data: prodData } = await supabase.from('products').select('category');
      if (prodData) {
        prodData.forEach((p: any) => {
          if (p.category && !catNames.includes(p.category)) {
            catNames.push(p.category);
          }
        });
      }
    } catch (e) {
      console.warn("Could not fetch product categories", e);
    }

    const uniqueCats = Array.from(new Set(catNames));
    if (uniqueCats.length > 0) {
      try { localStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(uniqueCats)); } catch (e) {}
      return uniqueCats;
    } else {
      const cached = localStorage.getItem(CACHE_KEYS.CATEGORIES);
      return cached ? JSON.parse(cached) : [];
    }
  },

  addCategory: async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const { error } = await supabase.from('categories').insert([{ name: trimmed }]);
      if (error && error.code !== '23505') {
        console.error("Error inserting category to DB:", error);
      }
    } catch (e) {
      console.error("Database addCategory error:", e);
    }
  },

  deleteCategory: async (name: string): Promise<void> => {
    try {
      await supabase.from('categories').delete().eq('name', name);
    } catch (e) {
      console.error("Database deleteCategory error:", e);
    }
  },

  renameCategory: async (oldName: string, newName: string): Promise<void> => {
    try {
      const { error } = await supabase.from('categories').update({ name: newName }).eq('name', oldName);
      if (error) {
        await supabase.from('categories').insert([{ name: newName }]);
      }
      await supabase.from('products').update({ category: newName }).eq('category', oldName);
    } catch (e) {
      console.error("Database renameCategory error:", e);
    }
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
  },

  // App Settings static data helpers
  getAppSettings: async (key?: string) => {
    let query = supabase.from('app_settings').select('*');
    if (key) {
      query = query.eq('key', key);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getGCashSettings: async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'gcash_settings')
      .maybeSingle();

    if (error) throw error;
    if (!data?.value) return null;
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  }
};

