import { useState, useEffect, useCallback } from "react";
import type { CartItem } from "./useCart";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface PendingKioskOrder {
  id: string;
  orderNumber: string; // e.g. "#042"
  cart: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: "counter" | "cash" | "gcash";
  createdAt: string;
  status: "pending_counter" | "completed" | "cancelled";
  
  // Customer & Pre-Order Contact Details
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  fulfillmentStatus?: "pending" | "pre_ordered" | "in_production" | "ready_for_pickup" | "claimed";
}

const KIOSK_ORDERS_STORAGE_KEY = "timpla_kiosk_pending_orders";
const KIOSK_ORDER_COUNTER_KEY = "timpla_kiosk_order_counter";
const ACTIVE_KIOSK_ORDER_KEY = "timpla_active_kiosk_order";

export function useKioskOrders() {
  const [pendingOrders, setPendingOrders] = useState<PendingKioskOrder[]>([]);

  // Active kiosk order for tab/session persistence
  const [activeKioskOrder, setActiveKioskOrderState] = useState<PendingKioskOrder | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_KIOSK_ORDER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const setActiveKioskOrder = useCallback((order: PendingKioskOrder | null) => {
    setActiveKioskOrderState(order);
    if (order) {
      localStorage.setItem(ACTIVE_KIOSK_ORDER_KEY, JSON.stringify(order));
    } else {
      localStorage.removeItem(ACTIVE_KIOSK_ORDER_KEY);
    }
  }, []);

  const clearActiveKioskOrder = useCallback(() => {
    setActiveKioskOrderState(null);
    localStorage.removeItem(ACTIVE_KIOSK_ORDER_KEY);
  }, []);

  // Helper to load orders from localStorage
  const loadLocalOrders = useCallback(() => {
    try {
      const saved = localStorage.getItem(KIOSK_ORDERS_STORAGE_KEY);
      const parsed: PendingKioskOrder[] = saved ? JSON.parse(saved) : [];
      if (saved) {
        setPendingOrders(parsed.filter(o => 
          o.status === "pending_counter" && 
          o.fulfillmentStatus !== "pre_ordered" && 
          !o.orderNumber?.startsWith("#PO-")
        ));
      }

      // Check active order persistence
      const activeStored = localStorage.getItem(ACTIVE_KIOSK_ORDER_KEY);
      if (activeStored) {
        try {
          const activeObj: PendingKioskOrder = JSON.parse(activeStored);
          const match = parsed.find(
            (o: any) => o.id === activeObj.id || o.orderNumber === activeObj.orderNumber
          );

          if (match && match.status === "pending_counter") {
            const updatedActive = { ...activeObj, id: match.id, orderNumber: match.orderNumber };
            setActiveKioskOrderState(updatedActive);
            localStorage.setItem(ACTIVE_KIOSK_ORDER_KEY, JSON.stringify(updatedActive));
          } else {
            // Order was finalized, completed, or cancelled by POS staff -> clear active kiosk order banner
            setActiveKioskOrderState(null);
            localStorage.removeItem(ACTIVE_KIOSK_ORDER_KEY);
          }
        } catch (e) {
          setActiveKioskOrderState(null);
          localStorage.removeItem(ACTIVE_KIOSK_ORDER_KEY);
        }
      } else {
        setActiveKioskOrderState(null);
      }
    } catch (e) {
      console.error("Error reading kiosk orders from storage", e);
    }
  }, []);

  // Fetch pending orders from Supabase & sync while preserving generated orderNumbers
  const fetchPendingOrders = useCallback(async () => {
    try {
      loadLocalOrders();

      const { data: dbOrders, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("status", "pending_counter")
        .neq("fulfillment_status", "pre_ordered")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch DB pending orders:", error.message);
        return;
      }

      if (dbOrders) {
        const saved = localStorage.getItem(KIOSK_ORDERS_STORAGE_KEY);
        const localParsed: PendingKioskOrder[] = saved ? JSON.parse(saved) : [];

        const filteredDbOrders = dbOrders.filter((o: any) => 
          o.fulfillment_status !== "pre_ordered" && 
          !o.order_number?.startsWith("#PO-")
        );

        const mapped: PendingKioskOrder[] = filteredDbOrders.map((o: any, idx: number) => {
          const items: CartItem[] = (o.order_items || []).map((i: any) => ({
            id: i.product_id || i.id,
            name: i.product_name,
            price: Number(i.price),
            qty: i.quantity,
            category: "General",
            variantId: i.variant_id,
            size: i.size || "Regular"
          }));

          // Preserve existing orderNumber if already in local storage
          let orderNum = o.order_number || "";
          if (!orderNum) {
            const localMatch = localParsed.find(p => 
              p.id === o.id || 
              (p.createdAt && o.created_at && Math.abs(new Date(p.createdAt).getTime() - new Date(o.created_at).getTime()) < 10000)
            );
            if (localMatch && localMatch.orderNumber) {
              orderNum = localMatch.orderNumber;
            }
          }

          if (!orderNum) {
            const seq = String((filteredDbOrders.length - idx) % 999).padStart(3, "0");
            orderNum = `#${seq}`;
          }

          return {
            id: o.id,
            orderNumber: orderNum,
            cart: items,
            subtotal: Number(o.total),
            total: Number(o.total),
            paymentMethod: "counter",
            createdAt: o.created_at,
            status: "pending_counter",
            customerName: o.customer_name || undefined,
            customerEmail: o.customer_email || undefined,
            customerPhone: o.customer_phone || undefined,
            fulfillmentStatus: o.fulfillment_status || "pending"
          };
        });

        setPendingOrders((prev) => {
          const map = new Map<string, PendingKioskOrder>();
          // 1. Fill with previous local orders first to retain orderNumbers
          prev.forEach(o => map.set(o.id, o));
          // 2. Add/merge DB orders, preserving existing orderNumber
          mapped.forEach(o => {
            if (map.has(o.id)) {
              const existing = map.get(o.id)!;
              map.set(o.id, { ...o, orderNumber: existing.orderNumber });
            } else {
              map.set(o.id, o);
            }
          });

          const merged = Array.from(map.values()).filter(o => 
            o.status === "pending_counter" && 
            o.fulfillmentStatus !== "pre_ordered" && 
            !o.orderNumber?.startsWith("#PO-")
          );
          localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.error("Error fetching pending kiosk orders:", err);
    }
  }, [loadLocalOrders]);

  useEffect(() => {
    fetchPendingOrders();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === KIOSK_ORDERS_STORAGE_KEY || e.key === ACTIVE_KIOSK_ORDER_KEY) {
        loadLocalOrders();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.onmessage = (msg) => {
        if (msg.data?.type === "SYNC_PENDING_ORDERS" || msg.data?.type === "RESET_KIOSK_COUNTER") {
          loadLocalOrders();
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
    };
  }, [fetchPendingOrders, loadLocalOrders]);

  const getNextOrderNumber = (): string => {
    let currentCounter = 1;
    try {
      const stored = localStorage.getItem(KIOSK_ORDER_COUNTER_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > 0) {
          currentCounter = parsed;
        }
      }
    } catch (e) {}

    const orderNum = `#${String(currentCounter).padStart(3, "0")}`;
    const nextVal = currentCounter >= 999 ? 1 : currentCounter + 1;
    localStorage.setItem(KIOSK_ORDER_COUNTER_KEY, String(nextVal));

    return orderNum;
  };

  const createPendingOrder = async (
    cart: CartItem[],
    subtotal: number,
    total: number,
    paymentMethod: "counter" | "cash" | "gcash" = "counter",
    customerDetails?: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    }
  ): Promise<PendingKioskOrder> => {
    const orderNumber = getNextOrderNumber();
    const newOrderId = `kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const hasPreOrder = cart.some(i => i.isPreOrder);

    const newOrder: PendingKioskOrder = {
      id: newOrderId,
      orderNumber,
      cart,
      subtotal,
      total,
      paymentMethod,
      createdAt: new Date().toISOString(),
      status: "pending_counter",
      customerName: customerDetails?.customerName,
      customerEmail: customerDetails?.customerEmail,
      customerPhone: customerDetails?.customerPhone,
      fulfillmentStatus: hasPreOrder ? "pre_ordered" : "pending"
    };

    // Store as active order for session/tab persistence
    setActiveKioskOrder(newOrder);

    setPendingOrders((prev) => {
      const updated = [newOrder, ...prev.filter(o => o.id !== newOrderId && o.orderNumber !== orderNumber)];
      localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    try {
      const bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
      bc.close();
    } catch (e) {}

    try {
      let dbOrder: any = null;

      const payload: any = {
        total,
        status: "pending_counter",
        order_number: orderNumber,
        customer_name: customerDetails?.customerName || null,
        customer_email: customerDetails?.customerEmail || null,
        customer_phone: customerDetails?.customerPhone || null,
        fulfillment_status: hasPreOrder ? "pre_ordered" : "pending"
      };

      let resWithNum = await supabase
        .from("orders")
        .insert(payload)
        .select()
        .single();

      if (resWithNum.error) {
        console.warn("Supabase create pending order notice:", resWithNum.error.message);
        // Fallback without order_number if column is not yet present in Supabase table schema
        delete payload.order_number;
        resWithNum = await supabase.from("orders").insert(payload).select().single();
      }

      if (resWithNum.data) {
        dbOrder = resWithNum.data;
      }

      if (dbOrder) {
        const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
        const itemsToInsert = cart.map(item => ({
          order_id: dbOrder.id,
          product_id: isValidUuid(item.id) ? item.id : null,
          variant_id: isValidUuid(item.variantId) ? item.variantId : null,
          product_name: item.name,
          size: item.size || "Regular",
          price: item.price,
          quantity: item.qty
        }));
        await supabase.from("order_items").insert(itemsToInsert);

        const updatedOrder: PendingKioskOrder = {
          ...newOrder,
          id: dbOrder.id
        };

        setActiveKioskOrder(updatedOrder);

        // Update in pending orders list with DB ID
        setPendingOrders((prev) => {
          const updated = prev.map(o => (o.id === newOrderId || o.orderNumber === orderNumber) ? { ...o, id: dbOrder.id } : o);
          localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.warn("Saved pending order locally (DB backup optional):", err);
    }

    return newOrder;
  };

  const finalizePendingOrder = async (
    orderId: string,
    finalPaymentMethod: "cash" | "gcash" | "split",
    splitDetails?: { cashAmount: number; secondaryMethod: "gcash"; secondaryAmount: number }
  ) => {
    const orderToFinalize = pendingOrders.find(o => o.id === orderId || (o.orderNumber && o.orderNumber === orderId));
    if (!orderToFinalize) {
      toast.error("Pending order not found");
      return;
    }

    try {
      const mappedMethod = finalPaymentMethod === "cash" ? "cash" : "gcash";
      const targetFulfillment = (orderToFinalize.fulfillmentStatus && orderToFinalize.fulfillmentStatus !== "pending")
        ? orderToFinalize.fulfillmentStatus
        : (orderToFinalize.cart.some(i => i.isPreOrder) ? "pre_ordered" : "completed");

      let updatedInDb = false;
      let finalDbOrderId: string | null = null;
      const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      // 1. Target exact DB record by UUID primary key first if present
      if (isValidUuid(orderToFinalize.id)) {
        const updatePayload: any = {
          status: "completed",
          payment_method: mappedMethod,
          customer_name: orderToFinalize.customerName || null,
          customer_email: orderToFinalize.customerEmail || null,
          customer_phone: orderToFinalize.customerPhone || null,
          fulfillment_status: targetFulfillment
        };

        let res = await supabase.from("orders").update(updatePayload).eq("id", orderToFinalize.id).select();
        if (res.error) {
          delete updatePayload.payment_method;
          res = await supabase.from("orders").update(updatePayload).eq("id", orderToFinalize.id).select();
        }

        if (res.data && res.data.length > 0) {
          updatedInDb = true;
          finalDbOrderId = res.data[0].id;
        }
      }

      // 2. Secondary fallback: target active pending counter order matching order_number (with or without #)
      if (!updatedInDb && orderToFinalize.orderNumber) {
        const numWithHash = orderToFinalize.orderNumber.startsWith("#") ? orderToFinalize.orderNumber : `#${orderToFinalize.orderNumber}`;
        const numClean = orderToFinalize.orderNumber.replace(/^#/, "");

        const updatePayload: any = {
          status: "completed",
          payment_method: mappedMethod,
          customer_name: orderToFinalize.customerName || null,
          customer_email: orderToFinalize.customerEmail || null,
          customer_phone: orderToFinalize.customerPhone || null,
          fulfillment_status: targetFulfillment
        };

        let res = await supabase
          .from("orders")
          .update(updatePayload)
          .or(`order_number.eq.${numWithHash},order_number.eq.${numClean}`)
          .eq("status", "pending_counter")
          .select();

        if (res.error) {
          delete updatePayload.payment_method;
          res = await supabase
            .from("orders")
            .update(updatePayload)
            .or(`order_number.eq.${numWithHash},order_number.eq.${numClean}`)
            .eq("status", "pending_counter")
            .select();
        }

        if (res.data && res.data.length > 0) {
          updatedInDb = true;
          finalDbOrderId = res.data[0].id;
        }
      }

      // 3. Fallback for local-only pending orders: insert as completed
      if (!updatedInDb) {
        const insertPayload: any = {
          order_number: orderToFinalize.orderNumber,
          total: orderToFinalize.total,
          status: "completed",
          payment_method: mappedMethod,
          customer_name: orderToFinalize.customerName || null,
          customer_email: orderToFinalize.customerEmail || null,
          customer_phone: orderToFinalize.customerPhone || null,
          fulfillment_status: targetFulfillment
        };

        let res = await supabase.from("orders").insert(insertPayload).select().single();
        if (res.error) {
          delete insertPayload.order_number;
          delete insertPayload.payment_method;
          res = await supabase.from("orders").insert(insertPayload).select().single();
        }

        if (res.data) {
          updatedInDb = true;
          finalDbOrderId = res.data.id;
        }
      }

      // Ensure order_items exist in DB for this finalized order
      if (finalDbOrderId) {
        const { data: existingItems } = await supabase
          .from("order_items")
          .select("id")
          .eq("order_id", finalDbOrderId);

        if (!existingItems || existingItems.length === 0) {
          const itemsToInsert = orderToFinalize.cart.map(item => ({
            order_id: finalDbOrderId,
            product_id: isValidUuid(item.id) ? item.id : null,
            variant_id: isValidUuid(item.variantId) ? item.variantId : null,
            product_name: item.name,
            size: item.size || "Regular",
            price: item.price,
            quantity: item.qty
          }));
          await supabase.from("order_items").insert(itemsToInsert);
        }
      }

      // Deduct stock for ingredients and ready-made products
      try {
        const rpcItems = orderToFinalize.cart.map(item => ({
          product_id: isValidUuid(item.id) ? item.id : null,
          variant_id: isValidUuid(item.variantId) ? item.variantId : null,
          product_name: item.name,
          size: item.size || "Regular",
          price: item.price,
          quantity: item.qty
        }));
        await supabase.rpc("deduct_stock_on_sale", { p_order_items: rpcItems });
      } catch (stockErr) {
        console.warn("Stock deduction notice:", stockErr);
      }

      setPendingOrders((prev) => {
        const updated = prev.filter(o => o.id !== orderId && o.orderNumber !== orderToFinalize.orderNumber);
        localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      // Clear active kiosk order in state & localStorage if it was finalized
      const activeStored = localStorage.getItem(ACTIVE_KIOSK_ORDER_KEY);
      if (activeStored) {
        try {
          const activeObj = JSON.parse(activeStored);
          if (activeObj.id === orderId || activeObj.orderNumber === orderToFinalize.orderNumber || activeObj.id === orderToFinalize.id) {
            clearActiveKioskOrder();
          }
        } catch (e) {
          clearActiveKioskOrder();
        }
      } else {
        clearActiveKioskOrder();
      }

      try {
        const bc = new BroadcastChannel("timpla_kiosk_channel");
        bc.postMessage({ type: "SYNC_PENDING_ORDERS", action: "FINALIZE", orderId, orderNumber: orderToFinalize.orderNumber });
        bc.close();
      } catch (e) {}

      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("timpla_kiosk_orders_updated"));
      window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      window.dispatchEvent(new Event("timpla_inventory_updated"));

      let methodLabel = finalPaymentMethod.toUpperCase();
      if (finalPaymentMethod === "split" && splitDetails) {
        methodLabel = `SPLIT (Cash ₱${splitDetails.cashAmount.toFixed(2)} + GCash ₱${splitDetails.secondaryAmount.toFixed(2)})`;
      }

      toast.success(`Order ${orderToFinalize.orderNumber} paid via ${methodLabel}!`);
    } catch (err: any) {
      console.error("Error finalizing pending order:", err);
      toast.error("Failed to finalize order: " + (err.message || "Unknown error"));
    }
  };

  const cancelPendingOrder = async (orderId: string) => {
    setPendingOrders((prev) => {
      const updated = prev.filter(o => o.id !== orderId);
      localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (activeKioskOrder?.id === orderId) {
      clearActiveKioskOrder();
    }

    if (!orderId.startsWith("kiosk-")) {
      await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    }

    try {
      const bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
      bc.close();
    } catch (e) {}

    toast.info("Pending order cancelled");
  };

  const clearAllPendingOrders = async () => {
    setPendingOrders([]);
    clearActiveKioskOrder();
    localStorage.removeItem(KIOSK_ORDERS_STORAGE_KEY);

    try {
      await supabase.from("orders").update({ status: "cancelled" }).eq("status", "pending_counter");
    } catch (e) {}

    try {
      const bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
      bc.close();
    } catch (e) {}

    toast.success("All pending kiosk orders cleared");
  };

  return {
    pendingOrders,
    activeKioskOrder,
    setActiveKioskOrder,
    clearActiveKioskOrder,
    createPendingOrder,
    finalizePendingOrder,
    cancelPendingOrder,
    clearAllPendingOrders,
    refetchPendingOrders: fetchPendingOrders
  };
}
