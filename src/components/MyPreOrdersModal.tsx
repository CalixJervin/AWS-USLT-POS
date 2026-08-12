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
import { Package, Trash2, CreditCard, AlertTriangle, Download, Upload, Eye } from "lucide-react";
import { toast } from "sonner";
import { useGCashSettings, downloadGCashQrCode } from "@/hooks/useGCashSettings";
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
  gcashReceiptImage?: string;
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

      if (dbOrders && Array.isArray(dbOrders)) {
        const dbStatusMap = new Map<string, { status: string; orderNumber?: string }>();
        (dbOrders as Array<{ id: string; order_number?: string; status?: string }>).forEach(d => {
          const st = d.status || "completed";
          if (d.id) dbStatusMap.set(d.id, { status: st, orderNumber: d.order_number });
          if (d.order_number) {
            const clean = d.order_number.replace(/^#/, '');
            dbStatusMap.set(clean, { status: st, orderNumber: d.order_number });
            dbStatusMap.set(`#${clean}`, { status: st, orderNumber: d.order_number });
          }
        });

        let changed = false;

        const updated = localList
          .filter(o => {
            // Always keep local preorders with temporary IDs
            if (o.id && o.id.startsWith("preorder-")) return true;
            if (dbStatusMap.has(o.id)) return true;
            if (o.orderNumber && dbStatusMap.has(o.orderNumber)) return true;
            if (o.orderNumber && dbStatusMap.has(o.orderNumber.replace(/^#/, ''))) return true;
            return false;
          })
          .map(o => {
            const dbMatch = dbStatusMap.get(o.id) || (o.orderNumber ? dbStatusMap.get(o.orderNumber) || dbStatusMap.get(o.orderNumber.replace(/^#/, '')) : null);
            if (dbMatch && dbMatch.status) {
              const raw = dbMatch.status.toLowerCase();
              let targetStatus: MyPreOrder["paymentStatus"] = o.paymentStatus;
              if (raw === "completed" || raw === "paid") {
                targetStatus = "Paid";
              } else if (raw === "verifying") {
                targetStatus = "Pending Verification";
              } else if (raw === "pending_counter") {
                targetStatus = "Cash Pending";
              } else if (raw === "unpaid") {
                targetStatus = "Unpaid";
              }

              if (targetStatus !== o.paymentStatus) {
                changed = true;
                return { ...o, paymentStatus: targetStatus };
              }
            }
            return o;
          });

        if (changed || updated.length !== localList.length) {
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
        } else if (msg.data?.type === "PREORDER_PAYMENT_STATUS_UPDATED") {
          const targetId = msg.data.orderId;
          const targetNum = msg.data.orderNumber;
          const newStatus = msg.data.paymentStatus || "Paid";

          const saved = localStorage.getItem(MY_PREORDERS_KEY);
          if (saved) {
            const existing: MyPreOrder[] = JSON.parse(saved);
            const updated = existing.map(o => {
              if ((targetId && o.id === targetId) || (targetNum && o.orderNumber === targetNum)) {
                return { ...o, paymentStatus: newStatus as any };
              }
              return o;
            });
            localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updated));
            setOrders(updated);
          }
        } else {
          reloadOrders();
          checkRemoteValidity();
        }
      };
    } catch (e) {}

    // Subscribe to Supabase Realtime changes on orders table for instant multi-device updates
    const channelId = `orders_my_preorders_${Math.random().toString(36).substring(2, 9)}`;
    const realtimeChannel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updatedRow = payload.new;
          if (updatedRow) {
            const saved = localStorage.getItem(MY_PREORDERS_KEY);
            if (saved) {
              const existing: MyPreOrder[] = JSON.parse(saved);
              const matches = existing.some(
                (o) => o.id === updatedRow.id || (o.orderNumber && o.orderNumber === updatedRow.order_number)
              );
              if (matches) {
                let newPayStatus: MyPreOrder["paymentStatus"] = "Paid";
                const raw = (updatedRow.status || "").toLowerCase();
                if (raw === "completed" || raw === "paid") newPayStatus = "Paid";
                else if (raw === "verifying") newPayStatus = "Pending Verification";
                else if (raw === "pending_counter") newPayStatus = "Cash Pending";
                else if (raw === "unpaid") newPayStatus = "Unpaid";

                const updatedList = existing.map((o) => {
                  if (o.id === updatedRow.id || (o.orderNumber && o.orderNumber === updatedRow.order_number)) {
                    return { ...o, paymentStatus: newPayStatus };
                  }
                  return o;
                });
                localStorage.setItem(MY_PREORDERS_KEY, JSON.stringify(updatedList));
                setOrders(updatedList);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("timpla_my_preorders_updated", handleUpdate);
      if (bc) bc.close();
      supabase.removeChannel(realtimeChannel);
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

  const updatePaymentInfo = (orderNumber: string, refNumber: string, receiptImage?: string) => {
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
            gcashRefNumber: refNumber,
            gcashReceiptImage: receiptImage || o.gcashReceiptImage
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
              gcashRefNumber: refNumber,
              gcashReceiptImage: receiptImage || o.gcashReceiptImage
            };
          }
          return o;
        });
        localStorage.setItem("timpla_kiosk_pending_orders", JSON.stringify(updatedKiosk));
      }

      // If online, update Supabase orders table so admin pos can view receipt screenshot!
      const updateSupabase = async () => {
        try {
          const numWithHash = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
          const numClean = orderNumber.replace(/^#/, "");
          const { error } = await supabase
            .from("orders")
            .update({
              payment_method: "gcash",
              status: "verifying",
              gcash_ref_number: refNumber,
              gcash_receipt_url: receiptImage || null
            })
            .or(`order_number.eq.${numWithHash},order_number.eq.${numClean}`);

          if (error) {
            console.warn("Supabase update gcash info notice:", error.message);
            // Fallback update without gcash columns if missing in DB schema
            await supabase
              .from("orders")
              .update({
                payment_method: "gcash",
                status: "verifying"
              })
              .or(`order_number.eq.${numWithHash},order_number.eq.${numClean}`);
          }
        } catch (e) {}
      };
      updateSupabase();

      window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      window.dispatchEvent(new Event("storage"));
      toast.success(`Payment reference and receipt submitted for ${orderNumber}!`);
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
  const [receiptFileMap, setReceiptFileMap] = useState<Record<string, string>>({});
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const [confirmCancelOrder, setConfirmCancelOrder] = useState<{ id: string; orderNumber: string; itemName: string } | null>(null);

  const handleReceiptFileChange = (orderId: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, etc.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setReceiptFileMap((prev) => ({ ...prev, [orderId]: dataUrl }));
          toast.success("Receipt screenshot attached!");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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
        <DialogContent 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-lg bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] p-0 overflow-hidden"
        >
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
              const currentReceiptImage = receiptFileMap[ord.id] || ord.gcashReceiptImage;

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

                  {/* DISPLAY ATTACHED RECEIPT SCREENSHOT BUTTON IF ALREADY SUBMITTED */}
                  {ord.gcashReceiptImage && !isPayingThis && (
                    <div className="flex items-center justify-between bg-[#1E2333]/80 p-2.5 rounded-lg border border-[#00F2FE]/30 text-xs">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={ord.gcashReceiptImage}
                          alt="Receipt Screenshot"
                          onClick={() => setViewReceiptUrl(ord.gcashReceiptImage!)}
                          className="w-9 h-9 object-cover rounded-lg border border-[#00F2FE]/40 cursor-pointer hover:scale-105 transition-transform"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-[#E2E8F0]">GCash Receipt Screenshot</span>
                          <span className="text-[10px] text-[#00F2FE]">Proof of payment attached</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewReceiptUrl(ord.gcashReceiptImage!)}
                        className="h-7 text-[11px] text-[#00F2FE] hover:bg-[#00F2FE]/10 font-bold rounded-md flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </div>
                  )}

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
                          <div className="text-center flex flex-col items-center gap-2">
                            <div className="text-[11px] font-bold text-[#94A3B8] uppercase">Scan QR Code to Pay via GCash</div>
                            {gcashSettings.gcashQrImage && (
                              <div className="flex flex-col items-center gap-2">
                                <img
                                  src={gcashSettings.gcashQrImage}
                                  alt="GCash QR Code"
                                  className="w-full max-w-[280px] h-auto max-h-[380px] object-contain rounded-xl border border-[#00F2FE]/40 bg-white p-1.5 my-1 mx-auto shadow-md"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadGCashQrCode(gcashSettings.gcashQrImage)}
                                  className="h-8 text-xs border-[#00F2FE]/50 text-[#00F2FE] hover:bg-[#00F2FE]/10 font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download QR Code</span>
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* GCASH REFERENCE NUMBER */}
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

                          {/* RECEIPT SCREENSHOT ATTACHMENT */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-[#E2E8F0] flex items-center justify-between">
                              <span>Attach GCash Receipt Screenshot <span className="text-[#FF3366]">*</span></span>
                              {currentReceiptImage && (
                                <span className="text-[#00F2FE] text-[10px] font-bold">✓ Screenshot Attached</span>
                              )}
                            </label>

                            {currentReceiptImage ? (
                              <div className="relative bg-[#131824] border border-[#00F2FE]/50 rounded-xl p-2.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <img
                                    src={currentReceiptImage}
                                    alt="Receipt Screenshot"
                                    onClick={() => setViewReceiptUrl(currentReceiptImage)}
                                    className="w-12 h-12 object-cover rounded-lg border border-[#00F2FE]/40 cursor-pointer hover:scale-105 transition-transform"
                                  />
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold text-[#E2E8F0]">Receipt Screenshot</span>
                                    <button
                                      type="button"
                                      onClick={() => setViewReceiptUrl(currentReceiptImage)}
                                      className="text-[11px] text-[#00F2FE] font-medium underline text-left cursor-pointer"
                                    >
                                      Click to view full image
                                    </button>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setReceiptFileMap(prev => { const copy = { ...prev }; delete copy[ord.id]; return copy; })}
                                  className="h-8 w-8 text-[#FF3366] hover:bg-[#FF3366]/10 rounded-lg shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <label className="bg-[#131824] border border-dashed border-[#00F2FE]/40 hover:border-[#00F2FE] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                                <Upload className="h-5 w-5 text-[#00F2FE]" />
                                <div className="text-center">
                                  <span className="text-xs font-bold text-[#00F2FE]">Upload GCash Receipt Screenshot <span className="text-[#FF3366]">*</span></span>
                                  <div className="text-[10px] text-[#64748B]">PNG, JPG, or JPEG up to 10MB</div>
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleReceiptFileChange(ord.id, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="flex gap-2 pt-1">
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
                              disabled={!currentRefInput.trim() || !currentReceiptImage}
                              onClick={() => {
                                if (!currentRefInput.trim()) {
                                  toast.error("Please enter your GCash Reference Number.");
                                  return;
                                }
                                if (!currentReceiptImage) {
                                  toast.error("Please attach a screenshot of your GCash receipt.");
                                  return;
                                }
                                updatePaymentInfo(ord.orderNumber, currentRefInput.trim(), currentReceiptImage);
                                setPayingOrderId(null);
                              }}
                              className="flex-1 bg-[#00F2FE] hover:bg-[#00D8E4] disabled:opacity-40 text-[#0B0E14] font-black text-xs h-8 rounded-lg cursor-pointer"
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
                      onClick={() => setConfirmCancelOrder({ id: ord.id, orderNumber: ord.orderNumber, itemName: ord.itemName })}
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

      {/* ARE YOU SURE CANCEL CONFIRMATION DIALOG */}
      <Dialog open={Boolean(confirmCancelOrder)} onOpenChange={(open) => { if (!open) setConfirmCancelOrder(null); }}>
        <DialogContent className="sm:max-w-md bg-[#1E2333] border-[#2D3448] text-[#E2E8F0] p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center gap-2 pb-2">
            <div className="p-3 rounded-full bg-[#FF3366]/15 border border-[#FF3366]/30 text-[#FF3366]">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <DialogTitle className="text-lg font-black text-[#E2E8F0]">
              Cancel Pre-Order?
            </DialogTitle>
          </DialogHeader>

          <div className="text-center text-sm text-[#94A3B8] space-y-2 py-2">
            <p>
              Are you sure you want to cancel pre-order <span className="font-extrabold text-[#00F2FE]">{confirmCancelOrder?.orderNumber}</span> ({confirmCancelOrder?.itemName})?
            </p>
            <p className="text-xs text-[#64748B]">
              This action cannot be undone and will remove this ticket from your saved orders.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#2D3448]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmCancelOrder(null)}
              className="flex-1 h-10 text-sm font-semibold text-[#94A3B8] hover:text-white hover:bg-[#282E42] rounded-xl cursor-pointer"
            >
              No, Keep Order
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (confirmCancelOrder) {
                  await cancelMyPreOrder(confirmCancelOrder.id, confirmCancelOrder.orderNumber);
                  setConfirmCancelOrder(null);
                }
              }}
              className="flex-1 h-10 text-sm font-bold bg-[#FF3366] hover:bg-[#E62E5C] text-white rounded-xl shadow-lg shadow-[#FF3366]/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Cancel Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* LIGHTBOX RECEIPT SCREENSHOT PREVIEW DIALOG */}
      <Dialog open={Boolean(viewReceiptUrl)} onOpenChange={(open) => { if (!open) setViewReceiptUrl(null); }}>
        <DialogContent className="sm:max-w-xl bg-[#131824] border-[#00F2FE]/40 text-[#E2E8F0] p-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
          <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-[#232A3B] pb-3">
            <DialogTitle className="text-base font-extrabold text-[#E2E8F0] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#00F2FE]" />
              GCash Receipt Screenshot
            </DialogTitle>
          </DialogHeader>

          {viewReceiptUrl && (
            <div className="w-full flex flex-col items-center gap-3">
              <img
                src={viewReceiptUrl}
                alt="Submitted GCash Receipt"
                className="max-h-[65vh] w-auto object-contain rounded-xl border border-[#232A3B] bg-black/40 shadow-lg"
              />
              <div className="flex gap-2 w-full justify-end pt-2 border-t border-[#232A3B]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewReceiptUrl(null)}
                  className="text-xs font-bold border-[#2D3448] text-[#E2E8F0] hover:bg-[#1E2333] h-9 px-4 rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
