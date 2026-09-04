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
  const addCategory = async (category) => {
    try {
      const payload = { name: category.name };
      const { data, error } = await supabase
        .from("categories")
        .insert([payload])
        .select();

      if (error) throw error;
      const created = data[0];
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return { success: true, data: created };
    } catch (err) {
      console.error("Error adding category:", err);
      return { success: false, error: err.message || "Failed to add category" };
    }
  };

  const updateCategory = async (updatedCategory) => {
    try {
      const payload = { name: updatedCategory.name };
      const { data, error } = await supabase
        .from("categories")
        .update(payload)
        .eq("id", updatedCategory.id)
        .select();

      if (error) throw error;
      const updated = data[0] || updatedCategory;
      setCategories((prev) =>
        prev
          .map((c) => (c.id === updatedCategory.id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      return { success: true, data: updated };
    } catch (err) {
      console.error("Error updating category:", err);
      return { success: false, error: err.message || "Failed to update category" };
    }
  };

  const deleteCategory = async (id) => {
    const isReferenced = products.some((p) => p.category_id === id);
    if (isReferenced) {
      const msg = "Cannot delete category because it is still referenced by one or more products.";
      return { success: false, error: msg };
    }

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return { success: true };
    } catch (err) {
      console.error("Error deleting category:", err);
      return { success: false, error: err.message || "Failed to delete category" };
    }
  };

  // -- Products --
  const addProduct = async (product) => {
    try {
      const payload = {
        name: product.name,
        cost_price: Number(product.cost_price ?? 0),
        stock_quantity: Number(product.stock_quantity ?? 0),
        unit: product.unit || "kilo",
        category_id: product.category_id,
      };

      const { data, error } = await supabase
        .from("products")
        .insert([payload])
        .select("*, categories(*)");

      if (error) throw error;
      const created = {
        ...data[0],
        cost_price: Number(data[0].cost_price),
        stock_quantity: Number(data[0].stock_quantity),
      };

      setProducts((prev) => [created, ...prev]);
      return { success: true, data: created };
    } catch (err) {
      console.error("Error adding product:", err);
      return { success: false, error: err.message || "Failed to add product" };
    }
  };

  const updateProduct = async (updatedProduct) => {
    try {
      const payload = {
        name: updatedProduct.name,
        cost_price: Number(updatedProduct.cost_price ?? 0),
        stock_quantity: Number(updatedProduct.stock_quantity ?? 0),
        unit: updatedProduct.unit || "kilo",
        category_id: updatedProduct.category_id,
      };

      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", updatedProduct.id)
        .select("*, categories(*)");

      if (error) throw error;
      const updated = {
        ...data[0],
        cost_price: Number(data[0].cost_price),
        stock_quantity: Number(data[0].stock_quantity),
      };

      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updated : p))
      );
      return { success: true, data: updated };
    } catch (err) {
      console.error("Error updating product:", err);
      return { success: false, error: err.message || "Failed to update product" };
    }
  };

  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return { success: true };
    } catch (err) {
      console.error("Error deleting product:", err);
      return { success: false, error: err.message || "Failed to delete product" };
    }
  };

  // -- Customers --
  const addCustomer = async (customer) => {
    try {
      const payload = {
        name: customer.name,
        phone: customer.phone || null,
        notes: customer.notes || null,
      };

      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select();

      if (error) throw error;
      const created = data[0];
      setCustomers((prev) => [created, ...prev]);
      return { success: true, data: created };
    } catch (err) {
      console.error("Error adding customer:", err);
      return { success: false, error: err.message || "Failed to add customer" };
    }
  };

  const updateCustomer = async (updatedCustomer) => {
    try {
      const payload = {
        name: updatedCustomer.name,
        phone: updatedCustomer.phone || null,
        notes: updatedCustomer.notes || null,
      };

      const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", updatedCustomer.id)
        .select();

      if (error) throw error;
      const updated = data[0] || updatedCustomer;
      setCustomers((prev) =>
        prev.map((c) => (c.id === updatedCustomer.id ? updated : c))
      );
      return { success: true, data: updated };
    } catch (err) {
      console.error("Error updating customer:", err);
      return { success: false, error: err.message || "Failed to update customer" };
    }
  };

  const deleteCustomer = async (id) => {
    const isReferenced = orders.some((o) => o.customer_id === id);
    if (isReferenced) {
      const msg = "Cannot delete customer because they have existing order history.";
      return { success: false, error: msg };
    }

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase customer delete error:", error);
        return {
          success: false,
          error: "Cannot delete customer because they have existing order history.",
        };
      }

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      return { success: true };
    } catch (err) {
      console.error("Error deleting customer:", err);
      return {
        success: false,
        error: "Cannot delete customer because they have existing order history.",
      };
    }
  };

  // -- Orders --
  const addOrder = async (order) => {
    try {
      const orderPayload = {
        customer_id: order.customer_id || null,
        order_date: order.order_date || new Date().toISOString(),
        discount_type: order.discount_type || "none",
        discount_value: Number(order.discount_value || 0),
        subtotal: Number(order.subtotal || 0),
        final_total: Number(order.final_total || 0),
        final_profit: Number(order.final_profit || 0),
      };

      const { data: insertedOrders, error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select();

      if (orderError) throw orderError;
      const createdOrder = insertedOrders[0];

      const itemsPayload = (order.items || []).map((item) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        sale_price: Number(item.sale_price),
        line_total: Number(item.line_total),
        line_profit: Number(item.line_profit),
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload)
        .select();

      if (itemsError) throw itemsError;

      const formattedOrder = {
        ...createdOrder,
        subtotal: Number(createdOrder.subtotal),
        discount_value: Number(createdOrder.discount_value),
        final_total: Number(createdOrder.final_total),
        final_profit: Number(createdOrder.final_profit),
        items: (insertedItems || []).map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          sale_price: Number(item.sale_price),
          line_total: Number(item.line_total),
          line_profit: Number(item.line_profit),
        })),
      };

      setOrders((prev) => [formattedOrder, ...prev]);

      // Refetch products so local product stock matches post-trigger DB state
      await fetchData();

      return { success: true, data: formattedOrder };
    } catch (err) {
      console.error("Error adding order:", err);
      return { success: false, error: err.message || "Failed to add order" };
    }
  };

  const deleteOrder = async (id) => {
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== id));

      // Refetch products so restored stock matches post-trigger DB state
      await fetchData();

      return { success: true };
    } catch (err) {
      console.error("Error deleting order:", err);
      return { success: false, error: err.message || "Failed to delete order" };
    }
  };

  const updateOrderDate = async (id, newDateISO) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ order_date: newDateISO })
        .eq("id", id)
        .select();

      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, order_date: newDateISO } : o))
      );
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error updating order date:", err);
      return { success: false, error: err.message || "Failed to update order date" };
    }
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
    deleteCustomer,
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
