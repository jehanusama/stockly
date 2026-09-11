import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const AppContext = createContext();

export function AppProvider({ children }) {
  const { session } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
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
      const [catRes, prodRes, custRes, ordRes, batchRes, payRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*, categories(*)").order("name"),
        supabase.from("customers").select("*").order("name"),
        supabase.from("orders").select("*, order_items(*)").order("order_date", { ascending: false }),
        supabase.from("product_batches").select("*").order("purchase_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      if (custRes.error) throw custRes.error;
      if (ordRes.error) throw ordRes.error;

      const fetchedBatches = (batchRes.data || []).map((b) => ({
        ...b,
        cost_price: Number(b.cost_price ?? 0),
        quantity_received: Number(b.quantity_received ?? 0),
        quantity_remaining: Number(b.quantity_remaining ?? 0),
      }));

      setCategories(catRes.data || []);
      setProducts(
        (prodRes.data || []).map((p) => {
          const pBatches = fetchedBatches.filter((b) => b.product_id === p.id);
          const sumRemaining = pBatches.reduce((sum, b) => sum + b.quantity_remaining, 0);
          const latestBatchCost = pBatches.length > 0 ? pBatches[0].cost_price : Number(p.cost_price ?? 0);
          return {
            ...p,
            cost_price: latestBatchCost,
            stock_quantity: pBatches.length > 0 ? sumRemaining : Number(p.stock_quantity ?? 0),
            batches: pBatches,
          };
        })
      );
      setCustomers(custRes.data || []);
      setOrders(
        (ordRes.data || []).map((o) => {
          const finalTot = Number(o.final_total ?? 0);
          const amtPaid = Number(o.amount_paid ?? 0);
          const balDue = Number(o.balance_due ?? Math.max(0, finalTot - amtPaid));
          return {
            ...o,
            subtotal: Number(o.subtotal ?? 0),
            discount_value: Number(o.discount_value ?? 0),
            final_total: finalTot,
            final_profit: Number(o.final_profit ?? 0),
            amount_paid: amtPaid,
            balance_due: balDue,
            items: (o.order_items || []).map((item) => ({
              ...item,
              quantity: Number(item.quantity ?? 0),
              sale_price: Number(item.sale_price ?? 0),
              line_total: Number(item.line_total ?? 0),
              line_profit: Number(item.line_profit ?? 0),
            })),
          };
        })
      );
      setPayments(
        (payRes.data || []).map((p) => ({
          ...p,
          amount: Number(p.amount ?? 0),
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

  // -- Products & Batches --
  const addProduct = async (product) => {
    try {
      const payload = {
        name: product.name,
        cost_price: Number(product.cost_price ?? 0),
        stock_quantity: 0,
        unit: product.unit || "kilo",
        category_id: product.category_id,
      };

      const { data, error } = await supabase
        .from("products")
        .insert([payload])
        .select("*, categories(*)");

      if (error) throw error;
      const created = data[0];

      const initialQty = Number(product.stock_quantity ?? 0);
      const initialCost = Number(product.cost_price ?? 0);

      if (initialQty > 0) {
        const batchPayload = {
          product_id: created.id,
          cost_price: initialCost,
          quantity_received: initialQty,
          quantity_remaining: initialQty,
          purchase_date: new Date().toISOString().split("T")[0],
        };
        const { error: batchErr } = await supabase
          .from("product_batches")
          .insert([batchPayload]);
        if (batchErr) {
          console.error("Error inserting initial batch for product:", batchErr);
        }
      }

      await fetchData();
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
        unit: updatedProduct.unit || "kilo",
        category_id: updatedProduct.category_id,
      };

      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", updatedProduct.id)
        .select("*, categories(*)");

      if (error) throw error;
      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error updating product:", err);
      return { success: false, error: err.message || "Failed to update product" };
    }
  };

  const addStockBatch = async ({ product_id, cost_price, quantity_received, purchase_date }) => {
    try {
      const qty = Number(quantity_received);
      const cost = Number(cost_price);
      if (!product_id || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
        return { success: false, error: "Invalid batch parameters" };
      }

      const payload = {
        product_id,
        cost_price: cost,
        quantity_received: qty,
        quantity_remaining: qty,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
      };

      const { data, error } = await supabase
        .from("product_batches")
        .insert([payload])
        .select();

      if (error) throw error;

      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error adding stock batch:", err);
      return { success: false, error: err.message || "Failed to add stock batch" };
    }
  };

  const editBatch = async ({ id, cost_price, quantity_received, purchase_date }) => {
    try {
      const qty = Number(quantity_received);
      const cost = Number(cost_price);
      if (!id || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
        return { success: false, error: "Invalid batch parameters" };
      }

      const payload = {
        cost_price: cost,
        quantity_received: qty,
        quantity_remaining: qty,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
      };

      const { data, error } = await supabase
        .from("product_batches")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;

      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error editing batch:", err);
      return { success: false, error: err.message || "Failed to edit batch" };
    }
  };

  const deleteBatch = async (id) => {
    try {
      const { error } = await supabase
        .from("product_batches")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting batch:", err);
      return { success: false, error: err.message || "Failed to delete batch" };
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
      // 1. Fetch all active product batches sorted by purchase_date ASC, created_at ASC
      const { data: allBatches, error: fetchBatchesErr } = await supabase
        .from("product_batches")
        .select("*")
        .gt("quantity_remaining", 0)
        .order("purchase_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchBatchesErr) throw fetchBatchesErr;

      let localBatches = (allBatches || []).map((b) => ({
        ...b,
        cost_price: Number(b.cost_price ?? 0),
        quantity_remaining: Number(b.quantity_remaining ?? 0),
      }));

      const itemConsumptions = []; // { itemIdx, batch_id, quantity_consumed }
      const batchUpdates = {}; // { batch_id: new_quantity_remaining }
      let totalOrderCostBasis = 0;

      const processedItems = (order.items || []).map((item, itemIdx) => {
        const qtyNeeded = Number(item.quantity);
        let remainingNeeded = qtyNeeded;
        let lineCostBasis = 0;

        const pBatches = localBatches.filter(
          (b) => b.product_id === item.product_id && b.quantity_remaining > 0
        );

        for (const batch of pBatches) {
          if (remainingNeeded <= 0) break;
          const takeQty = Math.min(batch.quantity_remaining, remainingNeeded);
          batch.quantity_remaining -= takeQty;
          remainingNeeded -= takeQty;

          const consumedCost = takeQty * batch.cost_price;
          lineCostBasis += consumedCost;

          itemConsumptions.push({
            itemIdx,
            batch_id: batch.id,
            quantity_consumed: takeQty,
          });

          batchUpdates[batch.id] = batch.quantity_remaining;
        }

        const salePrice = Number(item.sale_price);
        const lineTotal = Number(item.line_total ?? qtyNeeded * salePrice);
        const lineProfit = lineTotal - lineCostBasis;

        totalOrderCostBasis += lineCostBasis;

        return {
          product_id: item.product_id,
          quantity: qtyNeeded,
          sale_price: salePrice,
          line_total: lineTotal,
          cost_basis: lineCostBasis,
          line_profit: lineProfit,
        };
      });

      const subtotal = Number(order.subtotal || 0);
      const discountVal = Number(order.discount_value || 0);
      const finalTotal = Number(order.final_total || 0);
      const finalProfit = finalTotal - totalOrderCostBasis;

      // 2. Insert order
      const orderPayload = {
        customer_id: order.customer_id || null,
        order_date: order.order_date || new Date().toISOString(),
        discount_type: order.discount_type || "none",
        discount_value: discountVal,
        subtotal,
        final_total: finalTotal,
        final_profit: finalProfit,
      };

      const { data: insertedOrders, error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select();

      if (orderError) throw orderError;
      const createdOrder = insertedOrders[0];

      // 3. Insert order_items with cost_basis
      const itemsPayload = processedItems.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        sale_price: item.sale_price,
        line_total: item.line_total,
        cost_basis: item.cost_basis,
        line_profit: item.line_profit,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsPayload)
        .select();

      if (itemsError) throw itemsError;

      // 4. Insert order_item_batch_consumptions
      const consumptionPayload = itemConsumptions.map((c) => ({
        order_item_id: insertedItems[c.itemIdx].id,
        batch_id: c.batch_id,
        quantity_consumed: c.quantity_consumed,
      }));

      if (consumptionPayload.length > 0) {
        const { error: consumeErr } = await supabase
          .from("order_item_batch_consumptions")
          .insert(consumptionPayload);

        if (consumeErr) {
          console.error("Error inserting batch consumptions:", consumeErr);
        }
      }

      // 5b. Insert initial payment if amount_paid_now > 0
      const amountPaidNow = order.amount_paid_now !== undefined
        ? Number(order.amount_paid_now)
        : finalTotal;

      if (amountPaidNow > 0 && createdOrder.id && createdOrder.customer_id) {
        const paymentPayload = {
          order_id: createdOrder.id,
          customer_id: createdOrder.customer_id,
          amount: amountPaidNow,
          payment_date: (order.order_date || new Date().toISOString()).slice(0, 10),
          notes: "Initial payment upon order creation",
        };
        const { error: payErr } = await supabase
          .from("payments")
          .insert([paymentPayload]);

        if (payErr) {
          console.error("Error inserting initial payment:", payErr);
        }
      }

      // 6. Refetch context data to sync state
      await fetchData();

      const formattedOrder = {
        ...createdOrder,
        subtotal: Number(createdOrder.subtotal),
        discount_value: Number(createdOrder.discount_value),
        final_total: Number(createdOrder.final_total),
        final_profit: Number(createdOrder.final_profit),
        amount_paid: amountPaidNow,
        balance_due: Math.max(0, Number(createdOrder.final_total) - amountPaidNow),
        items: (insertedItems || []).map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          sale_price: Number(item.sale_price),
          line_total: Number(item.line_total),
          cost_basis: Number(item.cost_basis ?? 0),
          line_profit: Number(item.line_profit),
        })),
      };

      return { success: true, data: formattedOrder };
    } catch (err) {
      console.error("Error adding order:", err);
      return { success: false, error: err.message || "Failed to add order" };
    }
  };

  const deleteOrder = async (id) => {
    try {
      // 1. Get order items for this order
      const { data: orderItems, error: itemsErr } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", id);

      if (itemsErr) throw itemsErr;

      const itemIds = (orderItems || []).map((i) => i.id);

      if (itemIds.length > 0) {
        // 2. Fetch consumption records for these order items
        const { data: consumptions, error: consumeErr } = await supabase
          .from("order_item_batch_consumptions")
          .select("*")
          .in("order_item_id", itemIds);

        if (consumeErr) throw consumeErr;

        if (consumptions && consumptions.length > 0) {
          const batchRestorations = {};
          for (const c of consumptions) {
            const qty = Number(c.quantity_consumed);
            batchRestorations[c.batch_id] = (batchRestorations[c.batch_id] || 0) + qty;
          }

          const batchIds = Object.keys(batchRestorations);
          const { data: targetBatches, error: fetchTBatErr } = await supabase
            .from("product_batches")
            .select("id, quantity_remaining")
            .in("id", batchIds);

          if (fetchTBatErr) throw fetchTBatErr;

          for (const batch of targetBatches || []) {
            const restoreQty = batchRestorations[batch.id] || 0;
            const newRemaining = Number(batch.quantity_remaining ?? 0) + restoreQty;

            const { error: restoreErr } = await supabase
              .from("product_batches")
              .update({ quantity_remaining: newRemaining })
              .eq("id", batch.id);

            if (restoreErr) {
              console.error("Error restoring batch remaining qty:", restoreErr);
            }
          }
        }
      }

      // 3. Delete order (cascade deletes items and consumptions)
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // 4. Refetch full state
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
    payments,
    categories,
    isLoading,
    error,
    refreshData: fetchData,
    addProduct,
    updateProduct,
    deleteProduct,
    addStockBatch,
    editBatch,
    deleteBatch,
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
