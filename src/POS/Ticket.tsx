import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Minus, X, Coffee } from "lucide-react"; 
import type { CartItem } from "@/hooks/useCart";
import { useTransactions } from "@/hooks/useTransactions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface TicketSidebarProps {
  cart: CartItem[];
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  onClose?: () => void;
}

export function TicketSidebar({
  cart,
  updateQty,
  removeFromCart,
  clearCart,
  subtotal,
  total,
  onClose
}: TicketSidebarProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [isClearing, setIsClearing] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const { saveTransaction } = useTransactions();

  const change = typeof amountReceived === "number" ? amountReceived - total : 0;
  
  const isSufficient = paymentMethod === "gcash" ? true : (typeof amountReceived === "number" && amountReceived >= total);

  const handleCompleteTransaction = () => {
    if (isSufficient) {
      saveTransaction(cart, subtotal, paymentMethod);
      clearCart();
      setIsCheckoutOpen(false);
      setAmountReceived("");
      setPaymentMethod("cash"); 
      if (onClose) onClose();
    }
  };

  return (
    <div className="w-full lg:w-[350px] border-l border-[#CEC3B4] bg-[#E2D9CC] flex flex-col h-full shadow-xl z-10 shrink-0">
      
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-[#CEC3B4] shrink-0 h-16">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden h-11 w-11 -ml-2 text-muted-foreground hover:text-foreground active:scale-95 touch-manipulation" 
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          )}
          <h2 className="font-bold text-[15px] text-[#1C1412]">Current Order</h2>
        </div>

        {isClearing ? (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
            <span className="text-[10px] font-bold text-[#6B5B4E] uppercase">Sure?</span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => { clearCart(); setIsClearing(false); }}
              className="h-8 px-3 text-[10px] font-bold uppercase"
            >
              Yes
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsClearing(false)}
              className="h-8 px-3 text-[10px] font-bold uppercase text-[#6B5B4E]"
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
            className="text-[#C0392B] hover:text-[#C0392B] hover:bg-[#C0392B]/10 cursor-pointer h-10 px-4 active:scale-95 touch-manipulation text-[13px] font-medium"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
            <div className="bg-[#D9D0C3] p-6 rounded-full mb-4">
              <Coffee className="h-10 w-10 text-[#C4B5A5]" />
            </div>
            <h3 className="text-[#9E8E7E] text-[14px] font-bold">No items yet</h3>
            <p className="text-[#B5A699] text-[12px] mt-1">Tap a product to add it to the order</p>
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
                className="flex flex-col gap-2 overflow-hidden"
              >
                <div className="flex justify-between text-[#1C1412] font-semibold pt-2 text-[14px] gap-2 flex-wrap">
                  <span>{item.name}</span>
                  <span>₱{(item.price * item.qty).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3 pb-2 border-b border-[#CEC3B4]/50">
                  <div className="flex items-center border border-[#CEC3B4] rounded-lg bg-[#D9D0C3]/50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateQty(item.id, -1)}
                      className="h-10 w-10 rounded-none active:bg-[#CEC3B4] touch-manipulation text-[#1C1412]"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold text-[#1C1412]">{item.qty}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateQty(item.id, 1)}
                      className="h-10 w-10 rounded-none active:bg-[#CEC3B4] touch-manipulation text-[#1C1412]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFromCart(item.id)}
                    className="h-10 w-10 text-[#9E8E7E] hover:text-[#C0392B] active:scale-95 touch-manipulation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 border-t border-[#CEC3B4] bg-[#D9D0C3] shrink-0 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[#1C1412] font-bold text-[16px] gap-2 flex-wrap">
            <span>Total</span>
            <span>₱{total.toFixed(2)}</span>
          </div>
        </div>
        <div>
          <Button 
            className={`w-full font-bold text-[15px] h-12 rounded-[8px] transition-all active:scale-[0.98] touch-manipulation ${
              cart.length === 0 
                ? "bg-[#C4B5A5] text-[#9E8E7E] cursor-not-allowed pointer-events-none" 
                : "bg-[#1C1412] text-white hover:bg-[#2C2018]"
            }`}
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
          >
            Charge ₱{total.toFixed(2)}
          </Button>
        </div>
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Transaction</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Due:</span>
              <span>₱{total.toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant="ghost"
                  onClick={() => setPaymentMethod("cash")}
                  className={`rounded-md cursor-pointer ${paymentMethod === "cash" ? "bg-background shadow-sm hover:bg-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Cash
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPaymentMethod("gcash")}
                  className={`rounded-md cursor-pointer ${paymentMethod === "gcash" ? "bg-[#007DFE] text-white hover:bg-[#007DFE]/90 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  GCash
                </Button>
              </div>
            </div>
            
            {paymentMethod === "cash" ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Amount Received (₱)</label>
                  <Input 
                    type="number" 
                    autoFocus
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : "")}
                    className="text-lg h-12"
                  />
                </div>

                <div className="flex justify-between items-center text-lg">
                  <span className="text-muted-foreground">Change:</span>
                  <span className={`font-semibold ${change < 0 ? "text-destructive" : "text-green-600"}`}>
                    ₱{Math.max(0, change).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg flex flex-col items-center justify-center gap-2 border border-blue-200 dark:border-blue-900"
              >
                <span className="font-bold text-xl text-[#007DFE]">Exact Amount: ₱{total.toFixed(2)}</span>
                <span className="text-sm text-center text-muted-foreground">Please verify the GCash transfer on your device before confirming.</span>
              </motion.div>
            )}

          </div>
          <DialogFooter className="sm:justify-end">
            <Button 
              className="cursor-pointer"
              variant="outline" 
              onClick={() => {
                setIsCheckoutOpen(false);
                setAmountReceived("");
                setPaymentMethod("cash");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteTransaction}
              disabled={!isSufficient}
              className={paymentMethod === "gcash" ? "bg-[#007DFE] text-white hover:bg-[#007DFE]/90 cursor-pointer" : "cursor-pointer"}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
