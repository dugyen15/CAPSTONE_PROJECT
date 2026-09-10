"use client";

import { createContext, useContext, useState } from "react";

const OrderContext = createContext(null);

// Holds whatever the customer last confirmed on the menu page, so the
// orders page can show it instead of the static demo order. Nothing here
// persists across a refresh — it's in-memory only, same as the rest of
// this app's mock state.
export function OrderProvider({ children }) {
  const [orderItems, setOrderItems] = useState([]);
  const [orderType, setOrderType] = useState(null);
  const [hasOrder, setHasOrder] = useState(false);

  function confirmOrder(items, type) {
    setOrderItems(items);
    if (type) setOrderType(type);
    setHasOrder(true);
  }

  return (
    <OrderContext.Provider
      value={{ orderItems, orderType, hasOrder, confirmOrder }}
    >
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