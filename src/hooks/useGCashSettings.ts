import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface GCashSettings {
  gcashNumber?: string;
  gcashQrImage: string; // Base64 data URL or image URL
}

export async function downloadGCashQrCode(qrImageUrl: string, fileName = "gcash-qr-code.png") {
  if (!qrImageUrl) return;
  try {
    if (qrImageUrl.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }
  } catch (err) {
    const link = document.createElement("a");
    link.href = qrImageUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

const GCASH_SETTINGS_KEY = "timpla_gcash_settings";

const DEFAULT_SETTINGS: GCashSettings = {
  gcashNumber: "",
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
    // Initial fetch strictly once on mount
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

    // Realtime channel for instant cross-device GCash updates
    const channelId = `gcash_sync_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => {
          if (payload.new?.key === "gcash_settings" || payload.old?.key === "gcash_settings") {
            fetchSupabaseGCashSettings();
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    gcashNumber: settings.gcashNumber,
    gcashQrImage: settings.gcashQrImage,
    updateGCashSettings,
    resetGCashSettings,
    refetchGCashSettings: fetchSupabaseGCashSettings,
  };
}

