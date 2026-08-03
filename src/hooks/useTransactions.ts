import { useState, useEffect, useCallback } from "react";
import type { CartItem } from "./useCart";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";
import { useInventory } from "@/context/InventoryContext";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  order_id: string; 
  total_amount: number;
  payment_method: string;
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

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { refreshData } = useInventory();

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
      
      const bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
      bc.close();
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

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
        let localMatch = localOrders.find(l => 
          l.id === o.id || 
          (l.orderNumber && o.order_number && l.orderNumber === o.order_number)
        );

        if (!localMatch && (!o.order_number || o.order_number.startsWith("#ORD-"))) {
          // Try fuzzy match with local pre-orders by total & time proximity (within 10 mins)
          localMatch = localOrders.find(l => 
            Math.abs(Number(l.total) - Number(o.total)) < 0.01 &&
            l.createdAt && o.created_at &&
            Math.abs(new Date(l.createdAt).getTime() - new Date(o.created_at).getTime()) < 600000
          );
        }

        const custName = o.customer_name || localMatch?.customerName || undefined;
        const custEmail = o.customer_email || localMatch?.customerEmail || undefined;
        const custPhone = o.customer_phone || localMatch?.customerPhone || undefined;

        const isPreOrder = o.fulfillment_status === "pre_ordered" || 
                           localMatch?.fulfillmentStatus === "pre_ordered" ||
                           (o.order_number && o.order_number.startsWith("#PO-")) ||
                           (localMatch?.orderNumber && localMatch.orderNumber.startsWith("#PO-")) ||
                           orderItems.some((i: any) => 
                             (i.product_name && (i.product_name.toLowerCase().includes("shirt") || i.product_name.toLowerCase().includes("merch") || i.product_name.toLowerCase().includes("pin") || i.product_name.toLowerCase().includes("lace")))
                           ) || 
                           !!custName || 
                           !!custPhone;

        txMap.set(o.id, {
          id: o.id,
          order_id: o.order_number || localMatch?.orderNumber || `#ORD-${o.id.slice(0, 4).toUpperCase()}`,
          total_amount: Number(o.total),
          payment_method: o.payment_method || localMatch?.paymentMethod || "cash", 
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

      // Merge local pre-orders ONLY if not already present by ID or order_number
      localOrders.forEach(l => {
        const existingTx = Array.from(txMap.values()).find(
          tx => tx.id === l.id || (l.orderNumber && tx.order_id === l.orderNumber)
        );

        if (!existingTx && (l.fulfillmentStatus === "pre_ordered" || (l.orderNumber && l.orderNumber.startsWith("#PO-")))) {
          txMap.set(l.id, {
            id: l.id,
            order_id: l.orderNumber || `#PO-LOCAL`,
            total_amount: Number(l.total),
            payment_method: l.paymentMethod || "cash",
            timestamp: l.createdAt || new Date().toISOString(),
            customer_name: l.customerName,
            customer_email: l.customerEmail,
            customer_phone: l.customerPhone,
            fulfillment_status: l.fulfillmentStatus || "pre_ordered",
            is_pre_order: true
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
        } else if (existingTx) {
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
          if (existing.order_id && tx.order_id && existing.order_id === tx.order_id) return true;

          const isSameAmount = Math.abs(existing.total_amount - tx.total_amount) < 0.01;
          const timeDiff = Math.abs(new Date(existing.timestamp).getTime() - new Date(tx.timestamp).getTime());
          const isCloseInTime = timeDiff < 600000; // 10 minutes

          const oneIsPO = existing.order_id.startsWith("#PO-") || tx.order_id.startsWith("#PO-");
          const oneIsGeneric = existing.order_id.startsWith("#ORD-") || tx.order_id.startsWith("#ORD-");

          return isSameAmount && isCloseInTime && oneIsPO && oneIsGeneric;
        });

        if (duplicateIdx === -1) {
          deduplicated.push(tx);
        } else {
          const existing = deduplicated[duplicateIdx];
          const preferTx = (tx.order_id.startsWith("#PO-") || (tx.customer_name && !existing.customer_name)) ? tx : existing;
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

      setTransactions(deduplicated);
      setTransactionItems(items);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();

    const handleStorageChange = () => {
      fetchTransactions();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("timpla_my_preorders_updated", handleStorageChange);

    let bc1: BroadcastChannel | null = null;
    let bc2: BroadcastChannel | null = null;
    try {
      bc1 = new BroadcastChannel("timpla_kiosk_channel");
      bc1.onmessage = () => fetchTransactions();

      bc2 = new BroadcastChannel("timpla_my_preorders_channel");
      bc2.onmessage = () => fetchTransactions();
    } catch (e) {}

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("timpla_my_preorders_updated", handleStorageChange);
      if (bc1) bc1.close();
      if (bc2) bc2.close();
    };
  }, [fetchTransactions]);

  const saveTransaction = async (cart: CartItem[], total: number, _paymentMethod: "cash" | "gcash") => {
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

      // Call the atomic stored procedure
      const { data: _orderId, error: rpcError } = await supabase.rpc('create_complete_order', {
        p_staff_id: user?.id,
        p_total: total,
        p_items: rpcItems
      });

      if (rpcError) throw rpcError;

      await fetchTransactions();
      await refreshData();
      toast.success("Transaction saved successfully");
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast.error("Failed to save transaction: " + (error.message || "Unknown error"));
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
      await refreshData();
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
      await refreshData();
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
      await refreshData();
      toast.success("All transactions deleted");
    } catch (error: any) {
      console.error("Error clearing transactions:", error);
      toast.error("Failed to clear transactions");
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

  const totalSales = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalOrders = transactions.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const itemsSold = transactionItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    transactions,
    transactionItems,
    saveTransaction,
    deleteTransaction,
    deleteSelectedTransactions,
    clearTransactions,
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
