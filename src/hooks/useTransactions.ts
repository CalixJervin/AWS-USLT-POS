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
      if (!saved) return;
      const parsed: any[] = JSON.parse(saved);
      const updated = parsed.filter(o => 
        !targetIds.includes(o.id) && 
        !(o.orderNumber && targetOrderNumbers.includes(o.orderNumber))
      );
      localStorage.setItem("timpla_kiosk_pending_orders", JSON.stringify(updated));
      
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

      // Load local pending/pre-orders from localStorage to ensure offline or fallback contact details are preserved
      let localOrders: any[] = [];
      try {
        const saved = localStorage.getItem("timpla_kiosk_pending_orders");
        if (saved) localOrders = JSON.parse(saved);
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

        const isPreOrder = o.fulfillment_status === "pre_ordered" || 
                           localMatch?.fulfillmentStatus === "pre_ordered" ||
                           (o.order_number && o.order_number.startsWith("#PO-")) ||
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

      setTransactions(Array.from(txMap.values()));
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

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("timpla_kiosk_channel");
      bc.onmessage = () => {
        fetchTransactions();
      };
    } catch (e) {}

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (bc) bc.close();
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

      // 1. Remove from local storage
      removeLocalOrders([id], [orderNum]);

      // 2. Remove from Supabase if DB id
      if (!id.startsWith("preorder-") && !id.startsWith("kiosk-")) {
        await supabase.from('orders').delete().eq('id', id);
      }

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

      // 2. Remove from Supabase
      const dbIds = ids.filter(id => !id.startsWith("preorder-") && !id.startsWith("kiosk-"));
      if (dbIds.length > 0) {
        await supabase.from('orders').delete().in('id', dbIds);
      }

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
      try {
        const bc = new BroadcastChannel("timpla_kiosk_channel");
        bc.postMessage({ type: "SYNC_PENDING_ORDERS" });
        bc.close();
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}

      // 2. Clear Supabase orders
      const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.warn("Supabase clear orders notice:", error);

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
