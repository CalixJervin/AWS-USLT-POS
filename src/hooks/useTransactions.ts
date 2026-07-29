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

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const txs: Transaction[] = (orders || []).map(o => ({
        id: o.id,
        order_id: `#ORD-${o.id.slice(0, 4).toUpperCase()}`,
        total_amount: Number(o.total),
        payment_method: "cash", 
        timestamp: o.created_at
      }));

      const items: TransactionItem[] = [];
      (orders || []).forEach(o => {
        (o.order_items || []).forEach((item: any) => {
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

      setTransactions(txs);
      setTransactionItems(items);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
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

      // Handle low stock warnings (returned by deduct_stock_on_sale inside the RPC)
      // Actually, create_complete_order returns the orderId. 
      // If we want low stock warnings, we could modify create_complete_order to return them,
      // but for now, the primary goal is atomicity and safety.
      
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
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
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
      const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setTransactions([]);
      setTransactionItems([]);
      await refreshData();
      toast.success("All transactions deleted");
    } catch (error: any) {
      console.error("Error clearing transactions:", error);
      toast.error("Failed to clear transactions");
    }
  };

  const exportToExcel = (selectedIds?: string[]) => {
    const txsToExport = selectedIds && selectedIds.length > 0
      ? transactions.filter(t => selectedIds.includes(t.id))
      : transactions;

    if (txsToExport.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = ["Order ID", "Date", "Time", "Items Count", "Items Summary", "Total Amount (PHP)", "Payment Status"];
    
    const rows = txsToExport.map(t => {
      const items = transactionItems.filter(i => i.transaction_id === t.id);
      const itemsSummary = items.map(i => `${i.quantity}x ${i.product_name}`).join("; ");
      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
      const dateObj = new Date(t.timestamp);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString();

      return [
        t.order_id,
        dateStr,
        timeStr,
        itemsCount,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        t.total_amount.toFixed(2),
        t.payment_method ? t.payment_method.toUpperCase() : "COMPLETED"
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
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
