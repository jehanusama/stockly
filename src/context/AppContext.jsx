import { createContext, useContext, useState } from "react";
import { mockProducts as initialProducts } from "@/data/mockProducts";
import { mockCustomers as initialCustomers } from "@/data/mockCustomers";
import { mockOrders as initialOrders } from "@/data/mockOrders";
import { mockCategories as initialCategories } from "@/data/mockCategories";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [products, setProducts] = useState(initialProducts);
  const [customers, setCustomers] = useState(initialCustomers);
  const [orders, setOrders] = useState(initialOrders);
  const [categories, setCategories] = useState(initialCategories);

  // -- Categories --
  const addCategory = (category) => setCategories((prev) => [category, ...prev]);

  const updateCategory = (updatedCategory) =>
    setCategories((prev) => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));

  const deleteCategory = (id) => {
    const isReferenced = products.some(p => p.category_id === id);
    if (isReferenced) {
      throw new Error("Cannot delete category because it is still referenced by one or more products.");
    }
    setCategories((prev) => prev.filter(c => c.id !== id));
  };

  // -- Products --
  const addProduct = (product) => setProducts((prev) => [product, ...prev]);
  
  const updateProduct = (updatedProduct) => 
    setProducts((prev) => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  
  const deleteProduct = (id) => 
    setProducts((prev) => prev.filter(p => p.id !== id));

  // -- Customers --
  const addCustomer = (customer) => setCustomers((prev) => [customer, ...prev]);
  
  const updateCustomer = (updatedCustomer) => 
    setCustomers((prev) => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));

  // -- Orders --
  const addOrder = (order) => {
    setOrders((prev) => [order, ...prev]);
    
    // Decrement stock for each item in the order
    setProducts((prev) => {
      const nextProducts = [...prev];
      order.items.forEach(item => {
        const pIndex = nextProducts.findIndex(p => p.id === item.product_id);
        if (pIndex !== -1) {
          const newQty = Math.max(0, nextProducts[pIndex].stock_quantity - item.quantity);
          nextProducts[pIndex] = {
            ...nextProducts[pIndex],
            stock_quantity: Math.round(newQty * 100) / 100
          };
        }
      });
      return nextProducts;
    });
  };

  const deleteOrder = (id) => {
    const orderToDelete = orders.find(o => o.id === id);
    if (!orderToDelete) return;
    
    setOrders((prev) => prev.filter(o => o.id !== id));
    
    // Restore stock for each item in the deleted order
    setProducts((prev) => {
      const nextProducts = [...prev];
      orderToDelete.items.forEach(item => {
        const pIndex = nextProducts.findIndex(p => p.id === item.product_id);
        if (pIndex !== -1) {
          const newQty = nextProducts[pIndex].stock_quantity + item.quantity;
          nextProducts[pIndex] = {
            ...nextProducts[pIndex],
            stock_quantity: Math.round(newQty * 100) / 100
          };
        }
      });
      return nextProducts;
    });
  };

  const updateOrderDate = (id, newDateISO) => {
    setOrders((prev) => prev.map(o => 
      o.id === id ? { ...o, order_date: newDateISO } : o
    ));
  };

  const value = {
    products,
    customers,
    orders,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    addOrder,
    deleteOrder,
    updateOrderDate,
    addCategory,
    updateCategory,
    deleteCategory
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppData must be used within an AppProvider");
  }
  return context;
}
