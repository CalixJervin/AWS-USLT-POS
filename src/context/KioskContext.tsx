import { createContext, useContext, type ReactNode } from "react";
import { useKioskInit, type KioskAppSettings } from "@/hooks/useKioskInit";
import type { Product } from "@/types/inventory";

interface KioskContextType {
  products: Product[];
  categories: string[];
  appSettings: KioskAppSettings;
  isLoading: boolean;
  refetchKioskData: () => Promise<void>;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export function KioskProvider({ children }: { children: ReactNode }) {
  const kioskData = useKioskInit();

  return (
    <KioskContext.Provider value={kioskData}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error("useKiosk must be used within a KioskProvider");
  }
  return context;
}
