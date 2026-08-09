import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  variantId?: string; // Added for Supabase
  size?: string;      // Added for Supabase
  inStock?: boolean;
  isPreOrder?: boolean;
  type?: string;
  quantity?: number;
  variants?: any[];
}

export interface CartItem extends Product {
  qty: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.id === product.id && (item.size || "Regular") === (product.size || "Regular")
      );

      const currentQty = existingItem ? existingItem.qty : 0;
      const maxAvailable = product.quantity !== undefined ? product.quantity : (product.inStock === false ? 0 : 999);

      if (currentQty + 1 > maxAvailable) {
        toast.warning(`Cannot add more "${product.name}". Only ${maxAvailable} left in stock.`);
        return prevCart;
      }

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id && (item.size || "Regular") === (product.size || "Regular")
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          const maxAvailable = item.quantity !== undefined ? item.quantity : (item.inStock === false ? 0 : 999);
          if (delta > 0 && newQty > maxAvailable) {
            toast.warning(`Maximum available stock reached for "${item.name}" (${maxAvailable} left).`);
            return { ...item, qty: maxAvailable };
          }
          return { ...item, qty: newQty };
        }
        return item;
      })
      .filter((item) => item.qty > 0)
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const total = subtotal;

  // Return exactly what the UI needs to function
  return {
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    subtotal,
    total
  };
}