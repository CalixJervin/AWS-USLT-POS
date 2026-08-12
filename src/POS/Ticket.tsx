import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Minus, X, Coffee, Store, Zap, WifiOff, AlertTriangle } from "lucide-react"; 
import type { CartItem } from "@/hooks/useCart";
import { useTransactions } from "@/hooks/useTransactions";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { checkDeviceLockout, recordOrderAttempt } from "@/lib/rateLimiter";

interface TicketSidebarProps {
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  onClose?: () => void;
  isKiosk?: boolean;
  onPayAtCounter?: (
    cart: CartItem[], 
    subtotal: number, 
    total: number, 
    paymentMethod?: "counter" | "cash" | "gcash",
    customerDetails?: { customerName?: string; customerEmail?: string; customerPhone?: string }
  ) => Promise<void>;
}

export function TicketSidebar({
  cart,
  updateQty,
  removeFromCart,
  clearCart,
  subtotal,
  total,
  onClose,
  isKiosk = false,
  onPayAtCounter
}: TicketSidebarProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [isClearing, setIsClearing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<"counter" | "cash" | "gcash">(
    isKiosk ? "counter" : "cash"
  );
  const { saveTransaction } = useTransactions();
  const { isConnected, isAdminOfflineMode } = useConnectionStatus();

  // Reset payment method whenever checkout opens or mode changes
  useEffect(() => {
    if (isCheckoutOpen) {
      setPaymentMethod(isKiosk ? "counter" : "cash");
      setAmountReceived("");
      setIsProcessing(false);
    }
  }, [isCheckoutOpen, isKiosk]);

  const change = typeof amountReceived === "number" ? amountReceived - total : 0;
  
  const isSufficient = 
    paymentMethod === "counter" 
      ? true 
      : paymentMethod === "gcash" 
      ? true 
      : (typeof amountReceived === "number" && amountReceived >= total);

  const handleCompleteTransaction = async () => {
    // Lock kiosk checkout if network connection is lost
    if (isKiosk && !isConnected) {
      toast.error("Kiosk System Offline", {
        description: "Self-service checkout is unavailable while offline. Please place your order at the counter.",
        duration: 5000,
        icon: <WifiOff className="h-4 w-4 text-[#FF3366]" />
      });
      return;
    }

    // 0. Stock Overflow Check
    for (const item of cart) {
      const maxAvailable = item.quantity !== undefined ? item.quantity : (item.inStock === false ? 0 : 999);
      if (item.qty > maxAvailable) {
        toast.error(`Cannot complete order: Only ${maxAvailable} left in stock for "${item.name}". Please adjust quantity.`);
        updateQty(item.id, maxAvailable - item.qty);
        return;
      }
    }

    // 1. Device Lockout check (10-minute timeout for 3 rapid orders)
    const lockout = checkDeviceLockout();
    if (lockout.isLocked) {
      toast.error(`Device Lockout: 3 rapid orders detected. Please wait ${lockout.remainingMinutes} minute(s) before placing another order.`);
      return;
    }

    if (isProcessing) return;
    if (!isSufficient) return;

    // 2. Record order attempt & check if 3rd attempt triggers 10-minute lockout
    const attemptResult = recordOrderAttempt();
    if (attemptResult.triggeredLockout) {
      toast.error("Device Lockout: 3 rapid order attempts detected. Your device is timed out for 10 minutes to prevent order flooding.");
      return;
    }

    setIsProcessing(true);

    try {
      if (isKiosk && onPayAtCounter) {
        await onPayAtCounter(cart, subtotal, total, paymentMethod);
        clearCart();
        setIsCheckoutOpen(false);
        if (onClose) onClose();
        return;
      }

      saveTransaction(cart, subtotal, paymentMethod === "counter" ? "cash" : paymentMethod);
      clearCart();
      setIsCheckoutOpen(false);
      setAmountReceived("");
      setPaymentMethod(isKiosk ? "counter" : "cash"); 
      if (onClose) onClose();
    } catch (err) {
      console.error("Error completing transaction:", err);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 10000);
    }
  };

  return (
    <div className="w-full h-full bg-[#131824] flex flex-col shadow-xl z-10 shrink-0 border-l border-[#232A3B]">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-[#232A3B] shrink-0 h-16 bg-[#131824]">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 -ml-2 text-[#94A3B8] hover:text-[#E2E8F0] active:scale-95 touch-manipulation cursor-pointer" 
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          )}
          <h2 className="font-bold text-[15px] text-[#E2E8F0]">Current Order</h2>
        </div>

        {isClearing ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Sure?</span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => { clearCart(); setIsClearing(false); }}
              className="h-8 px-3 text-[10px] font-bold uppercase bg-[#FF3366] text-white hover:bg-[#FF1A96]"
            >
              Yes
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsClearing(false)}
              className="h-8 px-3 text-[10px] font-bold uppercase text-[#94A3B8]"
            >
              No
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => cart.length > 0 && setIsClearing(true)}
            disabled={cart.length === 0}
            className="text-[#FF3366] hover:text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer h-10 px-4 active:scale-95 touch-manipulation text-[13px] font-medium"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 bg-[#0B0E14]">
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
            <div className="bg-[#1E2333] p-6 rounded-full mb-4 border border-[#2D3448]">
              <Coffee className="h-10 w-10 text-[#E6007E]" />
            </div>
            <h3 className="text-[#E2E8F0] text-[14px] font-bold">No items yet</h3>
            <p className="text-[#94A3B8] text-[12px] mt-1">Tap a product to add it to the order</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cart.map((item) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, x: 30, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -30, height: 0, margin: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-2 overflow-hidden bg-[#1E2333] p-3 rounded-xl border border-[#2D3448]"
              >
                <div className="flex items-center gap-3">
                  {/* Product Image / Picture */}
                  <div className="w-12 h-12 rounded-lg bg-[#131824] border border-[#2D3448] overflow-hidden shrink-0 flex items-center justify-center relative">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Coffee className="h-5 w-5 text-[#E6007E]/70" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start text-[#E2E8F0] font-semibold text-[13px] gap-2">
                      <span className="break-words whitespace-normal leading-tight">{item.name}</span>
                      <span className="text-[#E6007E] font-bold shrink-0">₱{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                    {item.size && item.size !== "Regular" && (
                      <span className="text-[11px] text-[#94A3B8] font-medium leading-none mt-1">{item.size}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#232A3B]/60 mt-0.5">
                  <div className="flex items-center border border-[#2D3448] rounded-lg bg-[#131824]">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateQty(item.id, -1)}
                      className="h-8 w-8 rounded-none hover:bg-[#282E42] touch-manipulation text-[#E2E8F0]"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-7 text-center text-xs font-black text-[#00F2FE]">{item.qty}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateQty(item.id, 1)}
                      className="h-8 w-8 rounded-none hover:bg-[#282E42] touch-manipulation text-[#E2E8F0]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFromCart(item.id)}
                    className="h-8 w-8 text-[#64748B] hover:text-[#FF3366] active:scale-95 touch-manipulation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 border-t border-[#232A3B] bg-[#131824] shrink-0 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[#E2E8F0] font-bold text-[16px] gap-2 flex-wrap">
            <span>Total</span>
            <span className="text-[#E6007E] text-2xl font-black">₱{total.toFixed(2)}</span>
          </div>
        </div>
        <div>
          <Button 
            className={`w-full font-black text-[15px] h-12 rounded-[10px] transition-all active:scale-[0.98] touch-manipulation ${
              cart.length === 0 || (isKiosk && !isConnected)
                ? "bg-[#1E2333] text-[#64748B] cursor-not-allowed border border-[#2D3448]" 
                : "bg-[#E6007E] text-white hover:bg-[#FF1A96] border border-[#00F2FE]/30 shadow-[0_0_15px_rgba(0,242,254,0.2)] cursor-pointer"
            }`}
            onClick={() => {
              if (isKiosk && !isConnected) {
                toast.error("Kiosk System Offline", {
                  description: "Self-service checkout is unavailable while offline. Please place your order at the counter.",
                  duration: 5000,
                  icon: <WifiOff className="h-4 w-4 text-[#FF3366]" />
                });
                return;
              }
              setIsCheckoutOpen(true);
            }}
            disabled={cart.length === 0}
          >
            {isKiosk && !isConnected
              ? "Offline - Order at Counter"
              : isKiosk 
              ? `Checkout ₱${total.toFixed(2)}` 
              : `Charge ₱${total.toFixed(2)}`}
          </Button>
        </div>
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md bg-[#1E2333] border-[#2D3448] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#E2E8F0] text-lg font-bold flex items-center justify-between">
              <span>{isKiosk ? "Checkout - Select Payment Method" : "Complete Transaction"}</span>
              {!isKiosk && isAdminOfflineMode && (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" />
                  Offline Mode
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">

            {isKiosk && !isConnected && (
              <div className="bg-[#FF3366]/15 border border-[#FF3366]/40 text-[#E2E8F0] p-3.5 rounded-xl flex items-center gap-3 text-xs font-bold shadow-md">
                <WifiOff className="h-5 w-5 text-[#FF3366] shrink-0" />
                <div>
                  <span className="text-[#FF3366] font-extrabold uppercase block">System Offline</span>
                  <span className="text-[#94A3B8] font-medium text-[11px]">
                    Self-service kiosk checkout is disabled due to network issues. Please order directly at the counter.
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center text-xl font-bold bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
              <span className="text-[#94A3B8]">Total Due:</span>
              <span className="text-[#E6007E] text-2xl font-black">₱{total.toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#131824] rounded-lg border border-[#232A3B]">
                {isKiosk ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setPaymentMethod("counter")}
                      className={`rounded-md cursor-pointer font-bold text-xs ${paymentMethod === "counter" ? "bg-[#E6007E] text-white border border-[#00F2FE]/40 shadow-sm font-black" : "text-[#94A3B8] hover:text-[#E2E8F0]"}`}
                    >
                      Pay at Counter
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        toast.error("Sorry, it is unavailable right now", {
                          description: "GCash payment is currently unavailable. Please select Pay at Counter."
                        });
                        setPaymentMethod("gcash");
                      }}
                      className={`rounded-md cursor-pointer font-bold text-xs relative ${paymentMethod === "gcash" ? "bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/50 font-black" : "text-[#94A3B8] hover:text-[#E2E8F0]"}`}
                    >
                      <div className="flex items-center gap-1">
                        <span>GCash</span>
                        <span className="text-[9px] bg-[#FF3366]/30 text-[#FF3366] px-1 py-0.5 rounded font-mono uppercase font-bold">
                          Unavailable
                        </span>
                      </div>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setPaymentMethod("cash")}
                      className={`rounded-md cursor-pointer font-bold text-xs ${paymentMethod === "cash" ? "bg-[#E6007E] text-white border border-[#00F2FE]/40 shadow-sm font-black" : "text-[#94A3B8] hover:text-[#E2E8F0]"}`}
                    >
                      Cash
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        toast.error("Sorry, it is unavailable right now", {
                          description: "GCash payment is currently unavailable for food & drinks. Please select Cash."
                        });
                        setPaymentMethod("gcash");
                      }}
                      className={`rounded-md cursor-pointer font-bold text-xs relative ${paymentMethod === "gcash" ? "bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/50 font-black" : "text-[#94A3B8] hover:text-[#E2E8F0]"}`}
                    >
                      <div className="flex items-center gap-1">
                        <span>GCash</span>
                        <span className="text-[9px] bg-[#FF3366]/30 text-[#FF3366] px-1 py-0.5 rounded font-mono uppercase font-bold">
                          Unavailable
                        </span>
                      </div>
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {paymentMethod === "counter" ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#131824] p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-[#00F2FE]/40 text-center"
              >
                <Store className="h-8 w-8 text-[#00F2FE]" />
                <span className="font-black text-base text-[#00F2FE]">Pay at Counter (Cash / Split Tender)</span>
                <span className="text-xs text-[#94A3B8]">
                  Clicking confirm will generate your Order Number (e.g. #042) to state at the counter.
                </span>
              </motion.div>
            ) : paymentMethod === "cash" ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider">Amount Received (₱)</label>
                  <Input 
                    type="number" 
                    autoFocus
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : "")}
                    className="text-lg h-12 bg-[#131824] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] focus-visible:ring-[#E6007E]"
                  />
                </div>

                <div className="flex justify-between items-center text-lg bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
                  <span className="text-[#94A3B8]">Change:</span>
                  <span className={`font-bold text-xl ${change < 0 ? "text-[#FF3366]" : "text-[#E6007E]"}`}>
                    ₱{Math.max(0, change).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#131824] p-5 rounded-xl flex flex-col items-center justify-center gap-3 border border-[#FF3366]/40 text-center"
              >
                <div className="p-3 bg-[#FF3366]/10 rounded-full border border-[#FF3366]/30 text-[#FF3366]">
                  <AlertTriangle className="h-8 w-8 text-[#FF3366]" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="font-black text-base text-[#FF3366]">
                    GCash Payment Unavailable
                  </span>
                  <span className="text-xs text-[#94A3B8] max-w-xs font-medium">
                    Sorry, it is unavailable right now. Please pay using {isKiosk ? "Pay at Counter" : "Cash"}.
                  </span>
                </div>
              </motion.div>
            )}

          </div>
          {(() => {
            const lockout = checkDeviceLockout();
            const isLocked = lockout.isLocked;
            const isGcashDisabled = paymentMethod === "gcash";
            return (
              <DialogFooter className="sm:justify-end gap-2">
                <Button 
                  className="cursor-pointer text-[#94A3B8] border-[#2D3448] hover:bg-[#282E42] hover:text-[#E2E8F0]"
                  variant="outline" 
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setAmountReceived("");
                    setPaymentMethod(isKiosk ? "counter" : "cash");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCompleteTransaction}
                  disabled={isProcessing || !isSufficient || isLocked || (isKiosk && !isConnected) || isGcashDisabled}
                  className={`bg-[#E6007E] text-white hover:bg-[#FF1A96] border border-[#00F2FE]/40 font-black px-6 rounded-full shadow-lg transition-all ${
                    isProcessing || !isSufficient || isLocked || (isKiosk && !isConnected) || isGcashDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {isGcashDisabled 
                    ? "Unavailable" 
                    : isKiosk && !isConnected 
                    ? "Kiosk Offline" 
                    : isLocked 
                    ? `Timed Out (${lockout.remainingMinutes}m)` 
                    : isProcessing 
                    ? "Processing..." 
                    : "Confirm Payment"}
                </Button>
              </DialogFooter>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
