import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const AppContext = createContext();

export function AppProvider({ children }) {
  const { session } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [catRes, prodRes, custRes, ordRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*, categories(*)").order("name"),
        supabase.from("customers").select("*").order("name"),
        supabase.from("orders").select("*, order_items(*)").order("order_date", { ascending: false }),
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      if (custRes.error) throw custRes.error;
      if (ordRes.error) throw ordRes.error;

      setCategories(catRes.data || []);
      setProducts(
        (prodRes.data || []).map((p) => ({
          ...p,
          cost_price: Number(p.cost_price ?? 0),
          stock_quantity: Number(p.stock_quantity ?? 0),
        }))
      );
      setCustomers(custRes.data || []);
      setOrders(
        (ordRes.data || []).map((o) => ({
          ...o,
          subtotal: Number(o.subtotal ?? 0),
          discount_value: Number(o.discount_value ?? 0),
          final_total: Number(o.final_total ?? 0),
          final_profit: Number(o.final_profit ?? 0),
          items: (o.order_items || []).map((item) => ({
            ...item,
            quantity: Number(item.quantity ?? 0),
            sale_price: Number(item.sale_price ?? 0),
            line_total: Number(item.line_total ?? 0),
            line_profit: Number(item.line_profit ?? 0),
          })),
        }))
      );
    } catch (err) {
      console.error("Error fetching data from Supabase:", err);
      setError(err.message || "Failed to load data from Supabase");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        fetchData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [session, fetchData]);

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
      (order.items || []).forEach(item => {
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
      (orderToDelete.items || []).forEach(item => {
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
    isLoading,
    error,
    refreshData: fetchData,
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
