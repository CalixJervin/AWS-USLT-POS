import { useState, useEffect, useCallback, useContext } from "react";
import type { CartItem } from "./useCart";
import { supabase } from "@/lib/supabase";
import { AuthContext } from "./use-auth";
import { InventoryContext } from "@/context/InventoryContext";
import { useConnectionStatus } from "@/context/ConnectionContext";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  order_id: string; 
  total_amount: number;
  payment_method: string;
  status?: string;
  payment_status?: string;
  timestamp: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  fulfillment_status?: string;
  is_pre_order?: boolean;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export const isPaidTransaction = (t: Transaction): boolean => {
  const payStatus = (t.payment_status || "").toString().trim();
  const status = (t.status || "").toString().trim().toLowerCase();

  // Explicitly un-paid statuses are NEVER paid
  if (
    payStatus === "Unpaid" || 
    payStatus === "Cash Pending" || 
    payStatus === "Pending Verification" ||
    status === "unpaid" ||
    status === "pending_counter" ||
    status === "verifying" ||
    status === "cancelled"
  ) {
    return false;
  }

  return payStatus === "Paid" || status === "completed" || status === "paid";
};

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const invContext = useContext(InventoryContext);
  const refreshData = invContext?.refreshData;
  const deductOfflineStock = invContext?.deductOfflineStock;
  const { isAdminOfflineMode, saveAdminOfflineOrder } = useConnectionStatus();

  const removeLocalOrders = (targetIds: string[], targetOrderNumbers: string[] = []) => {
    try {
      const saved = localStorage.getItem("timpla_kiosk_pending_orders");
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        const updated = parsed.filter(o => 
          !targetIds.includes(o.id) && 
          !(o.orderNumber && targetOrderNumbers.includes(o.orderNumber))
        );
        localStorage.setItem("timpla_kiosk_pending_orders", JSON.stringify(updated));
      }

      const savedPre = localStorage.getItem("timpla_my_saved_preorders");
      if (savedPre) {
        const parsed: any[] = JSON.parse(savedPre);
        const updated = parsed.filter(o => 
          !targetIds.includes(o.id) && 
          !(o.orderNumber && targetOrderNumbers.includes(o.orderNumber))
        );
        localStorage.setItem("timpla_my_saved_preorders", JSON.stringify(updated));
      }
      
      const savedAdminOff = localStorage.getItem("timpla_admin_offline_orders");
      if (savedAdminOff) {
        const parsed: any[] = JSON.parse(savedAdminOff);
        const updated = parsed.filter(o => 
          !targetIds.includes(o.id) && 
          !(o.orderNumber && targetOrderNumbers.includes(o.orderNumber))
        );
        localStorage.setItem("timpla_admin_offline_orders", JSON.stringify(updated));
      }

      const bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
      bc.close();
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const fetchTransactions = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    let orders: any[] = [];
    try {
      const { data: dbOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      orders = dbOrders || [];
      try {
        localStorage.setItem("timpla_cache_transactions", JSON.stringify(orders));
      } catch (e) {}
    } catch (error) {
      console.warn("Using cached transactions due to network status:", error);
      try {
        const cached = localStorage.getItem("timpla_cache_transactions");
        if (cached) orders = JSON.parse(cached);
      } catch (e) {}
    }

    try {
      // Load local pending & saved pre-orders from localStorage to ensure contact details are preserved
      let localOrders: any[] = [];
      try {
        const savedKiosk = localStorage.getItem("timpla_kiosk_pending_orders");
        if (savedKiosk) localOrders = JSON.parse(savedKiosk);

        const savedPre = localStorage.getItem("timpla_my_saved_preorders");
        if (savedPre) {
          const preList: any[] = JSON.parse(savedPre);
          preList.forEach(m => {
            if (!localOrders.some(l => l.id === m.id || (l.orderNumber && m.orderNumber && l.orderNumber === m.orderNumber))) {
              localOrders.push({
                id: m.id,
                orderNumber: m.orderNumber,
                customerName: m.customerName,
                customerEmail: m.customerEmail,
                customerPhone: m.customerPhone,
                paymentMethod: m.paymentMethod,
                paymentStatus: m.paymentStatus,
                fulfillmentStatus: "pre_ordered",
                total: m.price,
                createdAt: m.createdAt,
                cart: [{
                  id: m.id,
                  name: m.itemName,
                  price: m.price,
                  qty: 1,
                  size: m.size || "Standard",
                  isPreOrder: true
                }]
              });
            }
          });
        }
      } catch (e) {}

      const txMap = new Map<string, Transaction>();
      const items: TransactionItem[] = [];

      (orders || []).forEach(o => {
        const orderItems = o.order_items || [];
        const localMatch = localOrders.find(l => 
          l.id === o.id || 
          (l.orderNumber && o.order_number && l.orderNumber === o.order_number)
        );

        const custName = o.customer_name || localMatch?.customerName || undefined;
        const custEmail = o.customer_email || localMatch?.customerEmail || undefined;
        const custPhone = o.customer_phone || localMatch?.customerPhone || undefined;

        // Fix: Food orders are NOT pre-orders unless fulfillment_status === 'pre_ordered', starts with #PO-, or contains merch items
        const isPreOrder = o.fulfillment_status === "pre_ordered" || 
                           localMatch?.fulfillmentStatus === "pre_ordered" ||
                           (o.order_number && o.order_number.startsWith("#PO-")) ||
                           (localMatch?.orderNumber && localMatch.orderNumber.startsWith("#PO-")) ||
                           orderItems.some((i: any) => 
                             i.product_name && (
                               i.product_name.toLowerCase().includes("shirt") || 
                               i.product_name.toLowerCase().includes("merch") || 
                               i.product_name.toLowerCase().includes("t-shirt") || 
                               i.product_name.toLowerCase().includes("tshirt") || 
                               i.product_name.toLowerCase().includes("apparel") || 
                               i.product_name.toLowerCase().includes("hoodie")
                             )
                           );

        const rawStatus = (o.status || "").toString().toLowerCase().trim();

        // Kiosk food/beverage orders are only logged into the transactions table AFTER staff finalizes payment
        if (!isPreOrder && (rawStatus === "pending_counter" || rawStatus === "pending")) {
          return;
        }

        // Cancelled orders should NEVER be logged into the transactions data table
        if (rawStatus === "cancelled") {
          return;
        }

        // Primary Source of Truth: DB status column with normalized case handling
        let payStatus: string | undefined = undefined;

        if (rawStatus === "completed" || rawStatus === "paid") {
          payStatus = "Paid";
        } else if (rawStatus === "verifying" || rawStatus === "pending verification") {
          payStatus = "Pending Verification";
        } else if (rawStatus === "unpaid") {
          payStatus = "Unpaid";
        } else if (rawStatus === "pending_counter" || rawStatus === "cash pending" || rawStatus === "pending") {
          payStatus = "Cash Pending";
        }

        // Fallback to localMatch ONLY IF DB status is missing or unmapped
        if (!payStatus && localMatch?.paymentStatus) {
          payStatus = localMatch.paymentStatus;
        }

        // Ultimate default
        if (!payStatus) {
          payStatus = isPreOrder ? "Cash Pending" : "Paid";
        }

        const derivedDbStatus = payStatus === "Paid" ? "completed" : (payStatus === "Unpaid" ? "unpaid" : (payStatus === "Pending Verification" ? "verifying" : "pending_counter"));

        txMap.set(o.id, {
          id: o.id,
          order_id: o.order_number || localMatch?.orderNumber || `#ORD-${o.id.slice(0, 4).toUpperCase()}`,
          total_amount: Number(o.total),
          payment_method: o.payment_method || localMatch?.paymentMethod || "cash", 
          status: (o.status && o.status !== "pending_counter" && o.status !== "completed") ? o.status : derivedDbStatus,
          payment_status: payStatus,
          timestamp: o.created_at,
          customer_name: custName,
          customer_email: custEmail,
          customer_phone: custPhone,
          fulfillment_status: o.fulfillment_status || localMatch?.fulfillmentStatus || (isPreOrder ? "pre_ordered" : undefined),
          is_pre_order: isPreOrder
        });

        orderItems.forEach((item: any) => {
          items.push({
            id: item.id,
            transaction_id: o.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: Number(item.price)
          });
        });
      });

      // Merge admin offline orders
      try {
        const storedAdminOff = localStorage.getItem("timpla_admin_offline_orders");
        if (storedAdminOff) {
          const offlineList: any[] = JSON.parse(storedAdminOff);
          offlineList.forEach(o => {
            const existsInTxMap = txMap.has(o.id) || Array.from(txMap.values()).some(tx => tx.order_id === o.orderNumber);
            if (!existsInTxMap) {
              txMap.set(o.id, {
                id: o.id,
                order_id: o.orderNumber || `#OFFLINE-ORD`,
                total_amount: Number(o.total),
                payment_method: o.paymentMethod || "cash",
                status: "completed",
                payment_status: "Paid",
                timestamp: o.createdAt || new Date().toISOString(),
                fulfillment_status: "completed",
                is_pre_order: false
              });

              if (o.cart) {
                o.cart.forEach((ci: any) => {
                  items.push({
                    id: `offline-item-${o.id}-${ci.id}`,
                    transaction_id: o.id,
                    product_id: ci.id,
                    product_name: ci.name,
                    quantity: ci.qty,
                    price: Number(ci.price)
                  });
                });
              }
            }
          });
        }
      } catch (e) {}

      // Merge local pre-orders if not already present in DB (exclude un-finalized kiosk counter orders)
      localOrders.forEach(l => {
        const isPO = l.fulfillmentStatus === "pre_ordered" || (l.orderNumber && l.orderNumber.startsWith("#PO-"));
        if (!isPO && (l.status === "pending_counter" || l.status !== "completed")) {
          return;
        }

        const existingTx = Array.from(txMap.values()).find(
          tx => tx.id === l.id || (l.orderNumber && tx.order_id === l.orderNumber)
        );

        if (!existingTx) {
          let payStatus = l.paymentStatus;
          if (!payStatus) {
            payStatus = l.status === "completed" ? "Paid" : "Cash Pending";
          }

          txMap.set(l.id, {
            id: l.id,
            order_id: l.orderNumber || (isPO ? `#PO-LOCAL` : `#ORD-LOCAL`),
            total_amount: Number(l.total),
            payment_method: l.paymentMethod || "cash",
            status: l.status || "completed",
            payment_status: payStatus,
            timestamp: l.createdAt || new Date().toISOString(),
            customer_name: l.customerName,
            customer_email: l.customerEmail,
            customer_phone: l.customerPhone,
            fulfillment_status: l.fulfillmentStatus || (isPO ? "pre_ordered" : "completed"),
            is_pre_order: isPO
          });

          if (l.cart) {
            l.cart.forEach((ci: any) => {
              items.push({
                id: `item-${l.id}-${ci.id}`,
                transaction_id: l.id,
                product_id: ci.id,
                product_name: ci.name,
                quantity: ci.qty,
                price: Number(ci.price)
              });
            });
          }
        } else {
          // Enrich existing DB entry with local contact details if missing
          if (!existingTx.customer_name && l.customerName) existingTx.customer_name = l.customerName;
          if (!existingTx.customer_email && l.customerEmail) existingTx.customer_email = l.customerEmail;
          if (!existingTx.customer_phone && l.customerPhone) existingTx.customer_phone = l.customerPhone;
        }
      });

      // Clean up and deduplicate transactions list
      const rawList = Array.from(txMap.values());
      const deduplicated: Transaction[] = [];

      rawList.forEach((tx) => {
        const duplicateIdx = deduplicated.findIndex((existing) => {
          // 1. Exact same database UUID -> definite duplicate
          if (existing.id === tx.id) return true;

          // 2. Determine if records are local storage fallbacks vs database records
          const existingIsLocal = existing.id.startsWith("kiosk-") || existing.id.startsWith("preorder-") || existing.id.startsWith("admin-offline-");
          const txIsLocal = tx.id.startsWith("kiosk-") || tx.id.startsWith("preorder-") || tx.id.startsWith("admin-offline-");
          const bothAreDB = !existingIsLocal && !txIsLocal;

          // Two separate database records with unique primary key IDs are NEVER duplicates of each other (unless order_id is identical)
          if (bothAreDB) {
            if (existing.order_id && tx.order_id && existing.order_id === tx.order_id) {
              return true;
            }
            return false;
          }

          // If one is local and one is DB, merge if order_id matches or amount & time match closely
          if (existingIsLocal || txIsLocal) {
            const sameOrderNum = Boolean(existing.order_id && tx.order_id && existing.order_id === tx.order_id);
            const isSameAmount = Math.abs(existing.total_amount - tx.total_amount) < 0.01;
            const timeDiff = Math.abs(new Date(existing.timestamp).getTime() - new Date(tx.timestamp).getTime());
            const isCloseInTime = timeDiff < 600000; // 10 minutes

            const oneIsPO = existing.order_id.startsWith("#PO-") || tx.order_id.startsWith("#PO-");
            const oneIsGeneric = existing.order_id.startsWith("#ORD-") || tx.order_id.startsWith("#ORD-");

            if (sameOrderNum || (isSameAmount && isCloseInTime && (oneIsPO && oneIsGeneric))) {
              return true;
            }
          }

          return false;
        });

        if (duplicateIdx === -1) {
          deduplicated.push(tx);
        } else {
          const existing = deduplicated[duplicateIdx];
          const preferTxIsPaid = isPaidTransaction(tx);
          const existingIsPaid = isPaidTransaction(existing);

          let preferTx = existing;
          if (preferTxIsPaid && !existingIsPaid) {
            preferTx = tx;
          } else if (!preferTxIsPaid && existingIsPaid) {
            preferTx = existing;
          } else if (tx.order_id.startsWith("#PO-") || (tx.customer_name && !existing.customer_name)) {
            preferTx = tx;
          }

          const secondary = preferTx === tx ? existing : tx;

          deduplicated[duplicateIdx] = {
            ...preferTx,
            customer_name: preferTx.customer_name || secondary.customer_name,
            customer_email: preferTx.customer_email || secondary.customer_email,
            customer_phone: preferTx.customer_phone || secondary.customer_phone,
            fulfillment_status: preferTx.fulfillment_status || secondary.fulfillment_status,
            is_pre_order: preferTx.is_pre_order || secondary.is_pre_order
          };
        }
      });

      setTransactions((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(deduplicated)) {
          return prev;
        }
        return deduplicated;
      });
      setTransactionItems((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(items)) {
          return prev;
        }
        return items;
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(true);

    const handleStorageChange = () => {
      fetchTransactions(false);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("timpla_my_preorders_updated", handleStorageChange);
    window.addEventListener("timpla_kiosk_orders_updated", handleStorageChange);
    window.addEventListener("timpla_admin_offline_orders_updated", handleStorageChange);

    let bc1: BroadcastChannel | null = null;
    let bc2: BroadcastChannel | null = null;
    let bc3: BroadcastChannel | null = null;
    try {
      bc1 = new BroadcastChannel("timpla_kiosk_channel");
      bc1.onmessage = () => fetchTransactions(false);

      bc2 = new BroadcastChannel("timpla_my_preorders_channel");
      bc2.onmessage = () => fetchTransactions(false);

      bc3 = new BroadcastChannel("timpla_admin_offline_channel");
      bc3.onmessage = () => fetchTransactions(false);
    } catch (e) {}

    // Supabase Realtime WebSocket subscription so Data Table auto-refreshes on DB changes
    const channelId = `tx_sync_${Math.random().toString(36).substring(2, 9)}`;
    const realtimeChannel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchTransactions(false);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("timpla_my_preorders_updated", handleStorageChange);
      window.removeEventListener("timpla_kiosk_orders_updated", handleStorageChange);
      window.removeEventListener("timpla_admin_offline_orders_updated", handleStorageChange);
      if (bc1) bc1.close();
      if (bc2) bc2.close();
      if (bc3) bc3.close();
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const saveTransaction = async (cart: CartItem[], total: number, _paymentMethod: "cash" | "gcash") => {
    // If Admin Offline Mode is active, save locally without making network calls
    if (isAdminOfflineMode) {
      saveAdminOfflineOrder(cart, total, _paymentMethod);
      if (deductOfflineStock) {
        deductOfflineStock(cart);
      }
      await fetchTransactions(false);
      window.dispatchEvent(new Event("storage"));
      return;
    }

    try {
      // Prepare items for RPC
      const rpcItems = cart.map(item => ({
        product_id: item.id,
        variant_id: item.variantId,
        product_name: item.name,
        size: item.size,
        price: item.price,
        quantity: item.qty
      }));

      // Call the atomic stored procedure to create order
      const { data: _orderId, error: rpcError } = await supabase.rpc('create_complete_order', {
        p_staff_id: user?.id,
        p_total: total,
        p_items: rpcItems
      });

      if (rpcError) throw rpcError;

      // Deduct stock for ingredients and ready-made products
      try {
        await supabase.rpc("deduct_stock_on_sale", { p_order_items: rpcItems });
      } catch (stockErr) {
        console.warn("Stock deduction notice:", stockErr);
      }

      await fetchTransactions();
      if (refreshData) await refreshData();

      // Broadcast inventory sync to all open tabs immediately
      try {
        const bc = new BroadcastChannel("timpla_inventory_sync");
        bc.postMessage({ type: "INVENTORY_UPDATED" });
        bc.close();
      } catch (e) {}

      window.dispatchEvent(new Event("storage"));
      toast.success("Transaction saved successfully");
    } catch (error: any) {
      console.warn("Server upload error during saveTransaction, storing offline:", error);
      // Fallback to Admin Offline order saving if server connection drops
      saveAdminOfflineOrder(cart, total, _paymentMethod);
      if (deductOfflineStock) {
        deductOfflineStock(cart);
      }
      await fetchTransactions(false);
      window.dispatchEvent(new Event("storage"));
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const tx = transactions.find(t => t.id === id);
      const orderNum = tx?.order_id || "";

      // 1. Remove from local storage on this device
      removeLocalOrders([id], [orderNum]);

      // 2. Remove from Supabase orders by order_number and by ID
      if (orderNum) {
        await supabase.from('orders').delete().eq('order_number', orderNum);
      }
      if (!id.startsWith("preorder-") && !id.startsWith("kiosk-")) {
        await supabase.from('orders').delete().eq('id', id);
      }

      // 3. Broadcast to all open tabs and customer devices
      try {
        const bc = new BroadcastChannel("timpla_my_preorders_channel");
        bc.postMessage({ type: "PREORDER_DELETED", orderIds: [id], orderNumbers: [orderNum] });
        bc.close();
        window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      } catch (e) {}

      await fetchTransactions();
      if (refreshData) await refreshData();
      toast.success("Transaction deleted");
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction: " + (error.message || "Unknown error"));
    }
  };

  const deleteSelectedTransactions = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    try {
      const targetTxs = transactions.filter(t => ids.includes(t.id));
      const targetNums = targetTxs.map(t => t.order_id).filter(Boolean);

      // 1. Remove from local storage
      removeLocalOrders(ids, targetNums);

      // 2. Remove from Supabase by order_number and by ID
      if (targetNums.length > 0) {
        await supabase.from('orders').delete().in('order_number', targetNums);
      }
      const dbIds = ids.filter(id => !id.startsWith("preorder-") && !id.startsWith("kiosk-"));
      if (dbIds.length > 0) {
        await supabase.from('orders').delete().in('id', dbIds);
      }

      // 3. Broadcast to all open tabs and customer devices
      try {
        const bc = new BroadcastChannel("timpla_my_preorders_channel");
        bc.postMessage({ type: "PREORDER_DELETED", orderIds: ids, orderNumbers: targetNums });
        bc.close();
        window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      } catch (e) {}

      await fetchTransactions();
      if (refreshData) await refreshData();
      toast.success(`${ids.length} transaction(s) deleted`);
    } catch (error: any) {
      console.error("Error deleting transactions:", error);
      toast.error("Failed to delete selected transactions: " + (error.message || "Unknown error"));
    }
  };

  const clearTransactions = async () => {
    try {
      // 1. Clear local storage
      localStorage.removeItem("timpla_kiosk_pending_orders");
      localStorage.removeItem("timpla_my_saved_preorders");

      // 2. Clear Supabase orders
      const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn("Supabase clear orders notice:", error);

      // 3. Broadcast clear to all customer devices and open tabs
      try {
        const bc1 = new BroadcastChannel("timpla_kiosk_channel");
        bc1.postMessage({ type: "SYNC_PENDING_ORDERS" });
        bc1.close();

        const bc2 = new BroadcastChannel("timpla_my_preorders_channel");
        bc2.postMessage({ type: "ALL_PREORDERS_CLEARED" });
        bc2.close();

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      } catch (e) {}

      setTransactions([]);
      setTransactionItems([]);
      if (refreshData) await refreshData();
      toast.success("All transactions deleted");
    } catch (error: any) {
      console.error("Error clearing transactions:", error);
      toast.error("Failed to clear transactions");
    }
  };

  const updatePreOrderPaymentStatus = async (id: string, orderNumber: string, newPaymentStatus: string) => {
    let dbStatus = "completed";
    if (newPaymentStatus === "Unpaid") dbStatus = "unpaid";
    else if (newPaymentStatus === "Pending Verification") dbStatus = "verifying";
    else if (newPaymentStatus === "Cash Pending") dbStatus = "pending_counter";
    else if (newPaymentStatus === "Paid") dbStatus = "completed";

    // 0. Optimistically update local transactions state in-place so UI updates instantly with ZERO scroll jump
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id || (orderNumber && t.order_id === orderNumber)) {
          return {
            ...t,
            payment_status: newPaymentStatus,
            status: dbStatus
          };
        }
        return t;
      })
    );

    try {
      // 1. Update in Supabase orders table
      let updatedInDb = false;
      if (orderNumber && orderNumber !== "#PO-LOCAL") {
        const { data: dbRowsByNum } = await supabase
          .from("orders")
          .update({ 
            status: dbStatus,
            fulfillment_status: dbStatus === "completed" ? "completed" : undefined
          })
          .eq("order_number", orderNumber)
          .select();

        if (dbRowsByNum && dbRowsByNum.length > 0) {
          updatedInDb = true;
        }
      }

      if (!updatedInDb && id && !id.startsWith("preorder-") && !id.startsWith("kiosk-")) {
        await supabase
          .from("orders")
          .update({ 
            status: dbStatus,
            fulfillment_status: dbStatus === "completed" ? "completed" : undefined
          })
          .eq("id", id);
      }

      // 2. Update local storage on current device if present
      try {
        const savedPre = localStorage.getItem("timpla_my_saved_preorders");
        if (savedPre) {
          const parsed: any[] = JSON.parse(savedPre);
          const updated = parsed.map((o: any) => {
            if (o.id === id || (o.orderNumber && o.orderNumber === orderNumber)) {
              return { ...o, paymentStatus: newPaymentStatus, status: dbStatus };
            }
            return o;
          });
          localStorage.setItem("timpla_my_saved_preorders", JSON.stringify(updated));
        }

        const savedKiosk = localStorage.getItem("timpla_kiosk_pending_orders");
        if (savedKiosk) {
          const parsed: any[] = JSON.parse(savedKiosk);
          const updated = parsed.filter((o: any) => {
            if (o.id === id || (o.orderNumber && o.orderNumber === orderNumber)) {
              return dbStatus === "pending_counter";
            }
            return true;
          });
          localStorage.setItem("timpla_kiosk_pending_orders", JSON.stringify(updated));
        }

        const activeKiosk = localStorage.getItem("timpla_active_kiosk_order");
        if (activeKiosk) {
          try {
            const activeObj = JSON.parse(activeKiosk);
            if (activeObj.id === id || (orderNumber && activeObj.orderNumber === orderNumber)) {
              if (dbStatus !== "pending_counter") {
                localStorage.removeItem("timpla_active_kiosk_order");
              }
            }
          } catch (e) {}
        }
      } catch (e) {}

      // 3. Broadcast to all open tabs and customer devices
      try {
        const bc1 = new BroadcastChannel("timpla_my_preorders_channel");
        bc1.postMessage({
          type: "PREORDER_PAYMENT_STATUS_UPDATED",
          orderId: id,
          orderNumber: orderNumber,
          paymentStatus: newPaymentStatus,
          status: dbStatus
        });
        bc1.close();

        const bc2 = new BroadcastChannel("timpla_kiosk_channel");
        bc2.postMessage({ type: "SYNC_PENDING_ORDERS" });
        bc2.close();

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("timpla_my_preorders_updated"));
      } catch (e) {}

      await fetchTransactions(false);
      toast.success(`Payment status for ${orderNumber || "order"} set to ${newPaymentStatus.toUpperCase()}`);
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    }
  };

  const exportToExcel = (
    selectedIds?: string[], 
    customTransactions?: Transaction[], 
    categoryLabel?: string
  ) => {
    let txsToExport = customTransactions || transactions;

    if (selectedIds && selectedIds.length > 0) {
      txsToExport = txsToExport.filter(t => selectedIds.includes(t.id));
    }

    if (txsToExport.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    let localOrders: any[] = [];
    try {
      const saved = localStorage.getItem("timpla_kiosk_pending_orders");
      if (saved) localOrders = JSON.parse(saved);
    } catch (e) {}

    const isShirtExport = categoryLabel === "Shirt Pre-orders" || txsToExport.some(t => t.is_pre_order);

    const baseHeaders = ["Order ID", "Date", "Time", "Items Count", "Items Summary", "Total Amount (PHP)", "Payment Status"];
    const headers = isShirtExport 
      ? [...baseHeaders, "Customer Name", "Phone Number", "Email Address", "Fulfillment Status"]
      : baseHeaders;
    
    const rows = txsToExport.map(t => {
      const items = transactionItems.filter(i => i.transaction_id === t.id);
      const itemsSummary = items.map(i => `${i.quantity}x ${i.product_name}`).join("; ");
      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
      const dateObj = new Date(t.timestamp);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString();

      const localMatch = localOrders.find(l => 
        l.id === t.id || 
        (l.orderNumber && t.order_id && l.orderNumber === t.order_id)
      );

      const custName = t.customer_name || localMatch?.customerName || "";
      const custPhone = t.customer_phone || localMatch?.customerPhone || "";
      const custEmail = t.customer_email || localMatch?.customerEmail || "";
      const fulStatus = t.fulfillment_status || localMatch?.fulfillmentStatus || (t.is_pre_order ? "pre_ordered" : "completed");

      const baseRow = [
        t.order_id,
        dateStr,
        timeStr,
        itemsCount,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        t.total_amount.toFixed(2),
        t.payment_method ? t.payment_method.toUpperCase() : "COMPLETED"
      ];

      if (isShirtExport) {
        baseRow.push(
          `"${custName.replace(/"/g, '""')}"`,
          `"${custPhone.replace(/"/g, '""')}"`,
          `"${custEmail.replace(/"/g, '""')}"`,
          fulStatus
        );
      }

      return baseRow;
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const prefix = categoryLabel ? categoryLabel.replace(/\s+/g, "_") : "Transactions";
    const filename = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${txsToExport.length} transaction(s) to Excel!`);
  };

  // Calculate dashboard metrics strictly from PAID transactions (excluding Unpaid / Pay Later items)
  const paidTransactions = transactions.filter(isPaidTransaction);

  const totalSales = paidTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalOrders = paidTransactions.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const paidTxIds = new Set(paidTransactions.map(t => t.id));
  const itemsSold = transactionItems
    .filter(item => paidTxIds.has(item.transaction_id))
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    transactions,
    transactionItems,
    saveTransaction,
    deleteTransaction,
    deleteSelectedTransactions,
    clearTransactions,
    updatePreOrderPaymentStatus,
    exportToExcel,
    refetchTransactions: fetchTransactions,
    isLoading,
    metrics: {
      totalSales,
      totalOrders,
      averageOrderValue,
      itemsSold,
    },
  };
}
