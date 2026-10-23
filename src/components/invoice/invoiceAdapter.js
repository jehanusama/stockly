

export function normalizeBagsOrder(order, products = [], customer = null) {
  if (!order) return null;

  const customerName = order.customerName || customer?.name || "Customer";
  const date = order.order_date || order.created_at;

  const items = (order.items || []).map((item, idx) => {
    const product = products.find(p => p.id === item.product_id);
    const qty = Number(item.quantity ?? 1);
    const unitPrice = Number(item.sale_price ?? 0);
    const lineTotal = Number(item.line_total ?? (qty * unitPrice));

    return {
      id: item.id || `${item.product_id || "prod"}-${idx}`,
      name: product?.name || item.name || "Item",
      unit: product?.unit || item.unit,
      quantity: qty,
      unitPrice,
      lineTotal,
    };
  });

  const subtotal = Number(order.subtotal ?? order.final_total ?? 0);
  const finalTotal = Number(order.final_total ?? 0);
  const discount = order.discountAmount != null
    ? Number(order.discountAmount)
    : (order.discount_type && order.discount_type !== "none" ? Math.max(0, subtotal - finalTotal) : 0);

  const amountPaid = Number(order.amount_paid ?? 0);
  const balanceDue = Number(order.balance_due ?? Math.max(0, finalTotal - amountPaid));

  return {
    customerName,
    date,
    items,
    subtotal: discount > 0 ? subtotal : undefined,
    discount,
    finalTotal,
    amountPaid,
    balanceDue,
    notes: order.notes,
  };
}

export function normalizePrintedSale(sale, customer = null, printedItem = null) {
  if (!sale) return null;

  const customerName = sale.customerName || customer?.name || sale.customers?.name || "Customer";
  const date = sale.sale_date || sale.created_at;
  const itemName = sale.itemName || printedItem?.name || sale.printed_items?.name || "Printed Item";
  const itemUnit = sale.itemUnit || printedItem?.unit || sale.printed_items?.unit || "piece";

  const quantity = Number(sale.quantity ?? 1);
  const unitPrice = Number(sale.sale_price ?? 0);
  const lineTotal = Number(sale.line_total ?? (quantity * unitPrice));
  const finalTotal = lineTotal;
  const amountPaid = Number(sale.amount_paid ?? 0);
  const balanceDue = Number(sale.balance_due ?? Math.max(0, finalTotal - amountPaid));

  return {
    customerName,
    date,
    items: [
      {
        id: sale.id || "printed-item-0",
        name: itemName,
        unit: itemUnit,
        quantity,
        unitPrice,
        lineTotal,
      },
    ],
    subtotal: undefined,
    discount: 0,
    finalTotal,
    amountPaid,
    balanceDue,
    notes: sale.notes,
  };
}

export function normalizeLedgerTransaction(txn, customer = null) {
  if (!txn) return null;

  return {
    customerName: customer?.name || "Customer",
    date: txn.date,
    items: (txn.items || []).map((item, idx) => ({
      id: item.id || `ledger-item-${idx}`,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.price ?? 0),
      lineTotal: Number(item.lineTotal ?? (item.quantity * item.price)),
    })),
    subtotal: txn.discountAmount > 0 ? Number(txn.subtotal ?? txn.finalTotal) : undefined,
    discount: Number(txn.discountAmount ?? 0),
    finalTotal: Number(txn.finalTotal ?? 0),
    amountPaid: Number(txn.amountPaid ?? 0),
    balanceDue: Number(txn.balanceDue ?? 0),
    notes: txn.notes,
  };
}
