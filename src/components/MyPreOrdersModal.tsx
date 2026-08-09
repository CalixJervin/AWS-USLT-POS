import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Trash2, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useGCashSettings } from "@/hooks/useGCashSettings";
import { supabase } from "@/lib/supabase";

export interface MyPreOrder {
  id: string;
  orderNumber: string;
  itemName: string;
  price: number;
  size?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: "cash" | "gcash" | "pay_later";
  paymentStatus: "Unpaid" | "Pending Verification" | "Paid" | "Cash Pending";
  gcashRefNumber?: string;
  createdAt: string;
}

const MY_PREORDERS_KEY = "timpla_my_saved_preorders";

export function useMyPreOrders() {
  const [orders, setOrders] = useState<MyPreOrder[]>(() => {
    try {
      const saved = localStorage.getItem(MY_PREORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const reloadOrders = () => {
    try {
      const saved = localStorage.getItem(MY_PREORDERS_KEY);
      setOrders(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setOrders([]);
    }
  };

  const checkRemoteValidity = useCallback(async () => {
    try {
      const saved = localStorage.getItem(MY_PREORDERS_KEY);
      if (!saved) return;
      const localList: MyPreOrder[] = JSON.parse(saved);
      if (localList.length === 0) return;

      const dbIds = localList.map(o => o.id).filter(id => !id.startsWith("preorder-"));
      if (dbIds.length === 0) return;

      const { data: dbOrders, error } = await supabase.rpc("verify_my_preorders", {
        p_order_ids: dbIds
      });

      if (error) {
        // Do not purge local preorders if DB query encounters an error
        return;
      }

      if (dbOrders) {
        const validDbIds = new Set((dbOrders as Array<{ id: string; order_number?: string }>).map(d => d.id));
        const validDbNums = new Set<string>();
        (dbOrders as Array<{ id: string; order_number?: string }>).forEach(d => {
          if (d.order_number) {
            validDbNums.add(d.order_number);
            validDbNums.add(d.order_number.replace(/^#/, ''));
            validDbNums.add(`#${d.order_number.replace(/^#/, '')}`);
          }
        });

        const updated = localList.filter(o => {
          // Always keep local preorders with temporary IDs
          if (o.id && o.id.startsWith("preorder-")) return true;
          if (validDbIds.has(o.id)) return true;
          if (o.orderNumber && (validDbNums.has(o.orderNumber) || validDbNums.has(o.orderNumber.replace(/^#/, '')))) return true;
          return false;
        });

        if (updated.length !== localList.length) {
          localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updated));
          setOrders(updated);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      reloadOrders();
      checkRemoteValidity();
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("timpla_my_preorders_updated", handleUpdate);
    checkRemoteValidity();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("timpla_my_preorders_channel");
      bc.onmessage = (msg) => {
        if (msg.data?.type === "ALL_PREORDERS_CLEARED") {
          localStorage.removeItem(MY_PREORDERS_KEY);
          setOrders([]);
        } else if (msg.data?.type === "PREORDER_DELETED" || msg.data?.type === "PREORDER_CANCELLED") {
          const targetIds: string[] = msg.data.orderIds || (msg.data.orderId ? [msg.data.orderId] : []);
          const targetNums: string[] = msg.data.orderNumbers || (msg.data.orderNumber ? [msg.data.orderNumber] : []);

          const saved = localStorage.getItem(MY_PREORDERS_KEY);
          if (saved) {
            const existing: MyPreOrder[] = JSON.parse(saved);
            const updated = existing.filter(o => 
              !targetIds.includes(o.id) && 
              !(o.orderNumber && targetNums.includes(o.orderNumber))
            );
            localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updated));
            setOrders(updated);
          }
        } else {
          reloadOrders();
          checkRemoteValidity();
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("timpla_my_preorders_updated", handleUpdate);
      if (bc) bc.close();
    };
  }, [checkRemoteValidity]);

  const saveMyPreOrder = (newOrder: MyPreOrder) => {
    try {
      const saved = localStorage.getItem(MY_PREORDERS_KEY);
      const existing: MyPreOrder[] = saved ? JSON.parse(saved) : [];
      const updated = [newOrder, ...existing.filter(o => o.id !== newOrder.id && o.orderNumber !== newOrder.orderNumber)];
      localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updated));
      setOrders(updated);
      
      window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      try {
        const bc = new BroadcastChannel("timpla_my_preorders_channel");
        bc.postMessage({ type: "PREORDER_SAVED" });
        bc.close();
      } catch (e) {}
    } catch (e) {
      console.error("Error saving my pre-order:", e);
    }
  };

  const cancelMyPreOrder = async (orderId: string, orderNumber: string) => {
    try {
      // 1. Remove from my saved preorders
      const saved = localStorage.getItem(MY_PREORDERS_KEY);
      if (saved) {
        const existing: MyPreOrder[] = JSON.parse(saved);
        const updated = existing.filter(o => o.id !== orderId && o.orderNumber !== orderNumber);
        localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updated));
        setOrders(updated);
      }

      // 2. Remove from pending kiosk orders in localStorage
      const kioskSaved = localStorage.getItem("timpla_kiosk_pending_orders");
      if (kioskSaved) {
        const existingKiosk: any[] = JSON.parse(kioskSaved);
        const updatedKiosk = existingKiosk.filter(o => o.id !== orderId && o.orderNumber !== orderNumber);
        localStorage.setItem("timpla_kiosk_pending_orders", JSON.stringify(updatedKiosk));
      }

      // 3. Remove from Supabase orders table via secure RPC function
      const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
      const targetUuid = isValidUuid(orderId) ? orderId : null;

      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("cancel_kiosk_order", {
          p_order_id: targetUuid,
          p_order_number: orderNumber
        });
        if (rpcErr || !rpcRes) {
          if (orderNumber) {
            const numWithHash = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
            const numClean = orderNumber.replace(/^#/, "");
            await supabase.from("orders").delete().or(`order_number.eq.${numWithHash},order_number.eq.${numClean}`);
          }
          if (targetUuid) {
            await supabase.from("orders").delete().eq("id", targetUuid);
          }
        }
      } catch (e) {}

      // Broadcast changes so Data Table and all open tabs immediately update
      window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      window.dispatchEvent(new Event("storage"));
      try {
        const bc1 = new BroadcastChannel("timpla_kiosk_channel");
        bc1.postMessage({ type: "SYNC_PENDING_ORDERS", action: "DELETE", orderId, orderNumber });
        bc1.close();

        const bc2 = new BroadcastChannel("timpla_my_preorders_channel");
        bc2.postMessage({ type: "PREORDER_CANCELLED", orderId, orderNumber });
        bc2.close();
      } catch (e) {}

      toast.success(`Pre-order ${orderNumber} has been cancelled.`);
    } catch (e) {
      console.error("Error cancelling pre-order:", e);
      toast.error("Failed to cancel pre-order.");
    }
  };

  const updatePaymentInfo = (orderNumber: string, refNumber: string) => {
    try {
      const saved = localStorage.getItem(MY_PREORDERS_KEY);
      if (!saved) return;
      const existing: MyPreOrder[] = JSON.parse(saved);
      const updated = existing.map(o => {
        if (o.orderNumber === orderNumber || o.id === orderNumber) {
          return {
            ...o,
            paymentMethod: "gcash" as const,
            paymentStatus: "Pending Verification" as const,
            gcashRefNumber: refNumber
          };
        }
        return o;
      });
      localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updated));
      setOrders(updated);

      // Also update in pending kiosk orders
      const kioskSaved = localStorage.getItem("timpla_kiosk_pending_orders");
      if (kioskSaved) {
        const existingKiosk: any[] = JSON.parse(kioskSaved);
        const updatedKiosk = existingKiosk.map(o => {
          if (o.orderNumber === orderNumber || o.id === orderNumber) {
            return {
              ...o,
              paymentMethod: "gcash",
              paymentStatus: "Pending Verification",
              gcashRefNumber: refNumber
            };
          }
          return o;
        });
        localStorage.setItem("timpla_kiosk_pending_orders", JSON.stringify(updatedKiosk));
      }

      window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      window.dispatchEvent(new Event("storage"));
      toast.success(`Payment reference submitted for ${orderNumber}!`);
    } catch (e) {
      toast.error("Failed to update payment.");
    }
  };

  return { orders, saveMyPreOrder, cancelMyPreOrder, updatePaymentInfo, reloadOrders };
}

interface MyPreOrdersModalButtonProps {
  buttonClassName?: string;
}

export function MyPreOrdersModalButton({ buttonClassName }: MyPreOrdersModalButtonProps) {
  const { orders, cancelMyPreOrder, updatePaymentInfo } = useMyPreOrders();
  const gcashSettings = useGCashSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [refInputMap, setRefInputMap] = useState<Record<string, string>>({});

  if (orders.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName || "h-9 sm:h-11 px-3 sm:px-4 bg-[#1E2333] hover:bg-[#282E42] border border-[#00F2FE]/40 text-[#00F2FE] rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all shrink-0"}
      >
        <Package className="h-4 w-4 text-[#E6007E]" />
        <Badge className="bg-[#E6007E] text-white text-[10px] font-black h-4 min-w-4 px-1.5 flex items-center justify-center rounded-full">
          {orders.length}
        </Badge>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] p-0 overflow-hidden">
          <DialogHeader className="p-5 bg-[#131824] border-b border-[#232A3B] flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E6007E]/20 border border-[#E6007E]/40 text-[#E6007E]">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-[#E2E8F0] flex items-center gap-2">
                  My Pre-Orders
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="p-4 flex flex-col gap-3 bg-[#0B0E14] max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* SMALL INFORMATIONAL PAYMENT WARNING (NON-BLOCKING) */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Note: Failure to submit payment on time will result in your order being cancelled.</span>
            </div>

            {orders.map((ord) => {
              const isPayLater = ord.paymentMethod === "pay_later" || ord.paymentStatus === "Unpaid";
              const isPayingThis = payingOrderId === ord.id;
              const currentRefInput = refInputMap[ord.id] || "";

              return (
                <div key={ord.id} className="bg-[#131824] border border-[#232A3B] rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#232A3B] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-[#94A3B8]">Ticket</span>
                      <span className="text-base font-black text-[#00F2FE] tracking-wider">{ord.orderNumber}</span>
                    </div>

                    {isPayLater ? (
                      <Badge className="bg-[#FF9900]/20 border border-[#FF9900]/50 text-[#FF9900] text-[10px] font-black uppercase">
                        Unpaid (Pay Later)
                      </Badge>
                    ) : ord.paymentStatus === "Pending Verification" ? (
                      <Badge className="bg-[#00F2FE]/20 border border-[#00F2FE]/50 text-[#00F2FE] text-[10px] font-black uppercase">
                        Verification Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-[#00E676]/20 border border-[#00E676]/50 text-[#00E676] text-[10px] font-black uppercase">
                        {ord.paymentStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-start text-xs">
                    <div>
                      <div className="font-bold text-[#E2E8F0] text-sm">{ord.itemName}</div>
                      {ord.size && <div className="text-[11px] text-[#94A3B8]">Size: <span className="text-[#00F2FE] font-bold">{ord.size}</span></div>}
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Customer: {ord.customerName} ({ord.customerPhone || ord.customerEmail})
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-[#E6007E]">₱{ord.price.toFixed(2)}</div>
                      <div className="text-[10px] text-[#64748B] mt-0.5">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* PAY NOW SECTION FOR PAY LATER ORDERS */}
                  {isPayLater && (
                    <div className="mt-1 pt-3 border-t border-[#232A3B] flex flex-col gap-2">
                      {!isPayingThis ? (
                        <Button
                          type="button"
                          onClick={() => setPayingOrderId(ord.id)}
                          className="w-full bg-[#00F2FE]/20 hover:bg-[#00F2FE]/30 border border-[#00F2FE]/50 text-[#00F2FE] font-bold text-xs h-9 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay Now via GCash
                        </Button>
                      ) : (
                        <div className="bg-[#1E2333] p-3 rounded-xl border border-[#00F2FE]/40 flex flex-col gap-3">
                          <div className="text-center">
                            <div className="text-[11px] font-bold text-[#94A3B8] uppercase">GCash Account Number</div>
                            <div className="text-sm font-black text-[#00F2FE] tracking-wider">{gcashSettings.gcashNumber}</div>
                            {gcashSettings.gcashQrImage && (
                              <img
                                src={gcashSettings.gcashQrImage}
                                alt="GCash QR Code"
                                className="w-32 h-32 object-contain rounded-lg border border-[#00F2FE]/40 bg-white p-1 my-2 mx-auto"
                              />
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#E2E8F0]">
                              Enter GCash Reference Number <span className="text-[#FF3366]">*</span>
                            </label>
                            <Input
                              type="text"
                              placeholder="13-digit Reference #"
                              value={currentRefInput}
                              onChange={(e) => setRefInputMap(prev => ({ ...prev, [ord.id]: e.target.value }))}
                              className="h-9 text-base bg-[#131824] border-[#2D3448] text-[#E2E8F0] placeholder:text-[#64748B]"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setPayingOrderId(null)}
                              className="flex-1 text-xs text-[#94A3B8] h-8"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              disabled={!currentRefInput.trim()}
                              onClick={() => {
                                updatePaymentInfo(ord.orderNumber, currentRefInput.trim());
                                setPayingOrderId(null);
                              }}
                              className="flex-1 bg-[#00F2FE] hover:bg-[#00D8E4] text-[#0B0E14] font-black text-xs h-8 rounded-lg cursor-pointer"
                            >
                              Submit Payment
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CANCEL PRE-ORDER BUTTON */}
                  <div className="flex justify-end pt-1 border-t border-[#232A3B]/60">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => cancelMyPreOrder(ord.id, ord.orderNumber)}
                      className="text-[#FF3366] hover:text-[#FF3366] hover:bg-[#FF3366]/10 text-xs font-bold h-8 px-2 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Cancel Order
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
