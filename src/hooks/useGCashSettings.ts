import { useState, useEffect, useCallback } from "react";

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

  const updateGCashSettings = useCallback((newSettings: Partial<GCashSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(GCASH_SETTINGS_KEY, JSON.stringify(updated));

      try {
        const bc = new BroadcastChannel("timpla_gcash_channel");
        bc.postMessage({ type: "GCASH_SETTINGS_UPDATED", payload: updated });
        bc.close();
      } catch (e) {}

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
  }, []);

  useEffect(() => {
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

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  return {
    gcashNumber: settings.gcashNumber,
    gcashQrImage: settings.gcashQrImage,
    updateGCashSettings,
    resetGCashSettings,
  };
}
