import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Store, 
  Search, 
  Clock, 
  CheckCircle2, 
  Banknote, 
  QrCode, 
  Split, 
  Trash2, 
  Receipt
} from "lucide-react";
import type { PendingKioskOrder } from "@/hooks/useKioskOrders";
import { motion, AnimatePresence } from "framer-motion";

interface PendingOrdersModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pendingOrders: PendingKioskOrder[];
  onFinalizeOrder: (
    orderId: string,
    paymentMethod: "cash" | "gcash" | "split",
    splitDetails?: { cashAmount: number; secondaryMethod: "gcash"; secondaryAmount: number }
  ) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onClearAllOrders?: () => Promise<void>;
}

export function PendingOrdersModal({
  isOpen,
  onOpenChange,
  pendingOrders,
  onFinalizeOrder,
  onCancelOrder,
  onClearAllOrders,
}: PendingOrdersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PendingKioskOrder | null>(null);

  // Finalization state
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "split">("cash");
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  
  // Split payment state
  const [splitCashAmount, setSplitCashAmount] = useState<number | "">("");
  const [splitSecondaryAmount, setSplitSecondaryAmount] = useState<number | "">("");

  // Filter orders by order number, customer contact info, or item names
  const filteredOrders = pendingOrders.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchesNumber = order.orderNumber.toLowerCase().includes(q);
    const matchesItems = order.cart.some(i => i.name.toLowerCase().includes(q));
    const matchesName = order.customerName?.toLowerCase().includes(q) || false;
    const matchesEmail = order.customerEmail?.toLowerCase().includes(q) || false;
    const matchesPhone = order.customerPhone?.toLowerCase().includes(q) || false;
    return matchesNumber || matchesItems || matchesName || matchesEmail || matchesPhone;
  });

  const handleSelectOrderToFinalize = (order: PendingKioskOrder) => {
    setSelectedOrder(order);
    setPaymentMethod(order.paymentMethod === "gcash" ? "gcash" : "cash");
    setAmountReceived("");
    setSplitCashAmount("");
    setSplitSecondaryAmount("");
  };

  const handleCloseFinalizeStep = () => {
    setSelectedOrder(null);
  };

  const currentTotal = selectedOrder ? selectedOrder.total : 0;
  const change = typeof amountReceived === "number" ? amountReceived - currentTotal : 0;
  
  // Split validation
  const splitCashVal = typeof splitCashAmount === "number" ? splitCashAmount : 0;
  const splitSecVal = typeof splitSecondaryAmount === "number" ? splitSecondaryAmount : 0;
  const splitTotal = splitCashVal + splitSecVal;
  const splitRemaining = Math.max(0, currentTotal - splitTotal);

  const isFinalizeValid = () => {
    if (!selectedOrder) return false;
    if (paymentMethod === "cash") {
      return typeof amountReceived === "number" && amountReceived >= currentTotal;
    }
    if (paymentMethod === "gcash") {
      return true;
    }
    if (paymentMethod === "split") {
      return Math.abs(splitTotal - currentTotal) < 0.01 && splitCashVal > 0 && splitSecVal > 0;
    }
    return false;
  };

  const handleConfirmFinalize = async () => {
    if (!selectedOrder || !isFinalizeValid()) return;

    await onFinalizeOrder(
      selectedOrder.id,
      paymentMethod,
      paymentMethod === "split" ? {
        cashAmount: splitCashVal,
        secondaryMethod: "gcash",
        secondaryAmount: splitSecVal
      } : undefined
    );

    setSelectedOrder(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#131824] border-[#232A3B] text-[#E2E8F0] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        
        {/* MODAL HEADER */}
        <DialogHeader className="p-5 border-b border-[#232A3B] bg-[#1E2333] flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E6007E]/15 border border-[#00F2FE]/40 text-[#00F2FE]">
              <Store className="h-5 w-5 text-[#00F2FE]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-2">
                Pending Kiosk Orders
                <span className="bg-[#E6007E] text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                  {pendingOrders.length}
                </span>
              </DialogTitle>
            </div>
          </div>

          {pendingOrders.length > 0 && onClearAllOrders && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllOrders}
              className="text-xs font-semibold text-[#64748B] hover:text-[#FF3366] hover:bg-[#FF3366]/10 mr-6"
            >
              Clear All Pending
            </Button>
          )}
        </DialogHeader>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-[#0B0E14] flex flex-col gap-4">
          
          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94A3B8] pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by order number (e.g. #042)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B] rounded-xl focus-visible:ring-[#E6007E]"
            />
          </div>

          {/* ORDERS LIST */}
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[#94A3B8]">
              <Receipt className="h-12 w-12 text-[#2D3448] mb-3" />
              <p className="font-bold text-sm text-[#E2E8F0]">No Pending Orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#1E2333] border border-[#2D3448] hover:border-[#00F2FE]/50 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all group"
                  >
                    {/* CARD HEADER */}
                    <div className="flex items-start justify-between border-b border-[#2D3448] pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-2xl font-black text-[#00F2FE] tracking-tight drop-shadow-[0_0_10px_rgba(0,242,254,0.3)]">
                            {order.orderNumber}
                          </div>
                          {order.paymentMethod === "gcash" && (
                            <span className="bg-[#E6007E]/20 text-[#E6007E] border border-[#E6007E]/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <QrCode className="h-3 w-3" /> GCash
                            </span>
                          )}
                          {(order.fulfillmentStatus === "pre_ordered" || order.cart.some(i => i.isPreOrder)) && (
                            <span className="bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/50 text-[10px] font-black px-2 py-0.5 rounded-full">
                              PRE-ORDER
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] mt-0.5">
                          <Clock className="h-3 w-3 text-[#E6007E]" />
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        {(order.customerName || order.customerPhone || order.customerEmail) && (
                          <div className="mt-2 bg-[#131824] p-2 rounded-lg border border-[#232A3B] text-[11px] text-[#E2E8F0]">
                            {order.customerName && <div className="font-bold text-[#00F2FE]">{order.customerName}</div>}
                            <div className="text-[10px] text-[#94A3B8] flex gap-2 flex-wrap">
                              {order.customerPhone && <span>📞 {order.customerPhone}</span>}
                              {order.customerEmail && <span>✉️ {order.customerEmail}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#94A3B8] font-medium block">Total Due</span>
                        <span className="text-lg font-black text-[#E6007E]">
                          ₱{order.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* ITEMS SUMMARY */}
                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto text-xs py-1">
                      {order.cart.map((item) => (
                        <div key={item.id} className="flex justify-between text-[#E2E8F0]">
                          <span className="truncate max-w-[180px]">
                            <span className="font-bold text-[#00F2FE] mr-1">{item.qty}x</span>
                            {item.name}
                          </span>
                          <span className="text-[#94A3B8] font-semibold">
                            ₱{(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#2D3448]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelOrder(order.id)}
                        className="h-9 text-xs font-semibold text-[#64748B] hover:text-[#FF3366] hover:bg-[#FF3366]/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSelectOrderToFinalize(order)}
                        className="flex-1 h-9 text-xs font-black bg-[#E6007E] text-white hover:bg-[#FF1A96] border border-[#00F2FE]/30 rounded-lg shadow-[0_0_12px_rgba(0,242,254,0.2)] cursor-pointer active:scale-95 transition-transform"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1 text-[#00F2FE]" />
                        Finalize Payment
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </DialogContent>

      {/* FINALIZATION STEP MODAL */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && handleCloseFinalizeStep()}>
          <DialogContent className="sm:max-w-md bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] p-6 rounded-2xl">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-[#2D3448] pb-3">
              <div>
                <DialogTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-2">
                  Finalize Payment for <span className="text-[#00F2FE]">{selectedOrder.orderNumber}</span>
                </DialogTitle>
                <p className="text-xs text-[#94A3B8]">Select tender method to process transaction</p>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-5 py-3">
              {/* TOTAL DISPLAY */}
              <div className="flex justify-between items-center text-xl font-bold bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
                <span className="text-[#94A3B8] text-sm font-bold uppercase">Total Due:</span>
                <span className="text-[#E6007E] text-2xl font-black">
                  ₱{selectedOrder.total.toFixed(2)}
                </span>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-[#94A3B8] tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#131824] rounded-xl border border-[#232A3B]">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex flex-col items-center justify-center py-2 h-auto rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === "cash"
                        ? "bg-[#E6007E] text-white font-black shadow-md border border-[#00F2FE]/30"
                        : "text-[#94A3B8] hover:text-[#E2E8F0]"
                    }`}
                  >
                    <Banknote className="h-4 w-4 mb-1 text-[#00F2FE]" />
                    Cash
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentMethod("gcash")}
                    className={`flex flex-col items-center justify-center py-2 h-auto rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === "gcash"
                        ? "bg-[#E6007E] text-white font-black shadow-md border border-[#00F2FE]/30"
                        : "text-[#94A3B8] hover:text-[#E2E8F0]"
                    }`}
                  >
                    <QrCode className="h-4 w-4 mb-1 text-[#00F2FE]" />
                    GCash
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPaymentMethod("split");
                      // Pre-fill split halves
                      const half = Math.round((selectedOrder.total / 2) * 100) / 100;
                      setSplitCashAmount(half);
                      setSplitSecondaryAmount(selectedOrder.total - half);
                    }}
                    className={`flex flex-col items-center justify-center py-2 h-auto rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === "split"
                        ? "bg-[#E6007E] text-white font-black shadow-md border border-[#00F2FE]/30"
                        : "text-[#94A3B8] hover:text-[#E2E8F0]"
                    }`}
                  >
                    <Split className="h-4 w-4 mb-1 text-[#00F2FE]" />
                    Split
                  </Button>
                </div>
              </div>

              {/* TENDER DETAILS BASED ON METHOD */}
              {paymentMethod === "cash" && (
                <div className="flex flex-col gap-4 bg-[#131824] p-4 rounded-xl border border-[#232A3B]">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase">
                      Amount Received (₱)
                    </label>
                    <Input
                      type="number"
                      autoFocus
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : "")}
                      className="text-xl font-bold h-12 bg-[#1E2333] border-[#2D3448] text-[#00F2FE] placeholder:text-[#64748B] focus-visible:ring-[#E6007E]"
                    />
                  </div>

                  {/* QUICK CASH SHORTCUT BUTTONS */}
                  <div className="flex items-center gap-2">
                    {[selectedOrder.total, 100, 200, 500, 1000].map((val) => (
                      <Button
                        key={val}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmountReceived(val)}
                        className="flex-1 text-xs font-bold bg-[#1E2333] border-[#2D3448] hover:border-[#00F2FE] hover:text-[#00F2FE]"
                      >
                        {val === selectedOrder.total ? "Exact" : `₱${val}`}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[#232A3B]">
                    <span className="text-[#94A3B8]">Change Due:</span>
                    <span className={`font-black text-lg ${change < 0 ? "text-[#FF3366]" : "text-[#00F2FE]"}`}>
                      ₱{Math.max(0, change).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === "gcash" && (
                <div className="bg-[#131824] p-4 rounded-xl flex flex-col items-center justify-center gap-2 border border-[#E6007E]/30 text-center">
                  <QrCode className="h-8 w-8 text-[#00F2FE]" />
                  <span className="font-black text-lg text-[#E6007E]">
                    GCash Payment: ₱{selectedOrder.total.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#94A3B8]">
                    Verify the GCash payment receipt or QR confirmation on terminal.
                  </span>
                </div>
              )}

              {paymentMethod === "split" && (
                <div className="flex flex-col gap-3 bg-[#131824] p-4 rounded-xl border border-[#E6007E]/30">
                  <div className="text-xs font-bold uppercase text-[#E6007E]">
                    Split Tender Breakdown (Cash + GCash)
                  </div>

                  {/* Tender 1: Cash */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#94A3B8] w-20">1. Cash:</span>
                    <Input
                      type="number"
                      placeholder="Cash Amount"
                      value={splitCashAmount}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setSplitCashAmount(val);
                        if (typeof val === "number") {
                          setSplitSecondaryAmount(Math.max(0, currentTotal - val));
                        }
                      }}
                      className="h-10 bg-[#1E2333] border-[#2D3448] text-xs text-[#00F2FE] font-semibold"
                    />
                  </div>

                  {/* Tender 2: GCash */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#94A3B8] w-20">2. GCash:</span>
                    <Input
                      type="number"
                      placeholder="GCash Amount"
                      value={splitSecondaryAmount}
                      onChange={(e) => setSplitSecondaryAmount(e.target.value ? Number(e.target.value) : "")}
                      className="h-10 bg-[#1E2333] border-[#2D3448] text-xs text-[#E6007E] font-semibold"
                    />
                  </div>

                  {/* Split Summary */}
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-[#232A3B]">
                    <span className="text-[#94A3B8]">Remaining Unallocated:</span>
                    <span className={`font-bold ${splitRemaining > 0 ? "text-[#FF3366]" : "text-[#00F2FE]"}`}>
                      ₱{splitRemaining.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleCloseFinalizeStep}
                className="border-[#2D3448] text-[#94A3B8] hover:bg-[#282E42] hover:text-[#E2E8F0]"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmFinalize}
                disabled={!isFinalizeValid()}
                className="bg-[#E6007E] text-white hover:bg-[#FF1A96] font-black px-6 rounded-full shadow-lg border border-[#00F2FE]/30 cursor-pointer"
              >
                Complete Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
