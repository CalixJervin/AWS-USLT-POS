import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface GCashSettings {
  gcashNumber: string;
  gcashQrImage: string; // Base64 data URL or image URL
}

const GCASH_SETTINGS_KEY = "timpla_gcash_settings";

const DEFAULT_SETTINGS: GCashSettings = {
  gcashNumber: "0917-123-4567",
  gcashQrImage: "",
};

export function useGCashSettings() {
  const [settings, setSettingsState] = useState<GCashSettings>(() => {
    try {
      const stored = localStorage.getItem(GCASH_SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error loading GCash settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Fetch GCash settings from Supabase across all devices
  const fetchSupabaseGCashSettings = useCallback(async () => {
    try {
      // 1. Try 'app_settings' table
      const { data: appData, error: appError } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "gcash_settings")
        .single();

      if (!appError && appData?.value) {
        const remoteSettings: GCashSettings = typeof appData.value === "string" 
          ? JSON.parse(appData.value) 
          : appData.value;

        setSettingsState(remoteSettings);
        localStorage.setItem(GCASH_SETTINGS_KEY, JSON.stringify(remoteSettings));
        return;
      }

      // 2. Try fallback 'settings' table if 'app_settings' fails
      const { data: setData, error: setError } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "gcash_settings")
        .single();

      if (!setError && setData?.value) {
        const remoteSettings: GCashSettings = typeof setData.value === "string" 
          ? JSON.parse(setData.value) 
          : setData.value;

        setSettingsState(remoteSettings);
        localStorage.setItem(GCASH_SETTINGS_KEY, JSON.stringify(remoteSettings));
      }
    } catch (e) {
      console.warn("Could not sync GCash settings from Supabase:", e);
    }
  }, []);

  const updateGCashSettings = useCallback((newSettings: Partial<GCashSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(GCASH_SETTINGS_KEY, JSON.stringify(updated));

      try {
        const bc = new BroadcastChannel("timpla_gcash_channel");
        bc.postMessage({ type: "GCASH_SETTINGS_UPDATED", payload: updated });
        bc.close();
      } catch (e) {}

      // Persist to Supabase so other devices pick it up immediately
      (async () => {
        try {
          const payload = { key: "gcash_settings", value: updated };
          const res1 = await supabase.from("app_settings").upsert(payload, { onConflict: "key" });
          if (res1.error) {
            await supabase.from("settings").upsert(payload, { onConflict: "key" });
          }
        } catch (err) {
          console.warn("Supabase GCash settings upsert error:", err);
        }
      })();

      return updated;
    });
  }, []);

  const resetGCashSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    localStorage.setItem(GCASH_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));

    try {
      const bc = new BroadcastChannel("timpla_gcash_channel");
      bc.postMessage({ type: "GCASH_SETTINGS_UPDATED", payload: DEFAULT_SETTINGS });
      bc.close();
    } catch (e) {}

    (async () => {
      try {
        const payload = { key: "gcash_settings", value: DEFAULT_SETTINGS };
        await supabase.from("app_settings").upsert(payload, { onConflict: "key" });
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    fetchSupabaseGCashSettings();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GCASH_SETTINGS_KEY && e.newValue) {
        try {
          setSettingsState(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("timpla_gcash_channel");
      bc.onmessage = (msg) => {
        if (msg.data?.type === "GCASH_SETTINGS_UPDATED" && msg.data?.payload) {
          setSettingsState(msg.data.payload);
        }
      };
    } catch (e) {}

    // Periodic sync from Supabase to keep all devices updated
    const interval = setInterval(() => {
      fetchSupabaseGCashSettings();
    }, 15000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [fetchSupabaseGCashSettings]);

  return {
    gcashNumber: settings.gcashNumber,
    gcashQrImage: settings.gcashQrImage,
    updateGCashSettings,
    resetGCashSettings,
    refetchGCashSettings: fetchSupabaseGCashSettings,
  };
}

