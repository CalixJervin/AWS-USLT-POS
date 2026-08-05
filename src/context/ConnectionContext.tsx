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
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface ConnectionContextType {
  isOnline: boolean;
  isBackendConnected: boolean;
  isConnected: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<boolean>;
  notifyConnectionError: (customMessage?: string) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

const TOAST_ID = "connection-status-toast";

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Keep track of whether we've notified of initial status
  const isInitialMount = useRef<boolean>(true);
  const wasConnectedRef = useRef<boolean>(true);

  const isConnected = isOnline && isBackendConnected;

  // Check connectivity to Supabase backend
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);

    // 1. Check browser network state first
    if (!navigator.onLine) {
      setIsOnline(false);
      setIsBackendConnected(false);
      setIsChecking(false);
      setLastChecked(new Date());
      return false;
    }

    setIsOnline(true);

    // 2. Ping Supabase REST endpoint with abort signal timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

      const { error } = await supabase
        .from("app_settings")
        .select("key")
        .limit(1)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      // PostgREST 404 or PGRST116 means backend answered
      const isSuccess = !error || error.code === "PGRST116" || error.code === "PGRST204";

      if (isSuccess) {
        setIsBackendConnected(true);
        setLastChecked(new Date());
        setIsChecking(false);
        return true;
      } else {
        console.warn("[Connection Check] Supabase returned error:", error);
        setIsBackendConnected(false);
        setLastChecked(new Date());
        setIsChecking(false);
        return false;
      }
    } catch (err: any) {
      console.warn("[Connection Check] Backend connection check failed:", err?.message || err);
      setIsBackendConnected(false);
      setLastChecked(new Date());
      setIsChecking(false);
      return false;
    }
  }, []);

  // Trigger toast alerts when connection status changes
  const notifyConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      // Connection restored
      toast.dismiss(TOAST_ID);
      toast.success("Connection Restored", {
        id: "connection-restored-toast",
        description: "Server and database connection re-established.",
        duration: 4000,
        icon: <Wifi className="h-4 w-4 text-emerald-400" />,
      });
    } else {
      // Connection failed
      toast.dismiss(TOAST_ID);
      toast.error("Connection Failed", {
        id: TOAST_ID,
        description: "Unable to connect to the backend server. Real-time sync and database updates may be unavailable.",
        duration: Infinity, // Keep toast open until reconnected
        icon: <WifiOff className="h-4 w-4 text-[#FF3366]" />,
        action: {
          label: "Retry",
          onClick: () => {
            checkConnection();
          },
        },
      });
    }
  }, [checkConnection]);

  // Explicit helper to trigger custom network failure notification
  const notifyConnectionError = useCallback((customMessage?: string) => {
    toast.error("Network Error", {
      description: customMessage || "Action failed due to network connection issues. Please check your connection and retry.",
      duration: 6000,
      icon: <AlertTriangle className="h-4 w-4 text-[#FF3366]" />,
      action: {
        label: "Check Connection",
        onClick: () => checkConnection(),
      },
    });
    checkConnection();
  }, [checkConnection]);

  // Initial connection check on mount & setting up listeners
  useEffect(() => {
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

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    checkConnection().then((connected) => {
      wasConnectedRef.current = connected;
      if (!connected && isInitialMount.current) {
        notifyConnectionChange(false);
      }
      isInitialMount.current = false;
    });

    // Periodic ping health check every 20 seconds
    const interval = setInterval(() => {
      checkConnection().then((connected) => {
        if (wasConnectedRef.current !== connected) {
          wasConnectedRef.current = connected;
          notifyConnectionChange(connected);
        }
      });
    }, 20000);

    // Also re-check when tab regains focus
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
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [checkConnection, notifyConnectionChange]);

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
      }}
    >
      {children}
      <ConnectionBanner />
    </ConnectionContext.Provider>
  );
}

export function useConnectionStatus() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnectionStatus must be used within a ConnectionProvider");
  }
  return context;
}

/**
 * Top floating connection alert banner shown for both Kiosk and Admin POS when connection fails.
 */
function ConnectionBanner() {
  const { isConnected, isChecking, checkConnection } = useConnectionStatus();

  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-[#131824]/95 backdrop-blur-md border-b border-[#FF3366]/40 text-[#E2E8F0] px-4 py-2.5 shadow-2xl shadow-[#FF3366]/15 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3366] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF3366]"></span>
            </span>
            <WifiOff className="h-4 w-4 text-[#FF3366] shrink-0" />
            <span className="truncate">
              <strong className="text-[#FF3366] font-semibold">Connection Lost:</strong>
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => checkConnection()}
            disabled={isChecking}
            className="shrink-0 bg-[#FF3366] hover:bg-[#FF3366]/90 text-white font-medium h-8 px-3 text-xs rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking..." : "Retry Connection"}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact Connection Badge for rendering inside SiteHeader.tsx or Admin POS status bar.
 * Stays hidden when online, and automatically appears ONLY when an actual internet connection problem occurs.
 */
export function ConnectionStatusBadge({ className = "" }: { className?: string }) {
  const { isConnected, isChecking, checkConnection } = useConnectionStatus();

  // Completely hide indicator whenever connection is normal/online
  if (isConnected) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2 }}
          onClick={() => checkConnection()}
          title="Connection Problem - Click to Retry"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border bg-[#FF3366]/15 text-[#FF3366] border-[#FF3366]/30 hover:bg-[#FF3366]/25 animate-pulse ${className}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3366] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3366]"></span>
          </span>

          {isChecking ? (
            <RefreshCw className="h-3 w-3 animate-spin text-[#FF3366]" />
          ) : (
            <WifiOff className="h-3 w-3 text-[#FF3366]" />
          )}

          <span>Offline</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
