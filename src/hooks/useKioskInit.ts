import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import type { Product } from "@/types/inventory";

export interface KioskAppSettings {
  gcashSettings?: any;
  kioskOrderCounter?: any;
  [key: string]: any;
}

/**
 * Lightweight initialization hook strictly for customer-facing Kiosk view.
 * Fetches ONLY products, categories, and app_settings.
 * Excludes admin-level data (ingredients, recipes, sales, staff, restock logs).
 */
export function useKioskInit() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<KioskAppSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchKioskData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Products & Product Variants ONLY
      const { data: prodsData, error: prodsError } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .order("created_at", { ascending: true });

      if (prodsError) throw prodsError;

      const mappedProducts: Product[] = (prodsData || []).map((p: any) => ({
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
        }))
      }));

      // Filter in-stock products for customer menu
      const availableProducts = mappedProducts.filter(p => p.inStock !== false);

      // 2. Fetch Categories
      const cats = await storage.getCategories();

      // 3. Fetch App Settings (GCash settings & kiosk settings)
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("*");

      const settingsObj: KioskAppSettings = {};
      (settingsData || []).forEach((row: any) => {
        if (row.key) {
          settingsObj[row.key] = typeof row.value === "string" 
            ? JSON.parse(row.value) 
            : row.value;
        }
      });

      setProducts(availableProducts);
      setCategories(cats);
      setAppSettings(settingsObj);
    } catch (err) {
      console.error("Error initializing Kiosk data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKioskData();

    // Lightweight RealTime WebSocket subscription strictly for Kiosk updates
    const channelId = `kiosk_init_sync_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchKioskData())
      .on("postgres_changes", { event: "*", schema: "public", table: "product_variants" }, () => fetchKioskData())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchKioskData())
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => fetchKioskData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Strictly once on mount

  return {
    products,
    categories,
    appSettings,
    isLoading,
    refetchKioskData: fetchKioskData
  };
}
