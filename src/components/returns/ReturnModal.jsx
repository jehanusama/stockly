import { useState, useMemo, useEffect } from "react";
import { Modal, Button, Input, DatePicker } from "@/components/ui";
import { formatCurrency, parseNumber, toEnglishDigits } from "@/utils/currency";
import { useAppData } from "@/context/AppContext";

export function ReturnModal({ isOpen, onClose, sale, type = "bags" }) {
  const { products, printedItems, recordSalesReturn } = useAppData();
  
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundMethod, setRefundMethod] = useState("balance_deduction");
  const [notes, setNotes] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize or reset quantities when modal opens with a sale
  useEffect(() => {
    if (!isOpen || !sale) return;
    setTimeout(() => {
      setReturnDate(new Date().toISOString().split("T")[0]);
      setRefundMethod("balance_deduction");
      setNotes("");
      setErrorMsg("");
      setReturnQuantities({});
    }, 0);
  }, [isOpen, sale]);

  // Normalize sale items
  const normalizedItems = useMemo(() => {
    if (!sale) return [];

    if (type === "bags") {
      const subtotal = Number(sale.subtotal || 0);
      const originalFinal = Number(sale.original_final_total || sale.final_total || 0);
      const discountRatio = subtotal > 0 && originalFinal < subtotal
        ? (subtotal - originalFinal) / subtotal
        : 0;

      return (sale.items || []).map((item, idx) => {
        const product = products.find((p) => p.id === item.product_id);
        const salePrice = Number(item.sale_price ?? 0);
        const effectivePrice = Math.max(0, salePrice * (1 - discountRatio));
        const availableToReturn = item.available_to_return !== undefined
          ? Number(item.available_to_return)
          : Number(item.quantity ?? 0);
        const returnedSoFar = item.returned_quantity !== undefined
          ? Number(item.returned_quantity)
          : Math.max(0, Number(item.quantity ?? 0) - availableToReturn);

        return {
          id: item.id || `item_${idx}`,
          order_item_id: item.id,
          product_id: item.product_id,
          name: product?.name || "Product",
          unit: product?.unit || "kilo",
          originalQuantity: Number(item.quantity ?? 0),
          returnedSoFar,
          availableToReturn,
          salePrice,
          effectivePrice,
          cost_basis: Number(item.cost_basis ?? 0),
        };
      });
    } else {
      // Printed sale
      const item = printedItems.find((p) => p.id === sale.printed_item_id) || sale.printed_items;
      const salePrice = Number(sale.sale_price ?? 0);
      const availableToReturn = sale.available_to_return !== undefined
        ? Number(sale.available_to_return)
        : Number(sale.quantity ?? 0);
      const returnedSoFar = sale.returned_quantity !== undefined
        ? Number(sale.returned_quantity)
        : Math.max(0, Number(sale.quantity ?? 0) - availableToReturn);

      return [
        {
          id: sale.id,
          printed_item_id: sale.printed_item_id,
          name: item?.name || "Printed Item",
          unit: item?.unit || "piece",
          originalQuantity: Number(sale.quantity ?? 0),
          returnedSoFar,
          availableToReturn,
          salePrice,
          effectivePrice: salePrice,
          cost_basis: Number(sale.cost_basis ?? 0),
        },
      ];
    }
  }, [sale, type, products, printedItems]);

  // Compute live return summary
  const { totalReturnAmount, itemsToReturn } = useMemo(() => {
    let sum = 0;
    const computed = [];

    for (const item of normalizedItems) {
      const rawVal = returnQuantities[item.id];
      if (rawVal !== undefined && rawVal !== "") {
        const qty = parseNumber(toEnglishDigits(rawVal));
        if (!isNaN(qty) && qty > 0) {
          sum += Math.round(qty * item.effectivePrice * 100) / 100;
          computed.push({
            order_item_id: item.order_item_id,
            product_id: item.product_id,
            printed_item_id: item.printed_item_id,
            quantity: qty,
            unit_sale_price: item.salePrice,
            unit_cost_price: item.originalQuantity > 0 ? (item.cost_basis / item.originalQuantity) : 0,
            lineTotal: Math.round(qty * item.effectivePrice * 100) / 100,
          });
        }
      }
    }

    return {
      totalReturnAmount: Math.round(sum * 100) / 100,
      itemsToReturn: computed,
    };
  }, [normalizedItems, returnQuantities]);

  if (!isOpen || !sale) return null;

  const customerName = sale.customerName || sale.customers?.name || "Guest / Cash Customer";
  const currentBalance = Number(sale.balance_due ?? 0);
  const totalBill = Number(sale.final_total ?? sale.line_total ?? 0);

  const handleQuantityChange = (itemId, val) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleReturnAll = (item) => {
    if (item.availableToReturn > 0) {
      setReturnQuantities((prev) => ({
        ...prev,
        [item.id]: String(item.availableToReturn),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (itemsToReturn.length === 0) {
      setErrorMsg("Please specify a return quantity greater than 0 for at least one item.");
      return;
    }

    // Validate available limits
    for (const it of itemsToReturn) {
      const match = normalizedItems.find(
        (n) => (n.order_item_id && n.order_item_id === it.order_item_id) || (n.printed_item_id && n.printed_item_id === it.printed_item_id)
      );
      if (match && it.quantity > match.availableToReturn + 0.0001) {
        setErrorMsg(`Cannot return ${it.quantity} ${match.unit} of ${match.name}. Only ${match.availableToReturn} ${match.unit} eligible.`);
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      order_id: type === "bags" ? sale.id : null,
      printed_sale_id: type === "printed" ? sale.id : null,
      customer_id: sale.customer_id || null,
      return_date: returnDate,
      items: itemsToReturn,
      refund_method: refundMethod,
      notes: notes.trim() || null,
    };

    const res = await recordSalesReturn(payload);
    setIsSubmitting(false);

    if (res && !res.success) {
      setErrorMsg(res.error || "Failed to record sales return.");
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Return Items — ${type === "bags" ? "Order" : "Printed Sale"} #${sale.id.slice(0, 8)}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
            {errorMsg}
          </div>
        )}

        {/* Sale & Customer Header Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] text-xs">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
              Customer
            </span>
            <span className="font-semibold text-sm text-[var(--color-app-text)] truncate block mt-0.5">
              {customerName}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
              Current Bill
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--color-app-text)] block mt-0.5">
              {formatCurrency(totalBill)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
              Outstanding Debt
            </span>
            <span className={`font-mono text-sm font-bold block mt-0.5 ${currentBalance > 0 ? "text-[var(--color-app-warning)]" : "text-[var(--color-app-success)]"}`}>
              {currentBalance > 0 ? formatCurrency(currentBalance) : "Fully Paid (0.00)"}
            </span>
          </div>
        </div>

        {/* Items Return Table */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
              Select Items to Return
            </span>
            <span className="text-xs text-[var(--color-app-text-muted)]">
              {normalizedItems.length} item{normalizedItems.length !== 1 ? "s" : ""} in sale
            </span>
          </div>

          <div className="rounded-xl border border-[var(--color-app-border)] overflow-hidden bg-[var(--color-app-panel)]">
            <div className="divide-y divide-[var(--color-app-border)]">
              {normalizedItems.map((item) => {
                const canReturn = item.availableToReturn > 0;

                return (
                  <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--color-app-text)]">
                          {item.name}
                        </span>
                        {item.returnedSoFar > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-app-warning-muted)] text-[var(--color-app-warning)] border border-[var(--color-app-warning)]/30">
                            {item.returnedSoFar} {item.unit} previously returned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-app-text-muted)] mt-1 font-mono">
                        <span>Original: {item.originalQuantity} {item.unit}</span>
                        <span>•</span>
                        <span>Eligible: <strong className={canReturn ? "text-[var(--color-app-success)]" : "text-[var(--color-app-text-muted)]"}>{item.availableToReturn} {item.unit}</strong></span>
                        <span>•</span>
                        <span>Unit: {formatCurrency(item.effectivePrice)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canReturn ? (
                        <>
                          <div className="w-28">
                            <Input
                              type="number"
                              min="0"
                              max={item.availableToReturn}
                              step="any"
                              placeholder="0"
                              value={returnQuantities[item.id] ?? ""}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="text-right font-mono"
                            />
                          </div>
                          <span className="text-xs text-[var(--color-app-text-muted)] font-mono min-w-[28px]">
                            {item.unit}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="text-[11px] h-8 px-2"
                            onClick={() => handleReturnAll(item)}
                            title="Return all eligible units"
                          >
                            All
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-[var(--color-app-text-muted)] italic">
                          Fully returned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Return Summary Card */}
        <div className="p-4 rounded-xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--color-app-text)]">Total Refund / Return Value</span>
            <span className="font-mono text-lg font-bold text-[var(--color-app-warning)]">
              {formatCurrency(totalReturnAmount)}
            </span>
          </div>

          <div className="border-t border-[var(--color-app-border)]/60 pt-3 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
              Settlement / Refund Method
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                refundMethod === "balance_deduction"
                  ? "bg-[var(--color-app-panel)] border-[var(--color-app-primary)] ring-1 ring-[var(--color-app-primary)]"
                  : "bg-[var(--color-app-bg)] border-[var(--color-app-border)] hover:bg-[var(--color-app-panel)]"
              }`}>
                <input
                  type="radio"
                  name="refund_method"
                  value="balance_deduction"
                  checked={refundMethod === "balance_deduction"}
                  onChange={() => setRefundMethod("balance_deduction")}
                  className="mt-0.5 text-[var(--color-app-primary)]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[var(--color-app-text)]">Deduct from Balance</div>
                  <div className="text-[var(--color-app-text-muted)] mt-0.5 leading-relaxed">
                    Credits customer debt. Reduces outstanding balance directly.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                refundMethod === "cash_refund"
                  ? "bg-[var(--color-app-panel)] border-[var(--color-app-warning)] ring-1 ring-[var(--color-app-warning)]"
                  : "bg-[var(--color-app-bg)] border-[var(--color-app-border)] hover:bg-[var(--color-app-panel)]"
              }`}>
                <input
                  type="radio"
                  name="refund_method"
                  value="cash_refund"
                  checked={refundMethod === "cash_refund"}
                  onChange={() => setRefundMethod("cash_refund")}
                  className="mt-0.5 text-[var(--color-app-warning)]"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[var(--color-app-text)]">Cash Refund</div>
                  <div className="text-[var(--color-app-text-muted)] mt-0.5 leading-relaxed">
                    Physical cash handed back. Logs negative payment in cash ledger.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Date and Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePicker
            label="Return Date"
            value={returnDate}
            onChange={(iso) => setReturnDate(iso)}
            required
          />

          <Input
            label="Reason / Notes (Optional)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Wrong thickness, Defective batch..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={totalReturnAmount <= 0}
          >
            Confirm Return ({formatCurrency(totalReturnAmount)})
          </Button>
        </div>
      </form>
    </Modal>
  );
}
