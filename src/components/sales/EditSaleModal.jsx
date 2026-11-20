import { useState, useMemo, useEffect } from "react";
import { Modal, Button, Input, DatePicker, Select } from "@/components/ui";
import { formatCurrency, parseNumber, toEnglishDigits } from "@/utils/currency";
import { useAppData } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";

export function EditSaleModal({ isOpen, onClose, sale, type = "bags" }) {
  const { products, categories, printedItems, editOrder, editPrintedSale } = useAppData();
  const { success, error: toastError } = useToast();

  const [orderDate, setOrderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [items, setItems] = useState([]);
  const [printedData, setPrintedData] = useState({ printed_item_id: "", quantity: "", sale_price: "" });
  const [overpaymentAction, setOverpaymentAction] = useState("balance_credit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize form when modal opens with a sale
  useEffect(() => {
    if (!isOpen || !sale) return;
    setTimeout(() => {
      setErrorMsg("");
      setOverpaymentAction("balance_credit");
      if (type === "bags") {
        setOrderDate(sale.order_date ? sale.order_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setNotes(sale.notes || "");
        setDiscountType(sale.discount_type || "none");
        setDiscountValue(sale.discount_value !== undefined && sale.discount_value !== null ? String(sale.discount_value) : "");
        setItems(
          (sale.items || []).map((it, idx) => ({
            id: it.id || `line_${idx}_${Date.now()}`,
            product_id: it.product_id,
            quantity: String(it.quantity ?? 1),
            sale_price: String(it.sale_price ?? 0),
          }))
        );
      } else {
        // printed sale
        setOrderDate(sale.sale_date ? sale.sale_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
        setNotes(sale.notes || "");
        setPrintedData({
          printed_item_id: sale.printed_item_id || "",
          quantity: String(sale.quantity ?? 1),
          sale_price: String(sale.sale_price ?? 0),
        });
      }
    }, 0);
  }, [isOpen, sale, type]);

  // Stock calculation for bags: product.stock_quantity + previously consumed in this sale
  const getProductAvailableStock = useMemo(() => {
    return (productId) => {
      const prod = products.find((p) => p.id === productId);
      if (!prod) return 0;
      const prevQtyInThisSale = (sale?.items || [])
        .filter((it) => it.product_id === productId)
        .reduce((sum, it) => sum + Number(it.quantity || 0), 0);
      return Number(prod.stock_quantity ?? 0) + prevQtyInThisSale;
    };
  }, [products, sale]);

  // Stock calculation for printed items
  const getPrintedAvailableStock = useMemo(() => {
    return (printedItemId) => {
      const item = printedItems.find((p) => p.id === printedItemId);
      if (!item) return 0;
      const prevQtyInThisSale = sale?.printed_item_id === printedItemId ? Number(sale.quantity || 0) : 0;
      return Number(item.stock_quantity ?? 0) + prevQtyInThisSale;
    };
  }, [printedItems, sale]);

  // Bags Totals Calculation
  const bagsCalculations = useMemo(() => {
    if (type !== "bags") return { subtotal: 0, discountVal: 0, finalTotal: 0 };
    let sub = 0;
    items.forEach((it) => {
      const q = parseNumber(toEnglishDigits(it.quantity || "0")) || 0;
      const p = parseNumber(toEnglishDigits(it.sale_price || "0")) || 0;
      sub += Math.round(q * p * 100) / 100;
    });

    const rawDisc = parseNumber(toEnglishDigits(discountValue || "0")) || 0;
    let discVal = 0;
    if (discountType === "percentage") {
      discVal = (sub * rawDisc) / 100;
    } else if (discountType === "fixed") {
      discVal = rawDisc;
    }
    const fin = Math.max(0, sub - discVal);
    return {
      subtotal: Math.round(sub * 100) / 100,
      discountVal: Math.round(discVal * 100) / 100,
      finalTotal: Math.round(fin * 100) / 100,
    };
  }, [type, items, discountType, discountValue]);

  // Printed Total Calculation
  const printedCalculations = useMemo(() => {
    if (type !== "printed") return { finalTotal: 0 };
    const q = parseNumber(toEnglishDigits(printedData.quantity || "0")) || 0;
    const p = parseNumber(toEnglishDigits(printedData.sale_price || "0")) || 0;
    const fin = Math.round(q * p * 100) / 100;
    return { finalTotal: fin };
  }, [type, printedData]);

  const currentFinalTotal = type === "bags" ? bagsCalculations.finalTotal : printedCalculations.finalTotal;
  const originalFinalTotal = Number(sale?.original_final_total || sale?.final_total || sale?.line_total || 0);
  const amountPaid = Number(sale?.amount_paid || 0);
  const totalDiff = Math.round((currentFinalTotal - originalFinalTotal) * 100) / 100;
  const newBalanceDue = Math.max(0, Math.round((currentFinalTotal - amountPaid) * 100) / 100);
  const isOverpaid = amountPaid > currentFinalTotal;
  const overpaidAmount = isOverpaid ? Math.round((amountPaid - currentFinalTotal) * 100) / 100 : 0;

  // Handlers for bags line items
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleProductChange = (index, newProductId) => {
    const prod = products.find((p) => p.id === newProductId);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        product_id: newProductId,
        sale_price: prod?.sale_price ? String(prod.sale_price) : next[index].sale_price,
      };
      return next;
    });
  };

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        id: `line_${Date.now()}`,
        product_id: firstProd?.id || "",
        quantity: "1",
        sale_price: firstProd?.sale_price ? String(firstProd.sale_price) : "0",
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (sale?.returns && sale.returns.length > 0) {
      setErrorMsg("This sale has recorded customer returns. Please delete the returns before editing.");
      return;
    }

    setIsSubmitting(true);

    if (type === "bags") {
      if (items.length === 0) {
        setErrorMsg("Order must contain at least one product.");
        setIsSubmitting(false);
        return;
      }

      // Validate quantities and stock
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const q = parseNumber(toEnglishDigits(it.quantity || "0"));
        if (isNaN(q) || q <= 0) {
          setErrorMsg(`Line ${i + 1}: Quantity must be greater than 0.`);
          setIsSubmitting(false);
          return;
        }
        const avail = getProductAvailableStock(it.product_id);
        if (q > avail) {
          const prod = products.find((p) => p.id === it.product_id);
          setErrorMsg(`Line ${i + 1} (${prod?.name || "Product"}): Quantity exceeds available stock (${avail} ${prod?.unit || "kg"}).`);
          setIsSubmitting(false);
          return;
        }
      }

      const res = await editOrder(sale.id, {
        order_date: orderDate ? `${orderDate}T12:00:00Z` : sale.order_date,
        discount_type: discountType,
        discount_value: parseNumber(toEnglishDigits(discountValue || "0")) || 0,
        notes: notes.trim(),
        overpayment_action: overpaymentAction,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: parseNumber(toEnglishDigits(it.quantity)),
          sale_price: parseNumber(toEnglishDigits(it.sale_price)),
        })),
      });

      setIsSubmitting(false);
      if (res && res.success) {
        success("Sale updated successfully");
        onClose();
      } else {
        const msg = res?.error || "Failed to update sale.";
        setErrorMsg(msg);
        toastError(msg);
      }
    } else {
      // Printed Sale
      const q = parseNumber(toEnglishDigits(printedData.quantity || "0"));
      const p = parseNumber(toEnglishDigits(printedData.sale_price || "0"));

      if (isNaN(q) || q <= 0) {
        setErrorMsg("Quantity must be greater than 0.");
        setIsSubmitting(false);
        return;
      }
      if (isNaN(p) || p < 0) {
        setErrorMsg("Sale price cannot be negative.");
        setIsSubmitting(false);
        return;
      }

      const avail = getPrintedAvailableStock(printedData.printed_item_id);
      if (q > avail) {
        const item = printedItems.find((pi) => pi.id === printedData.printed_item_id);
        setErrorMsg(`Quantity exceeds available stock (${avail} ${item?.unit || "piece"}).`);
        setIsSubmitting(false);
        return;
      }

      const res = await editPrintedSale(sale.id, {
        sale_date: orderDate ? `${orderDate}T12:00:00Z` : sale.sale_date,
        printed_item_id: printedData.printed_item_id,
        quantity: q,
        sale_price: p,
        notes: notes.trim(),
        overpayment_action: overpaymentAction,
      });

      setIsSubmitting(false);
      if (res && res.success) {
        success("Sale updated successfully");
        onClose();
      } else {
        const msg = res?.error || "Failed to update printed sale.";
        setErrorMsg(msg);
        toastError(msg);
      }
    }
  };

  if (!isOpen || !sale) return null;

  const customerName = sale.customerName || sale.customers?.name || "Walk-in Customer";
  const hasReturns = sale.returns && sale.returns.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={`Edit Sale — Ref #${sale.id}`}
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || hasReturns}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {hasReturns && (
          <div className="p-3.5 rounded-xl bg-[var(--color-app-danger)]/10 border border-[var(--color-app-danger)]/25 text-xs text-[var(--color-app-danger)] font-medium flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              This sale cannot be edited directly because it has recorded customer returns. Please remove or reverse the return before modifying items.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-xs border border-[var(--color-app-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Customer & Date Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-0.5">
              Customer
            </span>
            <span className="text-sm font-bold text-[var(--color-app-text)]">{customerName}</span>
          </div>

          <DatePicker
            label="Sale Date"
            value={orderDate}
            onChange={(iso) => setOrderDate(iso)}
            required
          />
        </div>

        {/* ── BAGS SALE LINE ITEMS ── */}
        {type === "bags" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">
                Products & Line Items ({items.length})
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddItem}
                className="text-xs h-7 px-2.5"
              >
                + Add Product
              </Button>
            </div>

            <div className="flex flex-col gap-2.5">
              {items.map((lineItem, idx) => {
                const prod = products.find((p) => p.id === lineItem.product_id);
                const availableStock = getProductAvailableStock(lineItem.product_id);
                const qtyNum = parseNumber(toEnglishDigits(lineItem.quantity || "0")) || 0;
                const priceNum = parseNumber(toEnglishDigits(lineItem.sale_price || "0")) || 0;
                const lineTotal = Math.round(qtyNum * priceNum * 100) / 100;
                const isOverStock = qtyNum > availableStock;

                return (
                  <div
                    key={lineItem.id}
                    className="p-3.5 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Product Selector Dropdown */}
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
                          Product
                        </label>
                        <select
                          value={lineItem.product_id}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full h-9 px-3 rounded-lg text-xs bg-[var(--color-app-bg)] text-[var(--color-app-text)] border border-[var(--color-app-border)] focus:ring-2 focus:ring-[var(--color-app-border-focus)] outline-none transition-colors cursor-pointer"
                        >
                          {categories.map((cat) => {
                            const catProds = products.filter((p) => p.category_id === cat.id);
                            if (catProds.length === 0) return null;
                            return (
                              <optgroup key={cat.id} label={cat.name} className="bg-[#1f2937] text-white">
                                {catProds.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-mono ${isOverStock ? "text-[var(--color-app-danger)] font-bold" : "text-[var(--color-app-text-subtle)]"}`}>
                            Available stock: {availableStock} {prod?.unit || "kg"}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
                          Quantity ({prod?.unit || "kg"})
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="0"
                          value={lineItem.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          inputClassName={`h-9 text-xs font-mono text-right ${isOverStock ? "border-[var(--color-app-danger)]" : ""}`}
                        />
                      </div>

                      {/* Price Input */}
                      <div className="w-full sm:w-32">
                        <label className="block text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
                          Price (EGP)
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={lineItem.sale_price}
                          onChange={(e) => handleItemChange(idx, "sale_price", e.target.value)}
                          inputClassName="h-9 text-xs font-mono text-right"
                        />
                      </div>

                      {/* Line Total & Remove button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 sm:min-w-[110px]">
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-0.5">
                            Line Total
                          </span>
                          <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-danger)] transition-colors rounded"
                            title="Remove line item"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Discounts Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)]">
              <Select
                label="Discount Type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                options={[
                  { value: "none", label: "No Discount" },
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed", label: "Fixed Amount (EGP)" },
                ]}
                selectClassName="h-9 text-xs font-semibold"
              />

              {discountType !== "none" && (
                <Input
                  label={`Discount Value (${discountType === "percentage" ? "%" : "EGP"})`}
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  inputClassName="h-9 text-xs font-mono"
                />
              )}
            </div>
          </div>
        )}

        {/* ── PRINTED SALE ITEM EDIT ── */}
        {type === "printed" && (
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)]">
            <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">
              Printed Item Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
                  Printed Item
                </label>
                <select
                  value={printedData.printed_item_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const pItem = printedItems.find((p) => p.id === selId);
                    setPrintedData((prev) => ({
                      ...prev,
                      printed_item_id: selId,
                      sale_price: pItem?.sale_price ? String(pItem.sale_price) : prev.sale_price,
                    }));
                  }}
                  className="w-full h-9 px-3 rounded-lg text-xs bg-[var(--color-app-bg)] text-[var(--color-app-text)] border border-[var(--color-app-border)] focus:ring-2 focus:ring-[var(--color-app-border-focus)] outline-none transition-colors cursor-pointer"
                >
                  {printedItems.map((pi) => (
                    <option key={pi.id} value={pi.id} className="bg-[#1f2937] text-white">
                      {pi.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[var(--color-app-text-subtle)] font-mono mt-1 block">
                  Available: {getPrintedAvailableStock(printedData.printed_item_id)} units
                </span>
              </div>

              <div>
                <Input
                  label="Quantity"
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0"
                  value={printedData.quantity}
                  onChange={(e) => setPrintedData((prev) => ({ ...prev, quantity: e.target.value }))}
                  inputClassName="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <Input
                  label="Sale Price (EGP)"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={printedData.sale_price}
                  onChange={(e) => setPrintedData((prev) => ({ ...prev, sale_price: e.target.value }))}
                  inputClassName="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          type="text"
          placeholder="e.g. Swapped product per customer request"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          inputClassName="h-9 text-xs"
        />

        {/* ── LIVE FINANCIAL SUMMARY DIFF ── */}
        <div className="p-4 rounded-xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">
            <span>Financial Adjustment Summary</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-app-text-muted)] uppercase">Previous Total</span>
              <span className="font-mono font-medium text-[var(--color-app-text-muted)] line-through">
                {formatCurrency(originalFinalTotal)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-app-text-muted)] uppercase">New Net Total</span>
              <span className="font-mono font-bold text-sm text-[var(--color-app-text)]">
                {formatCurrency(currentFinalTotal)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-app-text-muted)] uppercase">Difference</span>
              <span className={`font-mono font-bold ${totalDiff > 0 ? "text-[var(--color-app-warning)]" : totalDiff < 0 ? "text-[var(--color-app-success)]" : "text-[var(--color-app-text-muted)]"}`}>
                {totalDiff > 0 ? `+${formatCurrency(totalDiff)}` : formatCurrency(totalDiff)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-app-text-muted)] uppercase">New Balance Due</span>
              <span className={`font-mono font-bold ${newBalanceDue > 0 ? "text-[var(--color-app-warning)]" : "text-[var(--color-app-success)]"}`}>
                {newBalanceDue > 0 ? formatCurrency(newBalanceDue) : "Settled"}
              </span>
            </div>
          </div>

          {/* Overpayment Resolution Options */}
          {isOverpaid && (
            <div className="mt-2 pt-3 border-t border-[var(--color-app-border)] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-app-success)]">
                  Customer Overpaid: {formatCurrency(overpaidAmount)}
                </span>
                <span className="text-[10px] text-[var(--color-app-text-muted)]">
                  (Paid {formatCurrency(amountPaid)} on new total of {formatCurrency(currentFinalTotal)})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${overpaymentAction === "balance_credit" ? "border-[var(--color-app-accent)] bg-[var(--color-app-accent)]/10 text-[var(--color-app-text)] font-semibold" : "border-[var(--color-app-border)] text-[var(--color-app-text-muted)]"}`}>
                  <input
                    type="radio"
                    name="overpaymentAction"
                    value="balance_credit"
                    checked={overpaymentAction === "balance_credit"}
                    onChange={() => setOverpaymentAction("balance_credit")}
                    className="accent-[var(--color-app-accent)]"
                  />
                  <span>Credit to Customer Balance</span>
                </label>

                <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${overpaymentAction === "cash_refund" ? "border-[var(--color-app-accent)] bg-[var(--color-app-accent)]/10 text-[var(--color-app-text)] font-semibold" : "border-[var(--color-app-border)] text-[var(--color-app-text-muted)]"}`}>
                  <input
                    type="radio"
                    name="overpaymentAction"
                    value="cash_refund"
                    checked={overpaymentAction === "cash_refund"}
                    onChange={() => setOverpaymentAction("cash_refund")}
                    className="accent-[var(--color-app-accent)]"
                  />
                  <span>Cash Refund to Customer</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
