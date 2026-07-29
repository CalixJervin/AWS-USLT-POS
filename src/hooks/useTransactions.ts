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

  const clearTransactions = async () => {
    // This might be dangerous in production, but following original logic
    const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast.error("Failed to clear transactions");
    } else {
      setTransactions([]);
      setTransactionItems([]);
      toast.success("Transactions cleared");
    }
  };

  const totalSales = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalOrders = transactions.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  const itemsSold = transactionItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    transactions,
    transactionItems,
    saveTransaction,
    clearTransactions,
    isLoading,
    metrics: {
      totalSales,
      totalOrders,
      averageOrderValue,
      itemsSold,
    },
  };
}
