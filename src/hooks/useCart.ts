// hooks/useCart.ts
import { useState, useCallback, useMemo } from "react";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  variantId?: string; // Added for Supabase
  size?: string;      // Added for Supabase
  inStock?: boolean;
}

export interface CartItem extends Product {
  qty: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, qty: item.qty + delta } : item
      )
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