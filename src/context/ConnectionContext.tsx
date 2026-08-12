import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Zap, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface AdminOfflineOrder {
  id: string;
  orderNumber: string;
  total: number;
  paymentMethod: "cash" | "gcash" | "counter";
  paymentStatus: string;
  status: string;
  createdAt: string;
  customerName?: string;
  cart: {
    id: string;
    variantId?: string;
    name: string;
    size?: string;
    price: number;
    qty: number;
  }[];
}

export interface ConnectionContextType {
  isOnline: boolean;
  isBackendConnected: boolean;
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<boolean>;
  notifyConnectionError: (customMessage?: string) => void;
  
  // Admin ONLY Offline Mode State & Functions
  isForcedOffline: boolean;
  setIsForcedOffline: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleForcedOffline: () => void;
  isAdminOfflineMode: boolean;
  pendingOfflineOrders: AdminOfflineOrder[];
  saveAdminOfflineOrder: (
    cart: any[],
    total: number,
    paymentMethod?: "cash" | "gcash" | "counter",
    customerName?: string
  ) => AdminOfflineOrder;
  syncOfflineAdminOrders: () => Promise<{ success: number; failed: number }>;
  clearOfflineAdminOrders: () => void;
  isSyncingOfflineOrders: boolean;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

const TOAST_ID = "connection-status-toast";
const FORCED_OFFLINE_KEY = "timpla_admin_forced_offline";
const OFFLINE_ORDERS_KEY = "timpla_admin_offline_orders";

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked] = useState<Date | null>(null);

  // Admin Forced Offline Toggle state
  const [isForcedOffline, setIsForcedOfflineState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(FORCED_OFFLINE_KEY) === "true";
    } catch (e) {
      return false;
    }
  });

  // Pending offline orders queue
  const [pendingOfflineOrders, setPendingOfflineOrders] = useState<AdminOfflineOrder[]>(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [isSyncingOfflineOrders, setIsSyncingOfflineOrders] = useState<boolean>(false);

  // Keep track of whether we've notified of initial status
  const isInitialMount = useRef<boolean>(true);
  const wasConnectedRef = useRef<boolean>(true);

  const isConnected = isOnline && isBackendConnected;
  const isAdminOfflineMode = !isConnected || isForcedOffline;

  const setIsForcedOffline = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setIsForcedOfflineState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem(FORCED_OFFLINE_KEY, String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const toggleForcedOffline = useCallback(() => {
    setIsForcedOffline((prev) => {
      const next = !prev;
      if (next) {
        toast.info("Admin Offline Mode Enabled", {
          description: "All admin transactions will be saved locally and can be synced when back online.",
          icon: <Zap className="h-4 w-4 text-amber-400" />
        });
      } else {
        toast.success("Admin Online Mode Restored", {
          description: "Live server synchronization active.",
          icon: <Wifi className="h-4 w-4 text-emerald-400" />
        });
      }
      return next;
    });
  }, [setIsForcedOffline]);

  // Load offline orders from localStorage
  const loadOfflineOrders = useCallback(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
      const parsed: AdminOfflineOrder[] = stored ? JSON.parse(stored) : [];
      setPendingOfflineOrders(parsed);
    } catch (e) {}
  }, []);

  // Save an admin order locally when offline
  const saveAdminOfflineOrder = useCallback((
    cart: any[],
    total: number,
    paymentMethod: "cash" | "gcash" | "counter" = "cash",
    customerName?: string
  ): AdminOfflineOrder => {
    const offlineId = `admin-offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const orderNumber = `#OFFLINE-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOfflineOrder: AdminOfflineOrder = {
      id: offlineId,
      orderNumber,
      total,
      paymentMethod,
      paymentStatus: "Paid",
      status: "completed",
      createdAt: new Date().toISOString(),
      customerName: customerName?.trim() || undefined,
      cart: cart.map((i) => ({
        id: i.id,
        variantId: i.variantId,
        name: i.name,
        size: i.size || "Regular",
        price: i.price,
        qty: i.qty,
      })),
    };

    try {
      const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
      const existing: AdminOfflineOrder[] = stored ? JSON.parse(stored) : [];
      const updated = [newOfflineOrder, ...existing];
      localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(updated));
      setPendingOfflineOrders(updated);

      try {
        const bc = new BroadcastChannel("timpla_admin_offline_channel");
        bc.postMessage({ type: "OFFLINE_ORDER_ADDED", order: newOfflineOrder });
        bc.close();
      } catch (e) {}

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("timpla_admin_offline_orders_updated"));

      toast.success(`Offline Order ${orderNumber} Saved!`, {
        description: `₱${total.toFixed(2)} recorded locally. Will sync to database when online.`,
        icon: <Zap className="h-4 w-4 text-amber-400" />
      });
    } catch (e) {
      console.error("Error saving admin offline order:", e);
      toast.error("Failed to save offline order locally");
    }

    return newOfflineOrder;
  }, []);

  const isSyncingRef = useRef<boolean>(false);

  // Sync offline admin orders to Supabase
  const syncOfflineAdminOrders = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (isSyncingRef.current) {
      return { success: 0, failed: 0 };
    }
    isSyncingRef.current = true;
    setIsSyncingOfflineOrders(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
      if (!stored) {
        return { success: 0, failed: 0 };
      }

      const offlineOrders: AdminOfflineOrder[] = JSON.parse(stored);
      if (!offlineOrders || offlineOrders.length === 0) {
        return { success: 0, failed: 0 };
      }

      const remainingOrders: AdminOfflineOrder[] = [...offlineOrders];

      for (const order of [...offlineOrders]) {
        try {
          // Idempotency check: verify if order_number already exists in Supabase DB
          const { data: existingDbOrder } = await supabase
            .from("orders")
            .select("id")
            .eq("order_number", order.orderNumber)
            .maybeSingle();

          if (existingDbOrder) {
            console.log(`[Offline Sync] Order ${order.orderNumber} already exists in DB. Removing from queue.`);
            const idx = remainingOrders.findIndex((o) => o.id === order.id);
            if (idx !== -1) remainingOrders.splice(idx, 1);
            localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(remainingOrders));
            setPendingOfflineOrders([...remainingOrders]);
            successCount++;
            continue;
          }

          const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
          const rpcItems = order.cart.map((item) => ({
            product_id: isValidUuid(item.id) ? item.id : null,
            variant_id: isValidUuid(item.variantId) ? item.variantId : null,
            product_name: item.name,
            size: item.size || "Regular",
            price: item.price,
            quantity: item.qty,
          }));

          // Direct insert with order_number = order.orderNumber so local & DB order_numbers match 1:1!
          const { data: insertedOrder, error: insertErr } = await supabase
            .from("orders")
            .insert([
              {
                order_number: order.orderNumber,
                total: order.total,
                status: "completed",
                payment_method: order.paymentMethod === "counter" ? "cash" : order.paymentMethod,
                created_at: order.createdAt,
              },
            ])
            .select()
            .single();

          if (insertErr) {
            // Handle unique constraint conflict (already uploaded)
            if (insertErr.code === "23505") {
              const idx = remainingOrders.findIndex((o) => o.id === order.id);
              if (idx !== -1) remainingOrders.splice(idx, 1);
              localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(remainingOrders));
              setPendingOfflineOrders([...remainingOrders]);
              successCount++;
              continue;
            }
            throw insertErr;
          }

          if (insertedOrder) {
            const orderItems = rpcItems.map((item) => ({
              order_id: insertedOrder.id,
              ...item,
            }));
            await supabase.from("order_items").insert(orderItems);
          }

          // Deduct stock in DB
          try {
            await supabase.rpc("deduct_stock_on_sale", { p_order_items: rpcItems });
          } catch (stockErr) {
            console.warn("Offline sync stock deduction notice:", stockErr);
          }

          // Immediately remove synced order from local queue
          const idx = remainingOrders.findIndex((o) => o.id === order.id);
          if (idx !== -1) remainingOrders.splice(idx, 1);
          localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(remainingOrders));
          setPendingOfflineOrders([...remainingOrders]);

          successCount++;
        } catch (err: any) {
          console.error("Failed to sync offline order:", order.orderNumber, err);
          failedCount++;
        }
      }

      try {
        const bc = new BroadcastChannel("timpla_admin_offline_channel");
        bc.postMessage({ type: "OFFLINE_ORDERS_SYNCED", successCount, remainingCount: remainingOrders.length });
        bc.close();
      } catch (e) {}

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("timpla_admin_offline_orders_updated"));

      if (successCount > 0) {
        toast.success(`Successfully synced ${successCount} offline admin order(s) to server database!`, {
          icon: <UploadCloud className="h-4 w-4 text-emerald-400" />
        });
      }
      if (failedCount > 0) {
        toast.error(`Failed to sync ${failedCount} offline order(s). Will retry when online.`);
      }

      return { success: successCount, failed: failedCount };
    } catch (err) {
      console.error("Error during offline orders sync:", err);
      return { success: successCount, failed: failedCount };
    } finally {
      isSyncingRef.current = false;
      setIsSyncingOfflineOrders(false);
    }
  }, []);

  const clearOfflineAdminOrders = useCallback(() => {
    localStorage.removeItem(OFFLINE_ORDERS_KEY);
    setPendingOfflineOrders([]);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("timpla_admin_offline_orders_updated"));
    toast.info("Offline orders queue cleared.");
  }, []);

  // Check connectivity to Supabase backend
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);

    if (!navigator.onLine) {
      setIsOnline((prev) => (prev !== false ? false : prev));
      setIsBackendConnected((prev) => (prev !== false ? false : prev));
      setIsChecking(false);
      return false;
    }

    setIsOnline((prev) => (prev !== true ? true : prev));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const { error } = await supabase
        .from("app_settings")
        .select("key")
        .limit(1)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      const isSuccess = !error || error.code === "PGRST116" || error.code === "PGRST204";

      setIsBackendConnected((prev) => (prev !== isSuccess ? isSuccess : prev));
      setIsChecking(false);
      return isSuccess;
    } catch (err: any) {
      console.warn("[Connection Check] Backend connection check failed:", err?.message || err);
      setIsBackendConnected((prev) => (prev !== false ? false : prev));
      setIsChecking(false);
      return false;
    }
  }, []);

  // Trigger toast alerts when connection status changes
  const notifyConnectionChange = useCallback(
    (connected: boolean) => {
      if (connected) {
        toast.dismiss(TOAST_ID);
        toast.success("Connection Restored", {
          id: "connection-restored-toast",
          description: "Server and database connection re-established.",
          duration: 4000,
          icon: <Wifi className="h-4 w-4 text-emerald-400" />,
        });
        // Auto sync pending offline orders when reconnected!
        syncOfflineAdminOrders();
      } else {
        toast.dismiss(TOAST_ID);
        toast.error("Connection Lost — Offline Mode Active", {
          id: TOAST_ID,
          description: "Admin POS can continue processing orders locally.",
          duration: Infinity,
          icon: <WifiOff className="h-4 w-4 text-[#FF3366]" />,
          action: {
            label: "Retry",
            onClick: () => {
              checkConnection();
            },
          },
        });
      }
    },
    [checkConnection, syncOfflineAdminOrders]
  );

  const notifyConnectionError = useCallback(
    (customMessage?: string) => {
      toast.error("Network Error", {
        description: customMessage || "Action failed due to network connection issues. Admin POS can operate in Offline Mode.",
        duration: 6000,
        icon: <AlertTriangle className="h-4 w-4 text-[#FF3366]" />,
        action: {
          label: "Check Connection",
          onClick: () => checkConnection(),
        },
      });
      checkConnection();
    },
    [checkConnection]
  );

  useEffect(() => {
    loadOfflineOrders();

    const handleOnline = () => {
      setIsOnline(true);
      checkConnection().then((connected) => {
        if (!wasConnectedRef.current && connected) {
          wasConnectedRef.current = true;
          notifyConnectionChange(true);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBackendConnected(false);
      if (wasConnectedRef.current) {
        wasConnectedRef.current = false;
        notifyConnectionChange(false);
      }
    };

    const handleStorageChange = () => {
      loadOfflineOrders();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("timpla_admin_offline_orders_updated", handleStorageChange);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("timpla_admin_offline_channel");
      bc.onmessage = () => loadOfflineOrders();
    } catch (e) {}

    checkConnection().then((connected) => {
      wasConnectedRef.current = connected;
      if (!connected && isInitialMount.current) {
        notifyConnectionChange(false);
      }
      isInitialMount.current = false;
    });

    const handleFocus = () => {
      checkConnection().then((connected) => {
        if (wasConnectedRef.current !== connected) {
          wasConnectedRef.current = connected;
          notifyConnectionChange(connected);
        }
      });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("timpla_admin_offline_orders_updated", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      if (bc) bc.close();
    };
  }, [checkConnection, notifyConnectionChange, loadOfflineOrders]);

  return (
    <ConnectionContext.Provider
      value={{
        isOnline,
        isBackendConnected,
        isConnected,
        isChecking,
        lastChecked,
        checkConnection,
        notifyConnectionError,
        isForcedOffline,
        setIsForcedOffline,
        toggleForcedOffline,
        isAdminOfflineMode,
        pendingOfflineOrders,
        saveAdminOfflineOrder,
        syncOfflineAdminOrders,
        clearOfflineAdminOrders,
        isSyncingOfflineOrders,
      }}
    >
      {children}
      <ConnectionBanner />
    </ConnectionContext.Provider>
  );
}

const defaultConnectionContext: ConnectionContextType = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isBackendConnected: true,
  isConnected: typeof navigator !== "undefined" ? navigator.onLine : true,
  isChecking: false,
  lastChecked: null,
  checkConnection: async () => true,
  notifyConnectionError: () => {},
  isForcedOffline: false,
  setIsForcedOffline: () => {},
  toggleForcedOffline: () => {},
  isAdminOfflineMode: typeof navigator !== "undefined" ? !navigator.onLine : false,
  pendingOfflineOrders: [],
  saveAdminOfflineOrder: (_cart: any[], total: number, paymentMethod: "cash" | "gcash" | "counter" = "cash") => ({
    id: `OFFLINE-DEMO`,
    orderNumber: `#OFFLINE-0000`,
    total,
    paymentMethod,
    paymentStatus: "Paid",
    status: "completed",
    createdAt: new Date().toISOString(),
    cart: []
  }),
  syncOfflineAdminOrders: async () => ({ success: 0, failed: 0 }),
  clearOfflineAdminOrders: () => {},
  isSyncingOfflineOrders: false,
};

export function useConnectionStatus() {
  const context = useContext(ConnectionContext);
  if (!context) {
    return defaultConnectionContext;
  }
  return context;
}

/**
 * Top floating connection alert banner shown for Admin and Kiosk.
 */
function ConnectionBanner() {
  const {
    isConnected,
    isChecking,
    checkConnection,
    isAdminOfflineMode,
    isForcedOffline,
    toggleForcedOffline,
    pendingOfflineOrders,
    syncOfflineAdminOrders,
    isSyncingOfflineOrders,
  } = useConnectionStatus();

  const isKioskView = typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "/kiosk");

  if (isKioskView) {
    if (isConnected) return null;
    return (
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-[9999] backdrop-blur-md border-b px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium bg-[#131824]/95 border-[#FF3366]/40 text-[#E2E8F0] shadow-[#FF3366]/15"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#FF3366]"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF3366]"></span>
              </span>

              <WifiOff className="h-4 w-4 text-[#FF3366] shrink-0" />

              <span className="truncate">
                <strong className="text-[#FF3366] font-semibold">Connection Lost:</strong>
                {" "}
                Please order at counter.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => checkConnection()}
                disabled={isChecking}
                className="bg-[#FF3366] hover:bg-[#FF3366]/90 text-white font-medium h-8 px-3 text-xs rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking..." : "Retry"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const showBanner = !isConnected || isForcedOffline || pendingOfflineOrders.length > 0;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`fixed top-0 left-0 right-0 z-[9999] backdrop-blur-md border-b px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
            isForcedOffline
              ? "bg-[#131824]/95 border-amber-500/40 text-amber-200 shadow-amber-500/10"
              : !isConnected
              ? "bg-[#131824]/95 border-[#FF3366]/40 text-[#E2E8F0] shadow-[#FF3366]/15"
              : "bg-[#131824]/95 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="relative flex h-3 w-3 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isForcedOffline ? "bg-amber-400" : !isConnected ? "bg-[#FF3366]" : "bg-emerald-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isForcedOffline ? "bg-amber-400" : !isConnected ? "bg-[#FF3366]" : "bg-emerald-400"
                }`}
              ></span>
            </span>

            {isForcedOffline ? (
              <Zap className="h-4 w-4 text-amber-400 shrink-0" />
            ) : !isConnected ? (
              <WifiOff className="h-4 w-4 text-[#FF3366] shrink-0" />
            ) : (
              <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
            )}

            <span className="truncate">
              {isForcedOffline ? (
                <strong className="text-amber-400 font-semibold">Admin Offline Mode (Manual Toggle):</strong>
              ) : !isConnected ? (
                <strong className="text-[#FF3366] font-semibold">Connection Lost (Offline Mode Active):</strong>
              ) : (
                <strong className="text-emerald-400 font-semibold">Connected:</strong>
              )}
              {" "}
              {pendingOfflineOrders.length > 0
                ? `${pendingOfflineOrders.length} offline order(s) waiting to sync.`
                : isAdminOfflineMode
                ? "Orders will be saved locally."
                : "Server operational."}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingOfflineOrders.length > 0 && isConnected && (
              <Button
                size="sm"
                onClick={() => syncOfflineAdminOrders()}
                disabled={isSyncingOfflineOrders}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-8 px-3 text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className={`h-3.5 w-3.5 ${isSyncingOfflineOrders ? "animate-bounce" : ""}`} />
                {isSyncingOfflineOrders ? "Syncing..." : `Sync (${pendingOfflineOrders.length})`}
              </Button>
            )}

            {!isConnected && (
              <Button
                size="sm"
                onClick={() => checkConnection()}
                disabled={isChecking}
                className="bg-[#FF3366] hover:bg-[#FF3366]/90 text-white font-medium h-8 px-3 text-xs rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking..." : "Retry"}
              </Button>
            )}

            {isForcedOffline && isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={toggleForcedOffline}
                className="border-amber-400/50 text-amber-300 hover:bg-amber-400/20 font-bold h-8 px-3 text-xs rounded-lg cursor-pointer"
              >
                Go Online
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact Connection Badge for rendering inside SiteHeader.tsx or Admin POS status bar.
 * Shows connection status and Admin Offline toggle.
 */
export function ConnectionStatusBadge({ className = "" }: { className?: string }) {
  const {
    isConnected,
    isChecking,
    checkConnection,
    isForcedOffline,
    toggleForcedOffline,
    pendingOfflineOrders,
    syncOfflineAdminOrders,
    isSyncingOfflineOrders,
  } = useConnectionStatus();

  const isKioskView = typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "/kiosk");

  if (isKioskView) {
    if (isConnected) return null;
    return (
      <button
        onClick={() => checkConnection()}
        title="Kiosk is Offline - Self-service checkout disabled"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 hover:bg-[#FF3366]/30 animate-pulse ${className}`}
      >
        {isChecking ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF3366]" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-[#FF3366]" />
        )}
        <span>Kiosk Offline</span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {pendingOfflineOrders.length > 0 && isConnected && (
        <button
          onClick={() => syncOfflineAdminOrders()}
          disabled={isSyncingOfflineOrders}
          title="Click to Sync Offline Admin Orders"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 animate-pulse"
        >
          <UploadCloud className={`h-3.5 w-3.5 ${isSyncingOfflineOrders ? "animate-bounce" : ""}`} />
          <span>Sync ({pendingOfflineOrders.length})</span>
        </button>
      )}

      {isForcedOffline ? (
        <button
          onClick={toggleForcedOffline}
          title="Manual Offline Mode Active - Click to Switch Online"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Offline Mode</span>
        </button>
      ) : !isConnected ? (
        <button
          onClick={() => checkConnection()}
          title="Network Connection Lost - Operating in Offline Mode"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40 hover:bg-[#FF3366]/30 animate-pulse"
        >
          {isChecking ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF3366]" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-[#FF3366]" />
          )}
          <span>Offline</span>
        </button>
      ) : null}
    </div>
  );
}

