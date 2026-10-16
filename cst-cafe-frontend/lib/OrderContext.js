"use client";

import { createContext, useContext, useState } from "react";

const OrderContext = createContext(null);

// Holds the items the customer picked on the menu page until they place the
// order on the orders page. (The placed order itself lives in the database.)
export function OrderProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  function startCheckout(items) {
    setCartItems(items);
  }

  function clearCart() {
    setCartItems([]);
  }

  return (
    <OrderContext.Provider value={{ cartItems, setCartItems, startCheckout, clearCart }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}
