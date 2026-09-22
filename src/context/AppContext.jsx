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
  const [printedItems, setPrintedItems] = useState([]);
  const [printedBatches, setPrintedBatches] = useState([]);
  const [printedSales, setPrintedSales] = useState([]);
  const [printedPayments, setPrintedPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [
        catRes,
        prodRes,
        custRes,
        ordRes,
        batchRes,
        payRes,
        printedItemRes,
        printedBatchRes,
        printedSaleRes,
        printedPayRes,
      ] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*, categories(*)").order("name"),
        supabase.from("customers").select("*").order("name"),
        supabase.from("orders").select("*, order_items(*)").order("order_date", { ascending: false }),
        supabase.from("product_batches").select("*").order("purchase_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("printed_items").select("*").order("name"),
        supabase.from("printed_batches").select("*").order("purchase_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("printed_sales").select("*, customers(*), printed_items(*)").order("sale_date", { ascending: false }),
        supabase.from("printed_payments").select("*").order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      if (custRes.error) throw custRes.error;
      if (ordRes.error) throw ordRes.error;
      if (printedItemRes.error) throw printedItemRes.error;
      if (printedBatchRes.error) throw printedBatchRes.error;
      if (printedSaleRes.error) throw printedSaleRes.error;
      if (printedPayRes.error) throw printedPayRes.error;

      // Calculate total quantity sold per product across ALL order items ever created
      const totalSoldPerProduct = {};
      (ordRes.data || []).forEach((o) => {
        (o.order_items || []).forEach((item) => {
          if (item.product_id) {
            totalSoldPerProduct[item.product_id] =
              (totalSoldPerProduct[item.product_id] || 0) + Number(item.quantity ?? 0);
          }
        });
      });

      // Process batches per product using FIFO allocation from totalSoldPerProduct
      const rawBatches = (batchRes.data || []).map((b) => ({
        ...b,
        cost_price: Number(b.cost_price ?? 0),
        quantity_received: Number(b.quantity_received ?? 0),
        quantity_remaining: Number(b.quantity_remaining ?? 0),
      }));

      const batchesByProduct = {};
      rawBatches.forEach((b) => {
        if (!batchesByProduct[b.product_id]) {
          batchesByProduct[b.product_id] = [];
        }
        batchesByProduct[b.product_id].push(b);
      });

      const calculatedBatchRemaining = {};

      Object.keys(batchesByProduct).forEach((productId) => {
        // Sort product batches oldest first
        const pBatches = batchesByProduct[productId].sort((a, b) => {
          const dateA = new Date(a.purchase_date || a.created_at).getTime();
          const dateB = new Date(b.purchase_date || b.created_at).getTime();
          return dateA - dateB;
        });

        let remainingToDeduct = totalSoldPerProduct[productId] || 0;
        pBatches.forEach((batch) => {
          const received = batch.quantity_received;
          const take = Math.min(received, remainingToDeduct);
          remainingToDeduct -= take;
          calculatedBatchRemaining[batch.id] = Math.max(0, received - take);
        });
      });

      const fetchedBatches = rawBatches.map((b) => {
        const calculatedRemaining = calculatedBatchRemaining[b.id] !== undefined
          ? calculatedBatchRemaining[b.id]
          : b.quantity_remaining;

        // Auto-heal DB batch quantity_remaining if out of sync
        if (b.quantity_remaining !== calculatedRemaining) {
          supabase
            .from("product_batches")
            .update({ quantity_remaining: calculatedRemaining })
            .eq("id", b.id)
            .then(() => {});
        }

        return {
          ...b,
          quantity_remaining: calculatedRemaining,
        };
      });

      const fetchedPayments = (payRes.data || []).map((p) => ({
        ...p,
        amount: Number(p.amount ?? 0),
      }));

      const paymentsByOrder = {};
      fetchedPayments.forEach((p) => {
        if (p.order_id) {
          paymentsByOrder[p.order_id] = (paymentsByOrder[p.order_id] || 0) + p.amount;
        }
      });

      // Process printed batches FIFO allocation
      const totalSoldPerPrintedItem = {};
      (printedSaleRes.data || []).forEach((s) => {
        if (s.printed_item_id) {
          totalSoldPerPrintedItem[s.printed_item_id] =
            (totalSoldPerPrintedItem[s.printed_item_id] || 0) + Number(s.quantity ?? 0);
        }
      });

      const rawPrintedBatches = (printedBatchRes.data || []).map((b) => ({
        ...b,
        cost_price: Number(b.cost_price ?? 0),
        quantity_received: Number(b.quantity_received ?? 0),
        quantity_remaining: Number(b.quantity_remaining ?? 0),
      }));

      const batchesByPrintedItem = {};
      rawPrintedBatches.forEach((b) => {
        if (!batchesByPrintedItem[b.printed_item_id]) {
          batchesByPrintedItem[b.printed_item_id] = [];
        }
        batchesByPrintedItem[b.printed_item_id].push(b);
      });

      const calculatedPrintedBatchRemaining = {};
      Object.keys(batchesByPrintedItem).forEach((itemId) => {
        const pBatches = batchesByPrintedItem[itemId].sort((a, b) => {
          const dateA = new Date(a.purchase_date || a.created_at).getTime();
          const dateB = new Date(b.purchase_date || b.created_at).getTime();
          return dateA - dateB;
        });

        let remainingToDeduct = totalSoldPerPrintedItem[itemId] || 0;
        pBatches.forEach((batch) => {
          const received = batch.quantity_received;
          const take = Math.min(received, remainingToDeduct);
          remainingToDeduct -= take;
          calculatedPrintedBatchRemaining[batch.id] = Math.max(0, received - take);
        });
      });

      const fetchedPrintedBatches = rawPrintedBatches.map((b) => {
        const calculatedRemaining = calculatedPrintedBatchRemaining[b.id] !== undefined
          ? calculatedPrintedBatchRemaining[b.id]
          : b.quantity_remaining;

        if (b.quantity_remaining !== calculatedRemaining) {
          supabase
            .from("printed_batches")
            .update({ quantity_remaining: calculatedRemaining })
            .eq("id", b.id)
            .then(() => {});
        }

        return {
          ...b,
          quantity_remaining: calculatedRemaining,
        };
      });

      const fetchedPrintedPayments = (printedPayRes.data || []).map((p) => ({
        ...p,
        amount: Number(p.amount ?? 0),
      }));

      const paymentsByPrintedSale = {};
      fetchedPrintedPayments.forEach((p) => {
        if (p.printed_sale_id) {
          paymentsByPrintedSale[p.printed_sale_id] = (paymentsByPrintedSale[p.printed_sale_id] || 0) + p.amount;
        }
      });

      const fetchedPrintedItems = (printedItemRes.data || []).map((p) => {
        const pBatches = fetchedPrintedBatches.filter((b) => b.printed_item_id === p.id);
        const sumRemainingInBatches = pBatches.reduce((sum, b) => sum + b.quantity_remaining, 0);
        const latestBatchCost = pBatches.length > 0 ? pBatches[0].cost_price : Number(p.cost_price ?? 0);
        const trueStock = sumRemainingInBatches;

        return {
          ...p,
          cost_price: latestBatchCost,
          stock_quantity: trueStock,
          batches: pBatches,
        };
      });

      const fetchedPrintedSales = (printedSaleRes.data || []).map((s) => {
        const lineTot = Number(s.line_total ?? 0);
        const amtPaid = paymentsByPrintedSale[s.id] !== undefined
          ? paymentsByPrintedSale[s.id]
          : Number(s.amount_paid ?? 0);
        const balDue = Math.max(0, lineTot - amtPaid);

        return {
          ...s,
          quantity: Number(s.quantity ?? 0),
          sale_price: Number(s.sale_price ?? 0),
          line_total: lineTot,
          cost_basis: Number(s.cost_basis ?? 0),
          line_profit: Number(s.line_profit ?? 0),
          amount_paid: amtPaid,
          balance_due: balDue,
        };
      });

      setCategories(catRes.data || []);
      setProducts(
        (prodRes.data || []).map((p) => {
          const pBatches = fetchedBatches.filter((b) => b.product_id === p.id);
          const sumRemainingInBatches = pBatches.reduce((sum, b) => sum + b.quantity_remaining, 0);
          const latestBatchCost = pBatches.length > 0 ? pBatches[0].cost_price : Number(p.cost_price ?? 0);

          const trueStock = pBatches.length > 0
            ? sumRemainingInBatches
            : Math.max(0, Number(p.stock_quantity ?? 0) - (totalSoldPerProduct[p.id] || 0));

          if (Number(p.stock_quantity ?? 0) !== trueStock) {
            supabase
              .from("products")
              .update({ stock_quantity: trueStock })
              .eq("id", p.id)
              .then(() => {});
          }

          return {
            ...p,
            cost_price: latestBatchCost,
            stock_quantity: trueStock,
            batches: pBatches,
          };
        })
      );
      setCustomers(custRes.data || []);
      setOrders(
        (ordRes.data || []).map((o) => {
          const finalTot = Number(o.final_total ?? 0);
          const amtPaid = paymentsByOrder[o.id] !== undefined
            ? paymentsByOrder[o.id]
            : Number(o.amount_paid ?? 0);
          const balDue = Math.max(0, finalTot - amtPaid);
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
      setPayments(fetchedPayments);
      setPrintedItems(fetchedPrintedItems);
      setPrintedBatches(fetchedPrintedBatches);
      setPrintedSales(fetchedPrintedSales);
      setPrintedPayments(fetchedPrintedPayments);
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
        sale_price: product.sale_price !== "" && product.sale_price != null ? Number(product.sale_price) : null,
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
        sale_price: updatedProduct.sale_price !== "" && updatedProduct.sale_price != null ? Number(updatedProduct.sale_price) : null,
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
    const hasBagsOrders = orders.some((o) => o.customer_id === id);
    const hasPrintedSales = printedSales.some((s) => s.customer_id === id);

    if (hasBagsOrders || hasPrintedSales) {
      return {
        success: false,
        error: "This customer can't be deleted because they have existing transaction history.",
      };
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
          error: "This customer can't be deleted because they have existing transaction history.",
        };
      }

      setCustomers((prev) => prev.filter((c) => c.id !== id));
      return { success: true };
    } catch (err) {
      console.error("Error deleting customer:", err);
      return {
        success: false,
        error: "This customer can't be deleted because they have existing transaction history.",
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

      // 5a. Update product_batches quantity_remaining in Supabase
      for (const [batchId, newQty] of Object.entries(batchUpdates)) {
        const { error: batchUpdErr } = await supabase
          .from("product_batches")
          .update({ quantity_remaining: newQty })
          .eq("id", batchId);

        if (batchUpdErr) {
          console.error(`Error updating batch ${batchId} remaining qty:`, batchUpdErr);
        }
      }

      // 5b. Update products stock_quantity in Supabase
      const productQtyMap = {};
      processedItems.forEach((item) => {
        productQtyMap[item.product_id] = (productQtyMap[item.product_id] || 0) + item.quantity;
      });

      for (const [productId, qtyDeducted] of Object.entries(productQtyMap)) {
        const targetProduct = products.find((p) => p.id === productId);
        if (targetProduct) {
          const currentStock = Number(targetProduct.stock_quantity ?? 0);
          const updatedStock = Math.max(0, currentStock - qtyDeducted);
          const { error: prodUpdErr } = await supabase
            .from("products")
            .update({ stock_quantity: updatedStock })
            .eq("id", productId);

          if (prodUpdErr) {
            console.error(`Error updating product ${productId} stock:`, prodUpdErr);
          }
        }
      }

      // 5b. Insert initial payment & handle excess payment
      const amountPaidNow = order.amount_paid_now !== undefined
        ? Number(order.amount_paid_now)
        : finalTotal;

      const customerId = createdOrder.customer_id;
      const saleTotal = finalTotal;

      const primaryPayment = Math.min(amountPaidNow, saleTotal);
      const excessAmount = Math.max(0, amountPaidNow - saleTotal);

      // Insert primary payment for this order
      if (primaryPayment > 0 && createdOrder.id && customerId) {
        const paymentPayload = {
          order_id: createdOrder.id,
          customer_id: customerId,
          amount: primaryPayment,
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

      // Handle excess payment: allocate to existing debt or convert to extra profit
      if (excessAmount > 0) {
        let remainingExcess = excessAmount;

        if (customerId) {
          // Find unpaid bags orders and printed sales for this customer (excluding createdOrder)
          const unpaidBags = orders
            .filter((o) => o.customer_id === customerId && o.id !== createdOrder.id && (o.balance_due ?? 0) > 0)
            .map((o) => ({ type: "bags", id: o.id, date: o.order_date, bal: o.balance_due }));

          const unpaidPrinted = printedSales
            .filter((s) => s.customer_id === customerId && (s.balance_due ?? 0) > 0)
            .map((s) => ({ type: "printed", id: s.id, date: s.sale_date, bal: s.balance_due }));

          const unpaidItems = [...unpaidBags, ...unpaidPrinted]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          for (const item of unpaidItems) {
            if (remainingExcess <= 0) break;
            const alloc = Math.min(item.bal, remainingExcess);
            remainingExcess -= alloc;

            const payDate = (order.order_date || new Date().toISOString()).slice(0, 10);
            if (item.type === "bags") {
              await supabase.from("payments").insert([{
                order_id: item.id,
                customer_id: customerId,
                amount: Number(alloc.toFixed(2)),
                payment_date: payDate,
                notes: "Excess payment allocation from new order",
              }]);
            } else if (item.type === "printed") {
              await supabase.from("printed_payments").insert([{
                printed_sale_id: item.id,
                customer_id: customerId,
                amount: Number(alloc.toFixed(2)),
                payment_date: payDate,
                notes: "Excess payment allocation from new order",
              }]);
            }
          }
        }

        // If excess remains after clearing all outstanding debt (or if no customer), add to profit
        if (remainingExcess > 0) {
          const extraProfit = remainingExcess;
          const newProfit = Number(createdOrder.final_profit ?? 0) + extraProfit;
          await supabase
            .from("orders")
            .update({ final_profit: newProfit })
            .eq("id", createdOrder.id);
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
        .select("id, product_id, quantity")
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

        // Restore products table stock_quantity
        for (const item of orderItems || []) {
          const targetProduct = products.find((p) => p.id === item.product_id);
          if (targetProduct) {
            const currentStock = Number(targetProduct.stock_quantity ?? 0);
            const restoredStock = currentStock + Number(item.quantity ?? 0);
            await supabase
              .from("products")
              .update({ stock_quantity: restoredStock })
              .eq("id", item.product_id);
          }
        }
      }

      // 3. Explicitly delete all payment rows for this order (belt-and-suspenders:
      //    this ensures no orphaned payments remain even if the DB-level
      //    ON DELETE CASCADE on payments.order_id is missing or misconfigured).
      const { error: paymentsDelErr } = await supabase
        .from("payments")
        .delete()
        .eq("order_id", id);

      if (paymentsDelErr) {
        // Non-fatal: log and continue — the order delete may still cascade.
        console.error("Error explicitly deleting payments for order:", paymentsDelErr);
      }

      // 4. Delete order (DB cascade also removes order_items and consumptions)
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // 5. Refetch full state
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

  const addManualOutstanding = async ({ customer_id, amount, date }) => {
    try {
      const amtNum = Number(amount || 0);
      if (!customer_id || isNaN(amtNum) || amtNum <= 0) {
        return { success: false, error: "Invalid customer or amount" };
      }

      const orderPayload = {
        customer_id,
        order_date: date ? new Date(date).toISOString() : new Date().toISOString(),
        discount_type: "none",
        discount_value: 0,
        subtotal: amtNum,
        final_total: amtNum,
        final_profit: 0, // Manual outstanding entries have no associated product cost/profit
      };

      const { data: insertedOrders, error: orderError } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select();

      if (orderError) throw orderError;

      await fetchData();

      return { success: true, data: insertedOrders[0] };
    } catch (err) {
      console.error("Error adding manual outstanding balance:", err);
      return { success: false, error: err.message || "Failed to add manual outstanding balance" };
    }
  };

  const recordCustomerPayment = async (customerId, amount, paymentDate, notes) => {
    try {
      const payAmount = Number(amount);
      if (!customerId || isNaN(payAmount) || payAmount <= 0) {
        return { success: false, error: "Invalid payment amount" };
      }

      // Get unpaid orders for this customer, sorted by oldest order_date first
      const unpaidOrders = orders
        .filter((o) => o.customer_id === customerId && (o.balance_due ?? 0) > 0)
        .sort((a, b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());

      const totalOutstanding = unpaidOrders.reduce((sum, o) => sum + (o.balance_due ?? 0), 0);

      if (payAmount > totalOutstanding + 0.001) {
        return {
          success: false,
          error: `Payment amount (${payAmount}) exceeds total outstanding balance (${totalOutstanding.toFixed(2)}).`,
        };
      }

      let remainingToAllocate = payAmount;
      const paymentPayloads = [];

      for (const order of unpaidOrders) {
        if (remainingToAllocate <= 0) break;
        const allocated = Math.min(order.balance_due, remainingToAllocate);
        remainingToAllocate -= allocated;

        paymentPayloads.push({
          order_id: order.id,
          customer_id: customerId,
          amount: Number(allocated.toFixed(2)),
          payment_date: paymentDate || new Date().toISOString().split("T")[0],
          notes: notes || "FIFO payment allocation",
        });
      }

      if (paymentPayloads.length === 0) {
        return { success: false, error: "No unpaid orders found to apply payment to." };
      }

      const { data, error: payErr } = await supabase
        .from("payments")
        .insert(paymentPayloads)
        .select();

      if (payErr) throw payErr;

      // Refetch full state to update order balance_due & amount_paid
      await fetchData();

      return { success: true, data };
    } catch (err) {
      console.error("Error recording customer payment:", err);
      return { success: false, error: err.message || "Failed to record payment" };
    }
  };

  // -- Printed Items & Batches --
  const addPrintedItem = async (item) => {
    try {
      const payload = {
        name: item.name,
        unit: item.unit || "piece",
      };

      const { data, error } = await supabase
        .from("printed_items")
        .insert([payload])
        .select();

      if (error) throw error;
      const created = data[0];

      const initialQty = Number(item.stock_quantity ?? 0);
      const initialCost = Number(item.cost_price ?? 0);

      if (initialQty > 0) {
        const batchPayload = {
          printed_item_id: created.id,
          cost_price: initialCost,
          quantity_received: initialQty,
          quantity_remaining: initialQty,
          purchase_date: new Date().toISOString().split("T")[0],
        };
        const { error: batchErr } = await supabase
          .from("printed_batches")
          .insert([batchPayload]);
        if (batchErr) {
          console.error("Error inserting initial batch for printed item:", batchErr);
        }
      }

      await fetchData();
      return { success: true, data: created };
    } catch (err) {
      console.error("Error adding printed item:", err);
      return { success: false, error: err.message || "Failed to add printed item" };
    }
  };

  const updatePrintedItem = async (updatedItem) => {
    try {
      const payload = {
        name: updatedItem.name,
        unit: updatedItem.unit || "piece",
      };

      const { data, error } = await supabase
        .from("printed_items")
        .update(payload)
        .eq("id", updatedItem.id)
        .select();

      if (error) throw error;
      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error updating printed item:", err);
      return { success: false, error: err.message || "Failed to update printed item" };
    }
  };

  const deletePrintedItem = async (id) => {
    try {
      const hasSales = printedSales.some((s) => s.printed_item_id === id);
      if (hasSales) {
        return { success: false, error: "Cannot delete printed item because it has sales history." };
      }

      const itemBatches = printedBatches.filter((b) => b.printed_item_id === id);
      const hasTouchedBatch = itemBatches.some((b) => Number(b.quantity_remaining) < Number(b.quantity_received));
      if (hasTouchedBatch) {
        return { success: false, error: "Cannot delete printed item because its batches have sales history." };
      }

      const { error } = await supabase
        .from("printed_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting printed item:", err);
      return { success: false, error: err.message || "Failed to delete printed item" };
    }
  };

  const addPrintedBatch = async ({ printed_item_id, cost_price, quantity_received, purchase_date }) => {
    try {
      const qty = Number(quantity_received);
      const cost = Number(cost_price);
      if (!printed_item_id || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
        return { success: false, error: "Invalid batch parameters" };
      }

      const payload = {
        printed_item_id,
        cost_price: cost,
        quantity_received: qty,
        quantity_remaining: qty,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
      };

      const { data, error } = await supabase
        .from("printed_batches")
        .insert([payload])
        .select();

      if (error) throw error;

      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error adding printed batch:", err);
      return { success: false, error: err.message || "Failed to add printed batch" };
    }
  };

  const editPrintedBatch = async ({ id, cost_price, quantity_received, purchase_date }) => {
    try {
      const batch = printedBatches.find((b) => b.id === id);
      if (batch && Number(batch.quantity_remaining) < Number(batch.quantity_received)) {
        return { success: false, error: "Cannot edit batch because stock from this batch has already been sold." };
      }

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
        .from("printed_batches")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;

      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error editing printed batch:", err);
      return { success: false, error: err.message || "Failed to edit printed batch" };
    }
  };

  const deletePrintedBatch = async (id) => {
    try {
      const batch = printedBatches.find((b) => b.id === id);
      if (batch && Number(batch.quantity_remaining) < Number(batch.quantity_received)) {
        return { success: false, error: "Cannot delete batch because stock from this batch has already been sold." };
      }

      const { error } = await supabase
        .from("printed_batches")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting printed batch:", err);
      return { success: false, error: err.message || "Failed to delete printed batch" };
    }
  };

  // -- Printed Sales & Payments --
  const addPrintedSale = async (sale) => {
    try {
      const { data: allBatches, error: fetchBatchesErr } = await supabase
        .from("printed_batches")
        .select("*")
        .eq("printed_item_id", sale.printed_item_id)
        .gt("quantity_remaining", 0)
        .order("purchase_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchBatchesErr) throw fetchBatchesErr;

      let localBatches = (allBatches || []).map((b) => ({
        ...b,
        cost_price: Number(b.cost_price ?? 0),
        quantity_remaining: Number(b.quantity_remaining ?? 0),
      }));

      const totalStock = localBatches.reduce((sum, b) => sum + b.quantity_remaining, 0);
      const qtyNeeded = Number(sale.quantity);
      if (qtyNeeded > totalStock) {
        return { success: false, error: `Insufficient stock. Requested: ${qtyNeeded}, Available: ${totalStock}` };
      }

      let remainingNeeded = qtyNeeded;
      let lineCostBasis = 0;
      const batchConsumptions = [];
      const batchUpdates = {};

      for (const batch of localBatches) {
        if (remainingNeeded <= 0) break;
        const takeQty = Math.min(batch.quantity_remaining, remainingNeeded);
        batch.quantity_remaining -= takeQty;
        remainingNeeded -= takeQty;

        const consumedCost = takeQty * batch.cost_price;
        lineCostBasis += consumedCost;

        batchConsumptions.push({
          batch_id: batch.id,
          quantity_consumed: takeQty,
        });

        batchUpdates[batch.id] = batch.quantity_remaining;
      }

      const salePrice = Number(sale.sale_price);
      const discount = Number(sale.discount ?? 0);
      const lineTotal = Number(sale.line_total ?? Math.max(0, qtyNeeded * salePrice - discount));
      const lineProfit = lineTotal - lineCostBasis;

      const salePayload = {
        customer_id: sale.customer_id || null,
        printed_item_id: sale.printed_item_id,
        quantity: qtyNeeded,
        sale_price: salePrice,
        line_total: lineTotal,
        cost_basis: lineCostBasis,
        line_profit: lineProfit,
        sale_date: sale.sale_date || new Date().toISOString(),
        notes: sale.notes || null,
      };

      const { data: insertedSales, error: saleError } = await supabase
        .from("printed_sales")
        .insert([salePayload])
        .select();

      if (saleError) throw saleError;
      const createdSale = insertedSales[0];

      const consumptionPayload = batchConsumptions.map((c) => ({
        printed_sale_id: createdSale.id,
        batch_id: c.batch_id,
        quantity_consumed: c.quantity_consumed,
      }));

      if (consumptionPayload.length > 0) {
        const { error: consumeErr } = await supabase
          .from("printed_sale_batch_consumptions")
          .insert(consumptionPayload);

        if (consumeErr) {
          console.error("Error inserting printed batch consumptions:", consumeErr);
        }
      }

      for (const [batchId, newQty] of Object.entries(batchUpdates)) {
        const { error: batchUpdErr } = await supabase
          .from("printed_batches")
          .update({ quantity_remaining: newQty })
          .eq("id", batchId);

        if (batchUpdErr) {
          console.error(`Error updating printed batch ${batchId} remaining qty:`, batchUpdErr);
        }
      }

      const amountPaidNow = sale.amount_paid_now !== undefined
        ? Number(sale.amount_paid_now)
        : lineTotal;

      const customerId = createdSale.customer_id;
      const saleTotal = lineTotal;

      const primaryPayment = Math.min(amountPaidNow, saleTotal);
      const excessAmount = Math.max(0, amountPaidNow - saleTotal);

      // Insert primary payment for this printed sale
      if (primaryPayment > 0 && createdSale.id && customerId) {
        const paymentPayload = {
          printed_sale_id: createdSale.id,
          customer_id: customerId,
          amount: primaryPayment,
          payment_date: (sale.sale_date || new Date().toISOString()).slice(0, 10),
          notes: sale.notes || "Initial payment upon printed sale creation",
        };
        const { error: payErr } = await supabase
          .from("printed_payments")
          .insert([paymentPayload]);

        if (payErr) {
          console.error("Error inserting initial printed payment:", payErr);
        }
      }

      // Handle excess payment: allocate to existing debt or convert to extra profit
      if (excessAmount > 0) {
        let remainingExcess = excessAmount;

        if (customerId) {
          // Find unpaid bags orders and printed sales for this customer (excluding createdSale)
          const unpaidBags = orders
            .filter((o) => o.customer_id === customerId && (o.balance_due ?? 0) > 0)
            .map((o) => ({ type: "bags", id: o.id, date: o.order_date, bal: o.balance_due }));

          const unpaidPrinted = printedSales
            .filter((s) => s.customer_id === customerId && s.id !== createdSale.id && (s.balance_due ?? 0) > 0)
            .map((s) => ({ type: "printed", id: s.id, date: s.sale_date, bal: s.balance_due }));

          const unpaidItems = [...unpaidBags, ...unpaidPrinted]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          for (const item of unpaidItems) {
            if (remainingExcess <= 0) break;
            const alloc = Math.min(item.bal, remainingExcess);
            remainingExcess -= alloc;

            const payDate = (sale.sale_date || new Date().toISOString()).slice(0, 10);
            if (item.type === "bags") {
              await supabase.from("payments").insert([{
                order_id: item.id,
                customer_id: customerId,
                amount: Number(alloc.toFixed(2)),
                payment_date: payDate,
                notes: "Excess payment allocation from printed sale",
              }]);
            } else if (item.type === "printed") {
              await supabase.from("printed_payments").insert([{
                printed_sale_id: item.id,
                customer_id: customerId,
                amount: Number(alloc.toFixed(2)),
                payment_date: payDate,
                notes: "Excess payment allocation from printed sale",
              }]);
            }
          }
        }

        // If excess remains after clearing all outstanding debt (or if no customer), add to profit
        if (remainingExcess > 0) {
          const extraProfit = remainingExcess;
          const newProfit = Number(createdSale.line_profit ?? 0) + extraProfit;
          await supabase
            .from("printed_sales")
            .update({ line_profit: newProfit })
            .eq("id", createdSale.id);
        }
      }

      await fetchData();
      return { success: true, data: createdSale };
    } catch (err) {
      console.error("Error adding printed sale:", err);
      return { success: false, error: err.message || "Failed to add printed sale" };
    }
  };

  const deletePrintedSale = async (id) => {
    try {
      const { data: consumptions, error: consumeErr } = await supabase
        .from("printed_sale_batch_consumptions")
        .select("*")
        .eq("printed_sale_id", id);

      if (consumeErr) throw consumeErr;

      if (consumptions && consumptions.length > 0) {
        const batchRestorations = {};
        for (const c of consumptions) {
          const qty = Number(c.quantity_consumed);
          batchRestorations[c.batch_id] = (batchRestorations[c.batch_id] || 0) + qty;
        }

        const batchIds = Object.keys(batchRestorations);
        const { data: targetBatches, error: fetchTBatErr } = await supabase
          .from("printed_batches")
          .select("id, quantity_remaining")
          .in("id", batchIds);

        if (fetchTBatErr) throw fetchTBatErr;

        for (const batch of targetBatches || []) {
          const restoreQty = batchRestorations[batch.id] || 0;
          const newRemaining = Number(batch.quantity_remaining ?? 0) + restoreQty;

          const { error: restoreErr } = await supabase
            .from("printed_batches")
            .update({ quantity_remaining: newRemaining })
            .eq("id", batch.id);

          if (restoreErr) {
            console.error("Error restoring printed batch remaining qty:", restoreErr);
          }
        }
      }

      // Explicitly delete all printed_payments rows for this sale (belt-and-suspenders:
      // ensures no orphaned payment rows remain if DB-level cascade is misconfigured).
      const { error: printedPayDelErr } = await supabase
        .from("printed_payments")
        .delete()
        .eq("printed_sale_id", id);

      if (printedPayDelErr) {
        console.error("Error explicitly deleting printed_payments for sale:", printedPayDelErr);
      }

      const { error } = await supabase
        .from("printed_sales")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting printed sale:", err);
      return { success: false, error: err.message || "Failed to delete printed sale" };
    }
  };

  const recordPrintedPayment = async (customerId, amount, paymentDate, notes) => {
    try {
      const payAmount = Number(amount);
      if (!customerId || isNaN(payAmount) || payAmount <= 0) {
        return { success: false, error: "Invalid payment amount" };
      }

      const unpaidSales = printedSales
        .filter((s) => s.customer_id === customerId && (s.balance_due ?? 0) > 0)
        .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());

      const totalOutstanding = unpaidSales.reduce((sum, s) => sum + (s.balance_due ?? 0), 0);

      if (payAmount > totalOutstanding + 0.001) {
        return {
          success: false,
          error: `Payment amount (${payAmount}) exceeds total printed outstanding balance (${totalOutstanding.toFixed(2)}).`,
        };
      }

      let remainingToAllocate = payAmount;
      const paymentPayloads = [];

      for (const sale of unpaidSales) {
        if (remainingToAllocate <= 0) break;
        const allocated = Math.min(sale.balance_due, remainingToAllocate);
        remainingToAllocate -= allocated;

        paymentPayloads.push({
          printed_sale_id: sale.id,
          customer_id: customerId,
          amount: Number(allocated.toFixed(2)),
          payment_date: paymentDate || new Date().toISOString().split("T")[0],
          notes: notes || "FIFO printed payment allocation",
        });
      }

      if (paymentPayloads.length === 0) {
        return { success: false, error: "No unpaid printed sales found to apply payment to." };
      }

      const { data, error: payErr } = await supabase
        .from("printed_payments")
        .insert(paymentPayloads)
        .select();

      if (payErr) throw payErr;

      await fetchData();
      return { success: true, data };
    } catch (err) {
      console.error("Error recording printed payment:", err);
      return { success: false, error: err.message || "Failed to record printed payment" };
    }
  };

  const getCustomerTotalBalance = useCallback((customerId) => {
    if (!customerId) return 0;
    const bagsBalance = orders
      .filter((o) => o.customer_id === customerId)
      .reduce((sum, o) => sum + (o.balance_due ?? 0), 0);
    const printedBalance = printedSales
      .filter((s) => s.customer_id === customerId)
      .reduce((sum, s) => sum + (s.balance_due ?? 0), 0);
    return Math.round((bagsBalance + printedBalance) * 100) / 100;
  }, [orders, printedSales]);

  const value = {
    products,
    customers,
    orders,
    payments,
    categories,
    printedItems,
    printedBatches,
    printedSales,
    printedPayments,
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
    addManualOutstanding,
    deleteOrder,
    updateOrderDate,
    recordCustomerPayment,
    addCategory,
    updateCategory,
    deleteCategory,
    addPrintedItem,
    updatePrintedItem,
    deletePrintedItem,
    addPrintedBatch,
    editPrintedBatch,
    deletePrintedBatch,
    addPrintedSale,
    deletePrintedSale,
    recordPrintedPayment,
    getCustomerTotalBalance,
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
