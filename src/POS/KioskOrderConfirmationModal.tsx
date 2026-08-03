import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, Coffee } from "lucide-react";
import type { PendingKioskOrder } from "@/hooks/useKioskOrders";

interface KioskOrderConfirmationModalProps {
  order: PendingKioskOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onClearOrder?: () => void;
}

export function KioskOrderConfirmationModal({
  order,
  isOpen,
  onClose,
  onClearOrder,
}: KioskOrderConfirmationModalProps) {
  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          {/* BACKDROP CLICK CLOSES MODAL */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            onClick={onClose}
          />

          {/* MODAL CARD - PERFECTLY CENTERED */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 w-full max-w-lg bg-[#131824] border-2 border-[#00F2FE]/40 text-[#E2E8F0] p-6 sm:p-8 rounded-2xl shadow-[0_0_50px_rgba(0,242,254,0.25)] flex flex-col items-center text-center gap-5 my-auto"
          >
            {/* TOP RIGHT CLOSE ICON */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute right-4 top-4 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1E2333] rounded-full z-20"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Animated Dual Glow Badge */}
            <div className="relative pt-2">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#00F2FE] via-[#E6007E] to-[#00F2FE] rounded-full blur-lg opacity-50 animate-pulse" />
              <div className="relative bg-[#1E2333] p-4 rounded-full border border-[#00F2FE]/40 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-[#00F2FE]" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#E2E8F0] mt-2">
                Thank You for Your Order!
              </h2>
              <p className="text-sm text-[#94A3B8]">
                {order.paymentMethod === "gcash"
                  ? "Please present your Order Number and GCash transfer at the counter."
                  : "Please show or state your Order Number at the counter."}
              </p>
            </div>

            {/* LARGE ORDER NUMBER DISPLAY */}
            <div className="w-full bg-[#1E2333] rounded-2xl p-6 border-2 border-[#00F2FE]/40 shadow-[0_0_30px_rgba(0,242,254,0.2)] flex flex-col items-center justify-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">
                YOUR ORDER NUMBER
              </span>
              <div className="text-5xl sm:text-6xl font-black tracking-tight text-[#00F2FE] drop-shadow-[0_0_20px_rgba(0,242,254,0.6)]">
                {order.orderNumber}
              </div>
              <span className="text-xs text-[#E6007E] font-bold bg-[#E6007E]/10 px-3 py-1 rounded-full border border-[#E6007E]/30 mt-1 uppercase">
                {order.paymentMethod === "gcash" ? "STATUS: UNPAID (GCASH - VERIFY AT COUNTER)" : "STATUS: UNPAID (PAY AT COUNTER)"}
              </span>
            </div>

            {/* ORDER ITEMS SUMMARY */}
            <div className="w-full bg-[#1A1F2C] rounded-xl p-4 border border-[#232A3B] flex flex-col gap-2 max-h-40 overflow-y-auto text-left">
              <div className="flex justify-between items-center text-xs font-bold text-[#94A3B8] border-b border-[#232A3B] pb-2">
                <span>ORDER SUMMARY ({order.cart.reduce((sum, i) => sum + i.qty, 0)} items)</span>
                <span className="text-[#E6007E] font-black">Total: ₱{order.total.toFixed(2)}</span>
              </div>
              {order.cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs text-[#E2E8F0] py-0.5">
                  <div className="w-8 h-8 rounded-lg bg-[#131824] border border-[#232A3B] overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="h-4 w-4 text-[#E6007E]/70" />
                    )}
                  </div>
                  <div className="flex-1 flex justify-between items-center min-w-0">
                    <span className="truncate">
                      <span className="font-bold text-[#00F2FE] mr-1.5">{item.qty}x</span>
                      {item.name} {item.size && item.size !== "Regular" ? `(${item.size})` : ""}
                    </span>
                    <span className="font-semibold text-[#94A3B8] shrink-0 ml-2">
                      ₱{(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* PERSISTENCE NOTE & CLEAR BUTTON */}
            <div className="w-full flex flex-col items-center gap-2 pt-1">
              {onClearOrder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearOrder();
                    onClose();
                  }}
                  className="text-xs text-[#64748B] hover:text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer mt-1"
                >
                  Done / Clear Active Order Number
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
