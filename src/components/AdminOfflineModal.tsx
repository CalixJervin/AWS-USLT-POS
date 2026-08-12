import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { RefreshCw, Zap, UploadCloud, Trash2, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminOfflineModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminOfflineModal({ isOpen, onOpenChange }: AdminOfflineModalProps) {
  const {
    isConnected,
    isChecking,
    checkConnection,
    isForcedOffline,
    toggleForcedOffline,
    pendingOfflineOrders,
    syncOfflineAdminOrders,
    clearOfflineAdminOrders,
    isSyncingOfflineOrders,
  } = useConnectionStatus();

  const [confirmClear, setConfirmClear] = useState(false);

  const handleSync = async () => {
    await syncOfflineAdminOrders();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#131824] border-[#232A3B] text-[#E2E8F0]">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-[#E2E8F0]">
            <Zap className="h-5 w-5 text-amber-400" />
            <span>Admin Offline Mode & Sync Manager</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#94A3B8]">
            Process sales offline even with bad internet connection. Locally saved admin orders will sync to server database when online.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* STATUS CONTROL CARD */}
          <div className="bg-[#1E2333] p-4 rounded-xl border border-[#2D3448] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isForcedOffline
                        ? "bg-amber-400"
                        : !isConnected
                        ? "bg-[#FF3366]"
                        : "bg-emerald-400"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isForcedOffline
                        ? "bg-amber-400"
                        : !isConnected
                        ? "bg-[#FF3366]"
                        : "bg-emerald-400"
                    }`}
                  ></span>
                </span>
                <span className="text-sm font-bold">
                  Status:{" "}
                  <span
                    className={
                      isForcedOffline
                        ? "text-amber-400"
                        : !isConnected
                        ? "text-[#FF3366]"
                        : "text-emerald-400"
                    }
                  >
                    {isForcedOffline
                      ? "Manual Offline Mode"
                      : !isConnected
                      ? "Disconnected (Auto Offline)"
                      : "Online & Connected"}
                  </span>
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => checkConnection()}
                disabled={isChecking}
                className="h-8 text-xs border-[#2D3448] bg-[#131824] hover:bg-[#232A3B] text-[#E2E8F0] cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                Check
              </Button>
            </div>

            {/* MANUAL FORCE OFFLINE TOGGLE SWITCH */}
            <div className="flex items-center justify-between pt-2 border-t border-[#2D3448]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Force Offline Mode</span>
                <span className="text-[11px] text-[#94A3B8]">
                  Enable when wifi/internet is unstable to ensure instant checkout without waiting for network timeouts.
                </span>
              </div>
              <button
                onClick={toggleForcedOffline}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isForcedOffline ? "bg-amber-500" : "bg-[#2D3448]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isForcedOffline ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* PENDING OFFLINE ORDERS QUEUE SECTION */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Pending Offline Admin Orders ({pendingOfflineOrders.length})
              </span>

              {pendingOfflineOrders.length > 0 && (
                <div className="flex items-center gap-2">
                  {!confirmClear ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmClear(true)}
                      className="h-7 text-[11px] text-[#FF3366] hover:bg-[#FF3366]/10 px-2 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#FF3366] font-bold">Clear queue?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          clearOfflineAdminOrders();
                          setConfirmClear(false);
                        }}
                        className="h-6 text-[10px] px-2 bg-[#FF3366]"
                      >
                        Yes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmClear(false)}
                        className="h-6 text-[10px] px-2 text-[#94A3B8]"
                      >
                        No
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncingOfflineOrders || !isConnected}
                    className={`h-8 text-xs font-bold px-3 rounded-lg flex items-center gap-1.5 ${
                      !isConnected
                        ? "bg-[#2D3448] text-[#64748B] cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shadow-md"
                    }`}
                  >
                    <UploadCloud className={`h-3.5 w-3.5 ${isSyncingOfflineOrders ? "animate-bounce" : ""}`} />
                    {isSyncingOfflineOrders ? "Syncing..." : "Sync All Now"}
                  </Button>
                </div>
              )}
            </div>

            <div className="max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
              {pendingOfflineOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-[#1E2333]/50 rounded-xl border border-[#2D3448] border-dashed">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400/80 mb-1.5" />
                  <span className="text-xs font-bold text-[#E2E8F0]">No Pending Offline Orders</span>
                  <span className="text-[11px] text-[#94A3B8] max-w-xs mt-0.5">
                    All processed sales are synced to the database.
                  </span>
                </div>
              ) : (
                <AnimatePresence>
                  {pendingOfflineOrders.map((ord) => (
                    <motion.div
                      key={ord.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#1E2333] p-3 rounded-xl border border-[#2D3448] flex items-center justify-between gap-3"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-amber-400">{ord.orderNumber}</span>
                          <span className="text-[10px] bg-[#131824] px-2 py-0.5 rounded text-[#94A3B8] uppercase">
                            {ord.paymentMethod}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                          {ord.cart.map((c) => `${c.qty}x ${c.name}`).join(", ")}
                        </span>
                        <span className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-black text-sm text-[#00F2FE]">₱{ord.total.toFixed(2)}</span>
                        <span className="text-[10px] font-semibold text-amber-300/90 bg-amber-400/10 px-2 py-0.5 rounded-full mt-0.5">
                          Pending Sync
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
