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
  const [productBatches, setProductBatches] = useState([]);
  const [printedItems, setPrintedItems] = useState([]);
  const [printedBatches, setPrintedBatches] = useState([]);
  const [printedSales, setPrintedSales] = useState([]);
  const [printedPayments, setPrintedPayments] = useState([]);
  const [supplierReturns, setSupplierReturns] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
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
        supplierRetRes,
        salesRetRes,
        salesRetItemsRes,
      ] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*, categories(*)").order("name"),
        supabase.from("customers").select("*").order("name"),
        supabase.from("orders").select("*, order_items(*)").order("order_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("product_batches").select("*").order("purchase_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("printed_items").select("*").order("name"),
        supabase.from("printed_batches").select("*").order("purchase_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("printed_sales").select("*, customers(*), printed_items(*)").order("sale_date", { ascending: false }),
        supabase.from("printed_payments").select("*").order("payment_date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("supplier_returns").select("*").order("return_date", { ascending: false }).catch(() => ({ data: [] })),
        supabase.from("sales_returns").select("*").order("return_date", { ascending: false }).catch(() => ({ data: [] })),
        supabase.from("sales_return_items").select("*").catch(() => ({ data: [] })),
      ]);

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      if (custRes.error) throw custRes.error;
      if (ordRes.error) throw ordRes.error;
      if (printedItemRes.error) throw printedItemRes.error;
      if (printedBatchRes.error) throw printedBatchRes.error;
      if (printedSaleRes.error) throw printedSaleRes.error;
      if (printedPayRes.error) throw printedPayRes.error;

      // Process supplier returns
      const rawSupplierReturns = (supplierRetRes?.data || []).map((r) => ({
        ...r,
        quantity_returned: Number(r.quantity_returned ?? 0),
        unit_cost_price: Number(r.unit_cost_price ?? 0),
        total_refund_value: Number(r.total_refund_value ?? 0),
      }));
      setSupplierReturns(rawSupplierReturns);

      // Process customer sales returns & items
      const rawSalesReturns = (salesRetRes?.data || []).map((r) => ({
        ...r,
        total_return_amount: Number(r.total_return_amount ?? 0),
        total_cost_basis: Number(r.total_cost_basis ?? 0),
      }));

      const rawSalesReturnItems = (salesRetItemsRes?.data || []).map((ri) => ({
        ...ri,
        quantity_returned: Number(ri.quantity_returned ?? 0),
        unit_sale_price: Number(ri.unit_sale_price ?? 0),
        unit_cost_price: Number(ri.unit_cost_price ?? 0),
        line_return_total: Number(ri.line_return_total ?? 0),
      }));

      const returnItemsByReturnId = {};
      rawSalesReturnItems.forEach((ri) => {
        if (!returnItemsByReturnId[ri.return_id]) {
          returnItemsByReturnId[ri.return_id] = [];
        }
        returnItemsByReturnId[ri.return_id].push(ri);
      });

      const fetchedSalesReturns = rawSalesReturns.map((r) => ({
        ...r,
        items: returnItemsByReturnId[r.id] || [],
      }));
      setSalesReturns(fetchedSalesReturns);

      // Pre-compute maps for orders and printed sales returns
      const returnsByOrder = {};
      const returnedQtyByOrderItem = {};
      const returnedQtyByOrderProduct = {};

      const returnsByPrintedSale = {};
      const returnedQtyByPrintedSale = {};

      fetchedSalesReturns.forEach((sr) => {
        if (sr.order_id) {
          if (!returnsByOrder[sr.order_id]) returnsByOrder[sr.order_id] = [];
          returnsByOrder[sr.order_id].push(sr);

          (sr.items || []).forEach((ri) => {
            if (ri.order_item_id) {
              returnedQtyByOrderItem[ri.order_item_id] =
                (returnedQtyByOrderItem[ri.order_item_id] || 0) + ri.quantity_returned;
            }
            if (ri.product_id) {
              const key = `${sr.order_id}_${ri.product_id}`;
              returnedQtyByOrderProduct[key] =
                (returnedQtyByOrderProduct[key] || 0) + ri.quantity_returned;
            }
          });
        }

        if (sr.printed_sale_id) {
          if (!returnsByPrintedSale[sr.printed_sale_id]) returnsByPrintedSale[sr.printed_sale_id] = [];
          returnsByPrintedSale[sr.printed_sale_id].push(sr);

          (sr.items || []).forEach((ri) => {
            returnedQtyByPrintedSale[sr.printed_sale_id] =
              (returnedQtyByPrintedSale[sr.printed_sale_id] || 0) + ri.quantity_returned;
          });
        }
      });

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
      // Deduct customer returned quantities so inventory is restored via FIFO
      rawSalesReturnItems.forEach((ri) => {
        if (ri.product_id) {
          totalSoldPerProduct[ri.product_id] = Math.max(
            0,
            (totalSoldPerProduct[ri.product_id] || 0) - ri.quantity_returned
          );
        }
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
          supplier_returns: rawSupplierReturns.filter(sr => sr.product_batch_id === b.id),
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
      // Deduct customer returned quantities so inventory is restored via FIFO
      rawSalesReturnItems.forEach((ri) => {
        if (ri.printed_item_id) {
          totalSoldPerPrintedItem[ri.printed_item_id] = Math.max(
            0,
            (totalSoldPerPrintedItem[ri.printed_item_id] || 0) - ri.quantity_returned
          );
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
          supplier_returns: rawSupplierReturns.filter(sr => sr.printed_batch_id === b.id),
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
        const originalLineTotal = Number(s.line_total ?? 0);
        const originalProfit = Number(s.line_profit ?? 0);

        const saleReturns = returnsByPrintedSale[s.id] || [];
        const totalReturnedAmount = saleReturns.reduce((sum, r) => sum + r.total_return_amount, 0);
        const totalReturnedCostBasis = saleReturns.reduce((sum, r) => sum + r.total_cost_basis, 0);
        const returnedQty = returnedQtyByPrintedSale[s.id] || 0;

        const netLineTotal = Math.max(0, originalLineTotal - totalReturnedAmount);
        const netProfit = originalProfit - (totalReturnedAmount - totalReturnedCostBasis);

        const amtPaid = paymentsByPrintedSale[s.id] !== undefined
          ? paymentsByPrintedSale[s.id]
          : Number(s.amount_paid ?? 0);
        const balDue = Math.max(0, netLineTotal - amtPaid);

        return {
          ...s,
          quantity: Number(s.quantity ?? 0),
          returned_quantity: returnedQty,
          available_to_return: Math.max(0, Number(s.quantity ?? 0) - returnedQty),
          sale_price: Number(s.sale_price ?? 0),
          line_total: netLineTotal,
          original_line_total: originalLineTotal,
          cost_basis: Number(s.cost_basis ?? 0),
          line_profit: netProfit,
          original_profit: originalProfit,
          total_returned_amount: totalReturnedAmount,
          amount_paid: amtPaid,
          balance_due: balDue,
          returns: saleReturns,
        };
      });

      setCategories(catRes.data || []);
      setProductBatches(fetchedBatches);
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
          const originalFinalTotal = Number(o.final_total ?? 0);
          const originalProfit = Number(o.final_profit ?? 0);

          const orderReturns = returnsByOrder[o.id] || [];
          const totalReturnedAmount = orderReturns.reduce((sum, r) => sum + r.total_return_amount, 0);
          const totalReturnedCostBasis = orderReturns.reduce((sum, r) => sum + r.total_cost_basis, 0);

          const netFinalTotal = Math.max(0, originalFinalTotal - totalReturnedAmount);
          const netProfit = originalProfit - (totalReturnedAmount - totalReturnedCostBasis);

          const amtPaid = paymentsByOrder[o.id] !== undefined
            ? paymentsByOrder[o.id]
            : Number(o.amount_paid ?? 0);
          const balDue = Math.max(0, netFinalTotal - amtPaid);

          const items = (o.order_items || []).map((item) => {
            const itemReturnedQty = returnedQtyByOrderItem[item.id] !== undefined
              ? returnedQtyByOrderItem[item.id]
              : (returnedQtyByOrderProduct[`${o.id}_${item.product_id}`] || 0);
            const availableToReturn = Math.max(0, Number(item.quantity ?? 0) - itemReturnedQty);

            return {
              ...item,
              quantity: Number(item.quantity ?? 0),
              sale_price: Number(item.sale_price ?? 0),
              line_total: Number(item.line_total ?? 0),
              cost_basis: Number(item.cost_basis ?? 0),
              line_profit: Number(item.line_profit ?? 0),
              returned_quantity: itemReturnedQty,
              available_to_return: availableToReturn,
            };
          });

          return {
            ...o,
            subtotal: Number(o.subtotal ?? 0),
            discount_value: Number(o.discount_value ?? 0),
            final_total: netFinalTotal,
            original_final_total: originalFinalTotal,
            final_profit: netProfit,
            original_profit: originalProfit,
            total_returned_amount: totalReturnedAmount,
            amount_paid: amtPaid,
            balance_due: balDue,
            returns: orderReturns,
            items,
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

      const currentBatch = productBatches.find((b) => b.id === id);
      if (!currentBatch) {
        return { success: false, error: "Batch not found" };
      }

      const originalReceived = Number(currentBatch.quantity_received ?? 0);
      const currentRemaining = Number(currentBatch.quantity_remaining ?? 0);
      const alreadySoldOrConsumed = Math.max(0, originalReceived - currentRemaining);

      if (qty < alreadySoldOrConsumed) {
        return {
          success: false,
          error: `Cannot reduce quantity received below ${alreadySoldOrConsumed} because ${alreadySoldOrConsumed} units have already been sold or returned from this batch.`
        };
      }

      const newRemaining = Math.max(0, qty - alreadySoldOrConsumed);

      const payload = {
        cost_price: cost,
        quantity_received: qty,
        quantity_remaining: newRemaining,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
      };

      const { data, error } = await supabase
        .from("product_batches")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;

      // Adjust products table stock_quantity by delta
      const delta = qty - originalReceived;
      if (delta !== 0 && currentBatch.product_id) {
        const targetProd = products.find(p => p.id === currentBatch.product_id);
        if (targetProd) {
          const updatedStock = Math.max(0, Number(targetProd.stock_quantity ?? 0) + delta);
          await supabase
            .from("products")
            .update({ stock_quantity: updatedStock })
            .eq("id", currentBatch.product_id);
        }
      }

      await fetchData();
      return { success: true, data: data[0] };
    } catch (err) {
      console.error("Error editing batch:", err);
      return { success: false, error: err.message || "Failed to edit batch" };
    }
  };

  const deleteBatch = async (id) => {
    try {
      const currentBatch = productBatches.find((b) => b.id === id);
      if (currentBatch && Number(currentBatch.quantity_remaining) < Number(currentBatch.quantity_received)) {
        return {
          success: false,
          error: "Cannot delete this batch because some units have already been sold. You can return remaining units to the factory instead."
        };
      }

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

  const returnBatchToSupplier = async ({ batch_id, quantity, return_date, reason }) => {
    try {
      const qtyToReturn = Number(quantity);
      if (!batch_id || isNaN(qtyToReturn) || qtyToReturn <= 0) {
        return { success: false, error: "Please enter a valid quantity to return." };
      }

      const batch = productBatches.find((b) => b.id === batch_id);
      if (!batch) {
        return { success: false, error: "Batch not found." };
      }

      const currentRemaining = Number(batch.quantity_remaining ?? 0);
      if (qtyToReturn > currentRemaining) {
        return {
          success: false,
          error: `Cannot return ${qtyToReturn} units. Only ${currentRemaining} units are remaining in this batch.`
        };
      }

      const unitCost = Number(batch.cost_price ?? 0);
      const totalRefundValue = qtyToReturn * unitCost;
      const returnDate = return_date || new Date().toISOString().split("T")[0];

      // 1. Insert into supplier_returns
      const returnPayload = {
        product_batch_id: batch.id,
        product_id: batch.product_id,
        quantity_returned: qtyToReturn,
        unit_cost_price: unitCost,
        total_refund_value: totalRefundValue,
        return_date: returnDate,
        reason: reason ? reason.trim() : null,
      };

      try {
        const { error: insErr } = await supabase
          .from("supplier_returns")
          .insert([returnPayload]);
        if (insErr) {
          console.warn("Could not insert supplier_returns record:", insErr);
        }
      } catch (e) {
        console.warn("supplier_returns insert error:", e);
      }

      // 2. Reduce batch quantity_remaining and quantity_received
      const newRemaining = Math.max(0, currentRemaining - qtyToReturn);
      const newReceived = Math.max(0, Number(batch.quantity_received ?? 0) - qtyToReturn);

      const { error: batchErr } = await supabase
        .from("product_batches")
        .update({
          quantity_remaining: newRemaining,
          quantity_received: newReceived,
        })
        .eq("id", batch.id);

      if (batchErr) throw batchErr;

      // 3. Reduce product stock_quantity
      const targetProd = products.find((p) => p.id === batch.product_id);
      if (targetProd) {
        const newStock = Math.max(0, Number(targetProd.stock_quantity ?? 0) - qtyToReturn);
        await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", batch.product_id);
      }

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error returning batch to supplier:", err);
      return { success: false, error: err.message || "Failed to return batch to supplier" };
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

  const editOrder = async (id, updatedOrder) => {
    try {
      const existingOrder = orders.find((o) => o.id === id);
      if (!existingOrder) {
        return { success: false, error: "Order not found" };
      }

      if (existingOrder.returns && existingOrder.returns.length > 0) {
        return {
          success: false,
          error: "This sale has recorded customer returns. Please delete the return records before editing the sale.",
        };
      }

      if (!updatedOrder.items || updatedOrder.items.length === 0) {
        return { success: false, error: "Order must contain at least one item." };
      }

      // 1. Fetch current order_items & consumptions for this order
      const { data: oldItems, error: itemsErr } = await supabase
        .from("order_items")
        .select("id, product_id, quantity")
        .eq("order_id", id);

      if (itemsErr) throw itemsErr;

      const oldItemIds = (oldItems || []).map((i) => i.id);
      let oldConsumptions = [];
      if (oldItemIds.length > 0) {
        const { data: cData, error: cErr } = await supabase
          .from("order_item_batch_consumptions")
          .select("*")
          .in("order_item_id", oldItemIds);
        if (cErr) throw cErr;
        oldConsumptions = cData || [];
      }

      // 2. Fetch current batches to calculate restored pool
      const { data: allBatchesRaw, error: fetchBatchesErr } = await supabase
        .from("product_batches")
        .select("*")
        .order("purchase_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchBatchesErr) throw fetchBatchesErr;

      // Calculate batch quantities after restoring old order's consumptions
      const restoredBatchesMap = {};
      (allBatchesRaw || []).forEach((b) => {
        restoredBatchesMap[b.id] = {
          ...b,
          cost_price: Number(b.cost_price ?? 0),
          quantity_remaining: Number(b.quantity_remaining ?? 0),
        };
      });

      for (const c of oldConsumptions) {
        if (restoredBatchesMap[c.batch_id]) {
          restoredBatchesMap[c.batch_id].quantity_remaining += Number(c.quantity_consumed ?? 0);
        }
      }

      // 3. Pre-validate stock availability for all updated items against the restored pool
      const newItemsNeeded = {};
      for (const item of updatedOrder.items) {
        const pId = item.product_id;
        const q = Number(item.quantity ?? 0);
        if (isNaN(q) || q <= 0) {
          return { success: false, error: "Item quantity must be greater than 0." };
        }
        newItemsNeeded[pId] = (newItemsNeeded[pId] || 0) + q;
      }

      for (const [pId, neededQty] of Object.entries(newItemsNeeded)) {
        const availableInRestoredPool = Object.values(restoredBatchesMap)
          .filter((b) => b.product_id === pId)
          .reduce((sum, b) => sum + b.quantity_remaining, 0);

        if (neededQty > availableInRestoredPool) {
          const prodObj = products.find((p) => p.id === pId);
          const pName = prodObj?.name || "Selected product";
          return {
            success: false,
            error: `Insufficient stock for "${pName}". Required: ${neededQty}, Available: ${availableInRestoredPool}`,
          };
        }
      }

      // 4. Stock validation passed! Now apply restoration of old consumptions to DB
      if (oldConsumptions.length > 0) {
        const batchRestorations = {};
        for (const c of oldConsumptions) {
          const qty = Number(c.quantity_consumed);
          batchRestorations[c.batch_id] = (batchRestorations[c.batch_id] || 0) + qty;
        }

        for (const [bId, restoreQty] of Object.entries(batchRestorations)) {
          const origBatch = (allBatchesRaw || []).find((b) => b.id === bId);
          const newRemaining = Number(origBatch?.quantity_remaining ?? 0) + restoreQty;
          await supabase
            .from("product_batches")
            .update({ quantity_remaining: newRemaining })
            .eq("id", bId);
        }

        // Restore products table stock_quantity
        for (const item of oldItems || []) {
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

        // Delete old consumptions
        await supabase
          .from("order_item_batch_consumptions")
          .delete()
          .in("order_item_id", oldItemIds);
      }

      if (oldItemIds.length > 0) {
        await supabase.from("order_items").delete().eq("order_id", id);
      }

      // 5. Run FIFO batch allocation on new items
      const itemConsumptions = []; // { itemIdx, batch_id, quantity_consumed }
      const batchUpdates = {}; // { batch_id: new_quantity_remaining }
      let totalOrderCostBasis = 0;

      const localBatches = Object.values(restoredBatchesMap).filter((b) => b.quantity_remaining > 0);

      const processedItems = updatedOrder.items.map((item, itemIdx) => {
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
          order_id: id,
          product_id: item.product_id,
          quantity: qtyNeeded,
          sale_price: salePrice,
          line_total: lineTotal,
          cost_basis: lineCostBasis,
          line_profit: lineProfit,
        };
      });

      // 6. Insert new order_items
      const { data: insertedItems, error: newItemsErr } = await supabase
        .from("order_items")
        .insert(processedItems)
        .select();

      if (newItemsErr) throw newItemsErr;

      // 7. Insert new order_item_batch_consumptions
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
          console.error("Error inserting batch consumptions during edit:", consumeErr);
        }
      }

      // 8. Update product_batches quantity_remaining
      for (const [batchId, newQty] of Object.entries(batchUpdates)) {
        await supabase
          .from("product_batches")
          .update({ quantity_remaining: newQty })
          .eq("id", batchId);
      }

      // 9. Update products stock_quantity
      for (const [pId] of Object.entries(newItemsNeeded)) {
        const targetProduct = products.find((p) => p.id === pId);
        if (targetProduct) {
          const finalProductBatches = Object.values(restoredBatchesMap).filter((b) => b.product_id === pId);
          const newStock = finalProductBatches.reduce((s, b) => s + b.quantity_remaining, 0);
          await supabase
            .from("products")
            .update({ stock_quantity: newStock })
            .eq("id", pId);
        }
      }

      // 10. Recalculate totals
      const subtotal = processedItems.reduce((s, it) => s + it.line_total, 0);
      const discountType = updatedOrder.discount_type || "none";
      const rawDiscountVal = Number(updatedOrder.discount_value || 0);
      let discountVal = 0;
      if (discountType === "percentage") {
        discountVal = (subtotal * rawDiscountVal) / 100;
      } else if (discountType === "fixed") {
        discountVal = rawDiscountVal;
      }
      const finalTotal = Math.max(0, subtotal - discountVal);
      const finalProfit = finalTotal - totalOrderCostBasis;

      // 11. Payment / Overpayment reconciliation
      const { data: currentPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("order_id", id);
      const amountPaid = (currentPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

      if (finalTotal < amountPaid && updatedOrder.overpayment_action === "cash_refund") {
        const refundAmt = amountPaid - finalTotal;
        await supabase.from("payments").insert([
          {
            order_id: id,
            customer_id: updatedOrder.customer_id || existingOrder.customer_id,
            amount: -refundAmt,
            payment_date: new Date().toISOString().slice(0, 10),
            notes: "Cash refund for order edit price reduction",
          },
        ]);
      }

      // 12. Update orders row
      const { error: updateOrderErr } = await supabase
        .from("orders")
        .update({
          customer_id: updatedOrder.customer_id !== undefined ? updatedOrder.customer_id : existingOrder.customer_id,
          order_date: updatedOrder.order_date || existingOrder.order_date,
          discount_type: discountType,
          discount_value: discountVal,
          subtotal,
          final_total: finalTotal,
          final_profit: finalProfit,
          notes: updatedOrder.notes !== undefined ? updatedOrder.notes : existingOrder.notes,
        })
        .eq("id", id);

      if (updateOrderErr) throw updateOrderErr;

      // 13. Sync app context
      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error editing order:", err);
      return { success: false, error: err.message || "Failed to edit order" };
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
      const qty = Number(quantity_received);
      const cost = Number(cost_price);
      if (!id || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
        return { success: false, error: "Invalid batch parameters" };
      }

      const batch = printedBatches.find((b) => b.id === id);
      if (!batch) {
        return { success: false, error: "Printed batch not found" };
      }

      const originalReceived = Number(batch.quantity_received ?? 0);
      const currentRemaining = Number(batch.quantity_remaining ?? 0);
      const alreadySoldOrConsumed = Math.max(0, originalReceived - currentRemaining);

      if (qty < alreadySoldOrConsumed) {
        return {
          success: false,
          error: `Cannot reduce quantity received below ${alreadySoldOrConsumed} because ${alreadySoldOrConsumed} units have already been sold or returned from this batch.`
        };
      }

      const newRemaining = Math.max(0, qty - alreadySoldOrConsumed);

      const payload = {
        cost_price: cost,
        quantity_received: qty,
        quantity_remaining: newRemaining,
        purchase_date: purchase_date || new Date().toISOString().split("T")[0],
      };

      const { data, error } = await supabase
        .from("printed_batches")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;

      // Adjust printed_items table stock_quantity by delta
      const delta = qty - originalReceived;
      if (delta !== 0 && batch.printed_item_id) {
        const targetItem = printedItems.find(p => p.id === batch.printed_item_id);
        if (targetItem) {
          const updatedStock = Math.max(0, Number(targetItem.stock_quantity ?? 0) + delta);
          await supabase
            .from("printed_items")
            .update({ stock_quantity: updatedStock })
            .eq("id", batch.printed_item_id);
        }
      }

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
        return {
          success: false,
          error: "Cannot delete batch because some units have already been sold. You can return remaining units to the factory instead."
        };
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

  const returnPrintedBatchToSupplier = async ({ batch_id, quantity, return_date, reason }) => {
    try {
      const qtyToReturn = Number(quantity);
      if (!batch_id || isNaN(qtyToReturn) || qtyToReturn <= 0) {
        return { success: false, error: "Please enter a valid quantity to return." };
      }

      const batch = printedBatches.find((b) => b.id === batch_id);
      if (!batch) {
        return { success: false, error: "Printed batch not found." };
      }

      const currentRemaining = Number(batch.quantity_remaining ?? 0);
      if (qtyToReturn > currentRemaining) {
        return {
          success: false,
          error: `Cannot return ${qtyToReturn} units. Only ${currentRemaining} units are remaining in this batch.`
        };
      }

      const unitCost = Number(batch.cost_price ?? 0);
      const totalRefundValue = qtyToReturn * unitCost;
      const returnDate = return_date || new Date().toISOString().split("T")[0];

      // 1. Insert into supplier_returns
      const returnPayload = {
        printed_batch_id: batch.id,
        printed_item_id: batch.printed_item_id,
        quantity_returned: qtyToReturn,
        unit_cost_price: unitCost,
        total_refund_value: totalRefundValue,
        return_date: returnDate,
        reason: reason ? reason.trim() : null,
      };

      try {
        const { error: insErr } = await supabase
          .from("supplier_returns")
          .insert([returnPayload]);
        if (insErr) {
          console.warn("Could not insert supplier_returns record:", insErr);
        }
      } catch (e) {
        console.warn("supplier_returns insert error:", e);
      }

      // 2. Reduce batch quantity_remaining and quantity_received
      const newRemaining = Math.max(0, currentRemaining - qtyToReturn);
      const newReceived = Math.max(0, Number(batch.quantity_received ?? 0) - qtyToReturn);

      const { error: batchErr } = await supabase
        .from("printed_batches")
        .update({
          quantity_remaining: newRemaining,
          quantity_received: newReceived,
        })
        .eq("id", batch.id);

      if (batchErr) throw batchErr;

      // 3. Reduce printed_items stock_quantity
      const targetItem = printedItems.find((p) => p.id === batch.printed_item_id);
      if (targetItem) {
        const newStock = Math.max(0, Number(targetItem.stock_quantity ?? 0) - qtyToReturn);
        await supabase
          .from("printed_items")
          .update({ stock_quantity: newStock })
          .eq("id", batch.printed_item_id);
      }

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error returning printed batch to supplier:", err);
      return { success: false, error: err.message || "Failed to return printed batch to supplier" };
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

  const editPrintedSale = async (id, updatedSale) => {
    try {
      const existingSale = (printedSales || []).find((s) => s.id === id);
      if (!existingSale) {
        return { success: false, error: "Printed sale not found" };
      }

      if (existingSale.returns && existingSale.returns.length > 0) {
        return {
          success: false,
          error: "This sale has recorded customer returns. Please delete the return records before editing the sale.",
        };
      }

      const newQty = Number(updatedSale.quantity);
      const newPrice = Number(updatedSale.sale_price);
      const newPrintedItemId = updatedSale.printed_item_id || existingSale.printed_item_id;

      if (isNaN(newQty) || newQty <= 0) {
        return { success: false, error: "Quantity must be greater than 0." };
      }
      if (isNaN(newPrice) || newPrice < 0) {
        return { success: false, error: "Sale price must be non-negative." };
      }

      // 1. Fetch old consumptions
      const { data: oldConsumptions, error: consumeErr } = await supabase
        .from("printed_sale_batch_consumptions")
        .select("*")
        .eq("printed_sale_id", id);

      if (consumeErr) throw consumeErr;

      // 2. Fetch all printed batches
      const { data: allBatchesRaw, error: fetchBatchesErr } = await supabase
        .from("printed_batches")
        .select("*")
        .order("purchase_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchBatchesErr) throw fetchBatchesErr;

      const restoredBatchesMap = {};
      (allBatchesRaw || []).forEach((b) => {
        restoredBatchesMap[b.id] = {
          ...b,
          cost_price: Number(b.cost_price ?? 0),
          quantity_remaining: Number(b.quantity_remaining ?? 0),
        };
      });

      for (const c of oldConsumptions || []) {
        if (restoredBatchesMap[c.batch_id]) {
          restoredBatchesMap[c.batch_id].quantity_remaining += Number(c.quantity_consumed ?? 0);
        }
      }

      // 3. Pre-validate stock for the new item & quantity
      const availableStock = Object.values(restoredBatchesMap)
        .filter((b) => b.printed_item_id === newPrintedItemId)
        .reduce((sum, b) => sum + b.quantity_remaining, 0);

      if (newQty > availableStock) {
        const itemObj = printedItems.find((p) => p.id === newPrintedItemId);
        const itemName = itemObj?.name || "Printed item";
        return {
          success: false,
          error: `Insufficient stock for "${itemName}". Required: ${newQty}, Available: ${availableStock}`,
        };
      }

      // 4. Restore old batch quantities in DB & delete old consumptions
      if (oldConsumptions && oldConsumptions.length > 0) {
        for (const c of oldConsumptions) {
          const origBatch = (allBatchesRaw || []).find((b) => b.id === c.batch_id);
          const newRemaining = Number(origBatch?.quantity_remaining ?? 0) + Number(c.quantity_consumed ?? 0);
          await supabase
            .from("printed_batches")
            .update({ quantity_remaining: newRemaining })
            .eq("id", c.batch_id);
        }

        await supabase
          .from("printed_sale_batch_consumptions")
          .delete()
          .eq("printed_sale_id", id);
      }

      // 5. FIFO consumption for new item
      let remainingNeeded = newQty;
      let lineCostBasis = 0;
      const newConsumptions = [];
      const batchUpdates = {};

      const candidateBatches = Object.values(restoredBatchesMap).filter(
        (b) => b.printed_item_id === newPrintedItemId && b.quantity_remaining > 0
      );

      for (const batch of candidateBatches) {
        if (remainingNeeded <= 0) break;
        const takeQty = Math.min(batch.quantity_remaining, remainingNeeded);
        batch.quantity_remaining -= takeQty;
        remainingNeeded -= takeQty;

        const consumedCost = takeQty * batch.cost_price;
        lineCostBasis += consumedCost;

        newConsumptions.push({
          printed_sale_id: id,
          batch_id: batch.id,
          quantity_consumed: takeQty,
        });

        batchUpdates[batch.id] = batch.quantity_remaining;
      }

      // 6. Insert new consumptions
      if (newConsumptions.length > 0) {
        const { error: insConsErr } = await supabase
          .from("printed_sale_batch_consumptions")
          .insert(newConsumptions);
        if (insConsErr) {
          console.error("Error inserting printed batch consumptions on edit:", insConsErr);
        }
      }

      // 7. Update printed_batches
      for (const [bId, qRem] of Object.entries(batchUpdates)) {
        await supabase
          .from("printed_batches")
          .update({ quantity_remaining: qRem })
          .eq("id", bId);
      }

      // 8. Calculate new totals
      const lineTotal = newQty * newPrice;
      const lineProfit = lineTotal - lineCostBasis;

      // 9. Payment reconciliation
      const { data: currentPayments } = await supabase
        .from("printed_payments")
        .select("amount")
        .eq("printed_sale_id", id);
      const amountPaid = (currentPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

      if (lineTotal < amountPaid && updatedSale.overpayment_action === "cash_refund") {
        const refundAmt = amountPaid - lineTotal;
        await supabase.from("printed_payments").insert([
          {
            printed_sale_id: id,
            customer_id: updatedSale.customer_id || existingSale.customer_id,
            amount: -refundAmt,
            payment_date: new Date().toISOString().slice(0, 10),
            notes: "Cash refund for printed sale edit price reduction",
          },
        ]);
      }

      const targetPrintedItem = printedItems.find((p) => p.id === newPrintedItemId);
      const targetItemName = targetPrintedItem?.name || existingSale.item_name;

      // 10. Update printed_sales row
      const { error: updSaleErr } = await supabase
        .from("printed_sales")
        .update({
          customer_id: updatedSale.customer_id !== undefined ? updatedSale.customer_id : existingSale.customer_id,
          sale_date: updatedSale.sale_date || existingSale.sale_date,
          printed_item_id: newPrintedItemId,
          item_name: targetItemName,
          quantity: newQty,
          sale_price: newPrice,
          line_total: lineTotal,
          cost_basis: lineCostBasis,
          line_profit: lineProfit,
          notes: updatedSale.notes !== undefined ? updatedSale.notes : existingSale.notes,
        })
        .eq("id", id);

      if (updSaleErr) throw updSaleErr;

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error editing printed sale:", err);
      return { success: false, error: err.message || "Failed to edit printed sale" };
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

  // -- Customer Sales Returns --
  const recordSalesReturn = async ({
    order_id,
    printed_sale_id,
    customer_id,
    return_date,
    items,
    refund_method = "balance_deduction",
    notes,
  }) => {
    try {
      if (!order_id && !printed_sale_id) {
        return { success: false, error: "Return must be associated with an order or printed sale." };
      }
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, error: "Please specify at least one item to return." };
      }

      const validItems = items
        .map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unit_sale_price: Number(it.unit_sale_price ?? 0),
          unit_cost_price: Number(it.unit_cost_price ?? 0),
        }))
        .filter((it) => !isNaN(it.quantity) && it.quantity > 0);

      if (validItems.length === 0) {
        return { success: false, error: "Return quantity must be greater than 0." };
      }

      let totalReturnAmount = 0;
      let totalCostBasis = 0;
      const computedItems = [];

      let custId = customer_id;

      if (order_id) {
        const order = orders.find((o) => o.id === order_id);
        if (!order) return { success: false, error: "Order not found." };
        if (!custId) custId = order.customer_id;

        const subtotal = Number(order.subtotal || 0);
        const originalFinal = Number(order.original_final_total || order.final_total || 0);
        const discountRatio = subtotal > 0 && originalFinal < subtotal
          ? (subtotal - originalFinal) / subtotal
          : 0;

        for (const it of validItems) {
          const orderItem = (order.items || []).find(
            (oi) => (it.order_item_id && oi.id === it.order_item_id) || (oi.product_id === it.product_id)
          );
          if (!orderItem) {
            return { success: false, error: "Returned item not found in order." };
          }

          const available = orderItem.available_to_return !== undefined
            ? orderItem.available_to_return
            : orderItem.quantity;

          if (it.quantity > available + 0.0001) {
            return {
              success: false,
              error: `Cannot return ${it.quantity} units. Only ${available} units are eligible for return.`
            };
          }

          const salePrice = Number(orderItem.sale_price ?? it.unit_sale_price);
          const effectivePrice = Math.max(0, salePrice * (1 - discountRatio));
          const lineReturnTotal = Math.round(it.quantity * effectivePrice * 100) / 100;

          const unitCost = orderItem.cost_basis && orderItem.quantity > 0
            ? (orderItem.cost_basis / orderItem.quantity)
            : (it.unit_cost_price || 0);
          const lineCostBasis = Math.round(it.quantity * unitCost * 100) / 100;

          totalReturnAmount += lineReturnTotal;
          totalCostBasis += lineCostBasis;

          computedItems.push({
            order_item_id: orderItem.id,
            product_id: orderItem.product_id,
            quantity_returned: it.quantity,
            unit_sale_price: salePrice,
            unit_cost_price: unitCost,
            line_return_total: lineReturnTotal,
          });
        }
      } else if (printed_sale_id) {
        const sale = printedSales.find((s) => s.id === printed_sale_id);
        if (!sale) return { success: false, error: "Printed sale not found." };
        if (!custId) custId = sale.customer_id;

        const available = sale.available_to_return !== undefined
          ? sale.available_to_return
          : sale.quantity;

        const it = validItems[0];
        if (it.quantity > available + 0.0001) {
          return {
            success: false,
            error: `Cannot return ${it.quantity} units. Only ${available} units are eligible for return.`
          };
        }

        const salePrice = Number(sale.sale_price ?? it.unit_sale_price);
        const lineReturnTotal = Math.round(it.quantity * salePrice * 100) / 100;
        const unitCost = sale.cost_basis && sale.quantity > 0
          ? (sale.cost_basis / sale.quantity)
          : (it.unit_cost_price || 0);
        const lineCostBasis = Math.round(it.quantity * unitCost * 100) / 100;

        totalReturnAmount = lineReturnTotal;
        totalCostBasis = lineCostBasis;

        computedItems.push({
          printed_item_id: sale.printed_item_id,
          quantity_returned: it.quantity,
          unit_sale_price: salePrice,
          unit_cost_price: unitCost,
          line_return_total: lineReturnTotal,
        });
      }

      totalReturnAmount = Math.round(totalReturnAmount * 100) / 100;
      totalCostBasis = Math.round(totalCostBasis * 100) / 100;
      const returnDate = return_date || new Date().toISOString().split("T")[0];

      // 1. Insert into sales_returns
      const returnPayload = {
        order_id: order_id || null,
        printed_sale_id: printed_sale_id || null,
        customer_id: custId || null,
        return_date: returnDate,
        total_return_amount: totalReturnAmount,
        total_cost_basis: totalCostBasis,
        refund_method,
        notes: notes ? notes.trim() : null,
      };

      const { data: returnData, error: retErr } = await supabase
        .from("sales_returns")
        .insert([returnPayload])
        .select();

      if (retErr) throw retErr;
      const createdReturn = returnData[0];

      // 2. Insert into sales_return_items
      const returnItemsPayload = computedItems.map((ci) => ({
        return_id: createdReturn.id,
        order_item_id: ci.order_item_id || null,
        product_id: ci.product_id || null,
        printed_item_id: ci.printed_item_id || null,
        quantity_returned: ci.quantity_returned,
        unit_sale_price: ci.unit_sale_price,
        unit_cost_price: ci.unit_cost_price,
        line_return_total: ci.line_return_total,
      }));

      const { error: retItemsErr } = await supabase
        .from("sales_return_items")
        .insert(returnItemsPayload);

      if (retItemsErr) {
        console.warn("Error inserting sales_return_items:", retItemsErr);
      }

      // 3. Handle cash refund settlement (negative payment)
      if (refund_method === "cash_refund" && custId) {
        if (order_id) {
          const { error: payErr } = await supabase.from("payments").insert([{
            order_id,
            customer_id: custId,
            amount: -totalReturnAmount,
            payment_date: returnDate,
            notes: `Cash refund for return #${createdReturn.id.slice(0, 8)}`,
          }]);
          if (payErr) console.warn("Error logging cash refund payment:", payErr);
        } else if (printed_sale_id) {
          const { error: payErr } = await supabase.from("printed_payments").insert([{
            printed_sale_id,
            customer_id: custId,
            amount: -totalReturnAmount,
            payment_date: returnDate,
            notes: `Cash refund for return #${createdReturn.id.slice(0, 8)}`,
          }]);
          if (payErr) console.warn("Error logging printed cash refund payment:", payErr);
        }
      }

      // 4. Update products & printed_items stock_quantity directly
      for (const ci of computedItems) {
        if (ci.product_id) {
          const prod = products.find((p) => p.id === ci.product_id);
          if (prod) {
            const updatedStock = Number(prod.stock_quantity ?? 0) + ci.quantity_returned;
            await supabase
              .from("products")
              .update({ stock_quantity: updatedStock })
              .eq("id", ci.product_id);
          }
        }
        if (ci.printed_item_id) {
          const pItem = printedItems.find((p) => p.id === ci.printed_item_id);
          if (pItem) {
            const updatedStock = Number(pItem.stock_quantity ?? 0) + ci.quantity_returned;
            await supabase
              .from("printed_items")
              .update({ stock_quantity: updatedStock })
              .eq("id", ci.printed_item_id);
          }
        }
      }

      // 5. Trigger full sync
      await fetchData();
      return { success: true, data: createdReturn };
    } catch (err) {
      console.error("Error recording sales return:", err);
      return { success: false, error: err.message || "Failed to record sales return" };
    }
  };

  const deleteSalesReturn = async (id) => {
    try {
      const returnRecord = salesReturns.find((r) => r.id === id);
      if (!returnRecord) {
        return { success: false, error: "Return record not found." };
      }

      // 1. If cash refund was recorded, remove the negative payment
      if (returnRecord.refund_method === "cash_refund") {
        if (returnRecord.order_id) {
          await supabase
            .from("payments")
            .delete()
            .eq("order_id", returnRecord.order_id)
            .ilike("notes", `%${returnRecord.id.slice(0, 8)}%`);
        } else if (returnRecord.printed_sale_id) {
          await supabase
            .from("printed_payments")
            .delete()
            .eq("printed_sale_id", returnRecord.printed_sale_id)
            .ilike("notes", `%${returnRecord.id.slice(0, 8)}%`);
        }
      }

      // 2. Deduct the returned quantities back out of products/printed_items stock
      for (const item of (returnRecord.items || [])) {
        if (item.product_id) {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) {
            const newStock = Math.max(0, Number(prod.stock_quantity ?? 0) - Number(item.quantity_returned ?? 0));
            await supabase.from("products").update({ stock_quantity: newStock }).eq("id", item.product_id);
          }
        }
        if (item.printed_item_id) {
          const pItem = printedItems.find((p) => p.id === item.printed_item_id);
          if (pItem) {
            const newStock = Math.max(0, Number(pItem.stock_quantity ?? 0) - Number(item.quantity_returned ?? 0));
            await supabase.from("printed_items").update({ stock_quantity: newStock }).eq("id", item.printed_item_id);
          }
        }
      }

      // 3. Delete from sales_returns (cascades to sales_return_items)
      const { error: delErr } = await supabase
        .from("sales_returns")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;

      await fetchData();
      return { success: true };
    } catch (err) {
      console.error("Error deleting sales return:", err);
      return { success: false, error: err.message || "Failed to delete sales return" };
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
    productBatches,
    printedItems,
    printedBatches,
    printedSales,
    printedPayments,
    supplierReturns,
    salesReturns,
    isLoading,
    error,
    refreshData: fetchData,
    addProduct,
    updateProduct,
    deleteProduct,
    addStockBatch,
    editBatch,
    deleteBatch,
    returnBatchToSupplier,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addOrder,
    editOrder,
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
    returnPrintedBatchToSupplier,
    addPrintedSale,
    editPrintedSale,
    deletePrintedSale,
    recordPrintedPayment,
    recordSalesReturn,
    deleteSalesReturn,
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
