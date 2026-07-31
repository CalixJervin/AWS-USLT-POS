import { useState, useEffect, useCallback } from "react";
import type { CartItem } from "./useCart";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useTransactions } from "./useTransactions";

export interface PendingKioskOrder {
  id: string;
  orderNumber: string; // e.g. "#042"
  cart: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: "counter" | "cash" | "gcash";
  createdAt: string;
  status: "pending_counter" | "completed" | "cancelled";
}

const KIOSK_ORDERS_STORAGE_KEY = "timpla_kiosk_pending_orders";
const KIOSK_ORDER_COUNTER_KEY = "timpla_kiosk_order_counter";
const ACTIVE_KIOSK_ORDER_KEY = "timpla_active_kiosk_order";

export function useKioskOrders() {
  const [pendingOrders, setPendingOrders] = useState<PendingKioskOrder[]>([]);
  const { saveTransaction } = useTransactions();

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
      if (saved) {
        const parsed: PendingKioskOrder[] = JSON.parse(saved);
        setPendingOrders(parsed.filter(o => o.status === "pending_counter"));
      }

      // Check active order persistence
      const activeStored = localStorage.getItem(ACTIVE_KIOSK_ORDER_KEY);
      if (activeStored) {
        const parsed = JSON.parse(activeStored);
        const stillPending = saved ? JSON.parse(saved).some((o: any) => o.id === parsed.id && o.status === "pending_counter") : true;
        if (stillPending) {
          setActiveKioskOrderState(parsed);
        } else {
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
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch DB pending orders:", error.message);
        return;
      }

      if (dbOrders) {
        const saved = localStorage.getItem(KIOSK_ORDERS_STORAGE_KEY);
        const localParsed: PendingKioskOrder[] = saved ? JSON.parse(saved) : [];

        const mapped: PendingKioskOrder[] = dbOrders.map((o: any, idx: number) => {
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
          let orderNum = "";
          const localMatch = localParsed.find(p => p.id === o.id);
          if (localMatch && localMatch.orderNumber) {
            orderNum = localMatch.orderNumber;
          }

          if (!orderNum) {
            const seq = String((dbOrders.length - idx) % 999).padStart(3, "0");
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
            status: "pending_counter"
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

          const merged = Array.from(map.values()).filter(o => o.status === "pending_counter");
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
        if (msg.data?.type === "SYNC_PENDING_ORDERS") {
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
    let currentCounter = 42;
    try {
      const stored = localStorage.getItem(KIOSK_ORDER_COUNTER_KEY);
      if (stored) {
        currentCounter = Number(stored);
      }
    } catch (e) {}

    const nextVal = currentCounter >= 999 ? 1 : currentCounter + 1;
    localStorage.setItem(KIOSK_ORDER_COUNTER_KEY, String(nextVal));

    return `#${String(currentCounter).padStart(3, "0")}`;
  };

  const createPendingOrder = async (
    cart: CartItem[],
    subtotal: number,
    total: number,
    paymentMethod: "counter" | "cash" | "gcash" = "counter"
  ): Promise<PendingKioskOrder> => {
    const orderNumber = getNextOrderNumber();
    const newOrderId = `kiosk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newOrder: PendingKioskOrder = {
      id: newOrderId,
      orderNumber,
      cart,
      subtotal,
      total,
      paymentMethod,
      createdAt: new Date().toISOString(),
      status: "pending_counter"
    };

    // Store as active order for session/tab persistence
    setActiveKioskOrder(newOrder);

    setPendingOrders((prev) => {
      const updated = [newOrder, ...prev];
      localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    try {
      const bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
      bc.close();
    } catch (e) {}

    try {
      const { data: dbOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          total,
          status: "pending_counter"
        })
        .select()
        .single();

      if (!orderErr && dbOrder) {
        const itemsToInsert = cart.map(item => ({
          order_id: dbOrder.id,
          product_id: item.id,
          variant_id: item.variantId,
          product_name: item.name,
          size: item.size || "Regular",
          price: item.price,
          quantity: item.qty
        }));
        await supabase.from("order_items").insert(itemsToInsert);

        newOrder.id = dbOrder.id;
        setActiveKioskOrder(newOrder);

        // Update in pending orders list with DB ID
        setPendingOrders((prev) => {
          const updated = prev.map(o => o.id === newOrderId ? { ...o, id: dbOrder.id } : o);
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
    const orderToFinalize = pendingOrders.find(o => o.id === orderId);
    if (!orderToFinalize) {
      toast.error("Pending order not found");
      return;
    }

    try {
      const mappedMethod = finalPaymentMethod === "cash" ? "cash" : "gcash";
      await saveTransaction(orderToFinalize.cart, orderToFinalize.total, mappedMethod);

      if (!orderId.startsWith("kiosk-")) {
        await supabase.from("orders").update({ status: "completed" }).eq("id", orderId);
      }

      setPendingOrders((prev) => {
        const updated = prev.filter(o => o.id !== orderId);
        localStorage.setItem(KIOSK_ORDERS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });

      // Clear active kiosk order if it was finalized
      if (activeKioskOrder?.id === orderId) {
        clearActiveKioskOrder();
      }

      try {
        const bc = new BroadcastChannel("timpla_kiosk_channel");
        bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
        bc.close();
      } catch (e) {}

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
