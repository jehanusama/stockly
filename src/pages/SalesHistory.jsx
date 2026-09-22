import { useState } from "react";
import { Button, Modal, Select, DatePicker, LoadingState, ErrorState, Pagination, CustomerSelect } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatCurrency } from "@/utils/currency";
import { useAppData } from "@/context/AppContext";

// Filter Toolbar 
function FilterToolbar({ filters, onChange, onClear, hasActiveFilters, customers, products, categories }) {

  return (
    <div className="flex flex-wrap items-center gap-2.5 p-3.5 sm:p-4 bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] rounded-xl">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-app-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mr-1 hidden sm:block">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>

      <CustomerSelect
        label=""
        value={filters.customerId}
        onChange={val => onChange("customerId", val)}
        customers={customers}
        placeholder="All Customers"
        className="flex-1 min-w-[150px]"
      />

      {/* Payment Status filter */}
      <Select
        value={filters.paymentStatus}
        onChange={e => onChange("paymentStatus", e.target.value)}
        options={[
          { value: "", label: "All Payment Statuses" },
          { value: "paid", label: "Fully Paid" },
          { value: "unpaid", label: "Has Balance Due" },
        ]}
        placeholder=""
        className="flex-1 min-w-[130px]"
        selectClassName="h-9 text-xs font-semibold"
      />

      {/* Product filter — grouped by category */}
      <div className="relative flex-1 min-w-[130px]">
        <select
          value={filters.productId}
          onChange={e => onChange("productId", e.target.value)}
          className="w-full h-9 pl-3 pr-9 rounded-lg text-xs appearance-none bg-[var(--color-app-bg)] text-[var(--color-app-text)] border border-[var(--color-app-border)] focus:ring-2 focus:ring-[var(--color-app-border-focus)] outline-none transition-colors cursor-pointer"
        >
          <option value="">All Products</option>
          {categories.map(cat => {
            const catProducts = products.filter(p => p.category_id === cat.id);
            if (catProducts.length === 0) return null;
            return (
              <optgroup key={cat.id} label={cat.name} className="bg-[#1f2937]">
                {catProducts.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#1f2937] text-[#f3f4f6]">{p.name}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--color-app-text-muted)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </div>

      {/* Category filter */}
      <Select
        value={filters.categoryId}
        onChange={e => onChange("categoryId", e.target.value)}
        options={[{ value: "", label: "All Categories" }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
        placeholder=""
        className="flex-1 min-w-[130px]"
        selectClassName="h-9 text-xs"
      />

      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <DatePicker
          value={filters.dateFrom}
          onChange={(iso) => onChange("dateFrom", iso)}
          placeholder="From date"
          maxDate={filters.dateTo || undefined}
          className="flex-1 sm:flex-initial"
        />
        <span className="text-[var(--color-app-text-muted)] text-xs font-semibold">to</span>
        <DatePicker
          value={filters.dateTo}
          onChange={(iso) => onChange("dateTo", iso)}
          placeholder="To date"
          minDate={filters.dateFrom || undefined}
          className="flex-1 sm:flex-initial"
        />
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-[var(--color-app-accent)] hover:opacity-70 transition-opacity py-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Clear filters
        </button>
      )}
    </div>
  );
}

// Sale Detail Modal
function SaleDetailModal({ row, products, categories, onClose, onDelete }) {
  if (!row) return null;
  const d = new Date(row.order_date);
  const due = row.balance_due ?? 0;
  const items = row.items || [];

  return (
    <Modal isOpen={!!row} onClose={onClose} title="Sale Details">
      <div className="flex flex-col gap-5">
        {/* Header info cards */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px] bg-[var(--color-app-elevated)] rounded-xl p-3 flex flex-col gap-0.5 border border-[var(--color-app-border)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-app-text-muted)]">Customer</span>
            <span className="font-semibold text-sm text-[var(--color-app-text)]">{row.customerName}</span>
          </div>
          <div className="flex-1 min-w-[140px] bg-[var(--color-app-elevated)] rounded-xl p-3 flex flex-col gap-0.5 border border-[var(--color-app-border)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-app-text-muted)]">Date &amp; Time</span>
            <span className="font-mono text-sm text-[var(--color-app-text)]">
              {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="font-mono text-xs text-[var(--color-app-text-subtle)]">
              {d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex-1 min-w-[140px] bg-[var(--color-app-elevated)] rounded-xl p-3 flex flex-col gap-0.5 border border-[var(--color-app-border)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-app-text-muted)]">Status</span>
            {due > 0 ? (
              <>
                <span className="text-sm font-bold text-[var(--color-app-warning)]">Balance Due</span>
                <span className="font-mono text-xs text-[var(--color-app-warning)]">{formatCurrency(due)} remaining</span>
              </>
            ) : (
              <span className="text-sm font-bold text-[var(--color-app-success)]">Fully Paid ✓</span>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-app-text-muted)] mb-2">Items Sold</p>
          <div className="rounded-xl border border-[var(--color-app-border)] overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--color-app-elevated)] border-b border-[var(--color-app-border)]">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide">Product</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide">Category</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide">Qty</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide">Unit Price</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-xs text-[var(--color-app-text-muted)]">No items found</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const product = products.find(p => p.id === item.product_id);
                    const category = categories?.find(c => c.id === product?.category_id);
                    const subtotal = (item.sale_price ?? 0) * (item.quantity ?? 0);
                    return (
                      <tr key={idx} className="border-b border-[var(--color-app-border)] last:border-0 bg-[var(--color-app-panel)]">
                        <td className="px-3 py-2.5 font-medium text-[var(--color-app-text)]">
                          {product?.name ?? "Unknown"}
                          {product?.unit && <span className="ml-1 text-[10px] text-[var(--color-app-text-muted)] font-normal">({product.unit})</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[var(--color-app-text-muted)]">
                          {category?.name ? (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] font-medium text-[var(--color-app-text-muted)]">
                              {category.name}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[var(--color-app-text)]">{item.quantity ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-[var(--color-app-text-muted)]">{formatCurrency(item.sale_price ?? 0)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(subtotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-[var(--color-app-elevated)] rounded-xl border border-[var(--color-app-border)] p-4 flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-app-text-muted)] mb-1">Payment Summary</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--color-app-text-muted)]">Order Total</span>
            <span className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(row.final_total)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--color-app-text-muted)]">Amount Paid</span>
            <span className="font-mono text-[var(--color-app-text-muted)]">{formatCurrency(row.amount_paid ?? 0)}</span>
          </div>
          {due > 0 && (
            <div className="flex justify-between items-center text-sm border-t border-[var(--color-app-border)] pt-2">
              <span className="font-semibold text-[var(--color-app-warning)]">Balance Due</span>
              <span className="font-mono font-bold text-[var(--color-app-warning)]">{formatCurrency(due)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm border-t border-[var(--color-app-border)] pt-2">
            <span className="font-semibold text-[var(--color-app-success)]">Profit</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(row.final_profit)}</span>
              <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 py-0.5 rounded-full">
                {row.marginPct}%
              </span>
            </div>
          </div>
        </div>

        {row.notes && (
          <div className="bg-[var(--color-app-elevated)] rounded-xl border border-[var(--color-app-border)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-app-text-muted)] mb-1">Notes</p>
            <p className="text-sm text-[var(--color-app-text)]">{row.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-[var(--color-app-border)]">
          <button
            onClick={() => {
              onClose();
              onDelete(row);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-app-error)] hover:opacity-70 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete this sale
          </button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// Main Component 
export default function SalesHistory() {
  const { orders, customers: mockCustomers, products: mockProducts, categories, deleteOrder, isLoading, error, refreshData } = useAppData();
  const [filters, setFilters] = useState({ customerId: "", paymentStatus: "", productId: "", categoryId: "", dateFrom: "", dateTo: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailRow, setDetailRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setFilters({ customerId: "", paymentStatus: "", productId: "", categoryId: "", dateFrom: "", dateTo: "" });
    setCurrentPage(1);
  };

  // Process and filter orders
  const tableRows = orders
    .filter(order => {
      if (filters.customerId && order.customer_id !== filters.customerId) return false;
      
      const balDue = order.balance_due ?? 0;
      if (filters.paymentStatus === "paid" && balDue > 0) return false;
      if (filters.paymentStatus === "unpaid" && balDue === 0) return false;

      if (filters.productId) {
        const hasProduct = order.items.some(item => item.product_id === filters.productId);
        if (!hasProduct) return false;
      }

      if (filters.categoryId) {
        const hasCategoryProduct = order.items.some(item => {
          const p = mockProducts.find(p => p.id === item.product_id);
          return p?.category_id === filters.categoryId;
        });
        if (!hasCategoryProduct) return false;
      }
      
      if (filters.dateFrom && new Date(order.order_date) < new Date(filters.dateFrom + "T00:00:00Z")) return false;
      if (filters.dateTo && new Date(order.order_date) > new Date(filters.dateTo + "T23:59:59Z")) return false;
      return true;
    })
    .sort((a, b) => {
      const dateDiff = new Date(b.order_date) - new Date(a.order_date);
      if (dateDiff !== 0) return dateDiff;
      // Secondary sort: most recently created first
      return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
    })
    .map(order => {
      const customer = mockCustomers.find(c => c.id === order.customer_id);
      
      let itemsSummary = order.notes || "—";
      const items = order.items || [];
      if (items.length > 0) {
        const firstProduct = mockProducts.find(p => p.id === items[0].product_id);
        itemsSummary = firstProduct?.name ?? "Unknown";
        if (items.length > 1) {
          itemsSummary += ` (+${items.length - 1} more)`;
        }
      }

      const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const marginPct = order.final_total > 0 ? ((order.final_profit / order.final_total) * 100).toFixed(0) : 0;
      
      return { 
        ...order, 
        customerName: customer?.name ?? "—", 
        itemsSummary,
        totalItemsCount,
        marginPct 
      };
    });

  const paginatedTableRows = tableRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Totals for the footer
  const footerRevenue = tableRows.reduce((s, r) => s + r.final_total, 0);
  const footerPaid = tableRows.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
  const footerBalance = tableRows.reduce((s, r) => s + (r.balance_due ?? 0), 0);
  const footerProfit = tableRows.reduce((s, r) => s + r.final_profit, 0);

  const columns = [
    {
      key: "order_date",
      label: "Date",
      render: (val) => {
        const d = new Date(val);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-[var(--color-app-text-muted)]">
              {d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="font-mono text-[10px] text-[var(--color-app-text-subtle)]">
              {d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      key: "customerName",
      label: "Customer",
      render: (val) => <span className="font-medium text-[var(--color-app-text)]">{val}</span>,
    },
    {
      key: "itemsSummary",
      label: "Items",
      render: (val) => <span className="text-[var(--color-app-text-subtle)]">{val}</span>,
    },
    {
      key: "totalItemsCount",
      label: "Total Qty",
      align: "right",
      render: (val) => <span className="font-mono text-[var(--color-app-text)]">{val}</span>,
    },
    {
      key: "final_total",
      label: "Total",
      align: "right",
      render: (val) => <span className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(val)}</span>,
    },
    {
      key: "amount_paid",
      label: "Paid",
      align: "right",
      render: (val) => <span className="font-mono text-[var(--color-app-text-muted)]">{formatCurrency(val ?? 0)}</span>,
    },
    {
      key: "balance_due",
      label: "Balance Due",
      align: "right",
      render: (val) => {
        const due = val ?? 0;
        return due > 0 ? (
          <span className="font-mono font-bold text-[var(--color-app-warning)] px-2 py-0.5 rounded bg-[var(--color-app-warning)]/10">
            {formatCurrency(due)}
          </span>
        ) : (
          <span className="text-xs font-semibold text-[var(--color-app-success)]">Paid</span>
        );
      },
    },
    {
      key: "final_profit",
      label: "Profit",
      align: "right",
      render: (val, row) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(val)}</span>
          <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded-full leading-tight">
            {row.marginPct}%
          </span>
        </div>
      ),
    },
    {
      key: "id",
      label: "",
      align: "right",
      render: (_val, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(row);
          }}
          className="text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-error)] transition-colors p-1 rounded"
          aria-label="Delete sale"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      ),
    },
  ];

  const emptyStateNode = (
    <tr>
      <td colSpan={columns.length} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center border border-[var(--color-app-border)] text-[var(--color-app-text-muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-app-text)]">No sales match your filters</p>
          <p className="text-xs text-[var(--color-app-text-muted)] max-w-xs">Try adjusting the customer, payment status, product, or date range — or clear all filters to see the full history.</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-2 text-xs font-semibold text-[var(--color-app-accent)] hover:opacity-70 transition-opacity">
              Clear all filters →
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteOrder(deleteTarget.id);
    setIsDeleting(false);
    if (res && !res.success) {
      setDeleteError(res.error || "Failed to delete sale.");
    } else {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Sales History" subtitle="Full record of all transactions.">
        <LoadingState message="Loading transaction records..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Sales History" subtitle="Full record of all transactions.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Sales History" subtitle="Full record of all transactions.">
      <div className="flex flex-col gap-6 pb-8">

        {/* Filter Toolbar */}
        <FilterToolbar
          filters={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          customers={mockCustomers}
          products={mockProducts}
          categories={categories}
        />

        {/* Summary Footer Strip */}
        {tableRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 py-3 bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl text-xs">
            <span className="text-[var(--color-app-text-muted)]">
              Showing <span className="font-semibold text-[var(--color-app-text)]">{tableRows.length}</span> transactions
            </span>
            <span className="ml-auto text-[var(--color-app-text-muted)]">
              Revenue: <span className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(footerRevenue)}</span>
            </span>
            <span className="text-[var(--color-app-text-muted)]">
              Paid: <span className="font-mono font-semibold text-[var(--color-app-text-muted)]">{formatCurrency(footerPaid)}</span>
            </span>
            {footerBalance > 0 && (
              <span className="text-[var(--color-app-warning)]">
                Due: <span className="font-mono font-bold text-[var(--color-app-warning)]">{formatCurrency(footerBalance)}</span>
              </span>
            )}
            <span className="text-[var(--color-app-text-muted)]">
              Profit: <span className="font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(footerProfit)}</span>
            </span>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-[var(--color-app-border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)]">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={[
                      "px-4 py-3 font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide text-xs",
                      col.key === "profit" ? "text-[var(--color-app-success)]/70" : "",
                      col.align === "right" ? "text-right" : "text-left",
                    ].filter(Boolean).join(" ")}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? emptyStateNode : (
                paginatedTableRows.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    onClick={() => setDetailRow(row)}
                    className="border-b border-[var(--color-app-border)] last:border-0 bg-[var(--color-app-panel)] hover:bg-[var(--color-app-panel-hover)] transition-colors duration-100 cursor-pointer"
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={[
                          "px-4 py-3 text-[var(--color-app-text)]",
                          col.key === "profit" ? "bg-[var(--color-app-success)]/[0.03] border-l border-[var(--color-app-success)]/10" : "",
                          col.align === "right" ? "text-right" : "text-left",
                        ].filter(Boolean).join(" ")}
                      >
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="sm:hidden flex flex-col gap-3">
          {tableRows.length === 0 ? (
            <div className="p-8 text-center bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl text-sm text-[var(--color-app-text-muted)]">
              No sales match your filters
            </div>
          ) : (
            paginatedTableRows.map((row, idx) => {
              const due = row.balance_due ?? 0;
              return (
                <div
                  key={row.id ?? idx}
                  onClick={() => setDetailRow(row)}
                  className="bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl p-4 flex flex-col gap-2.5 shadow-sm cursor-pointer hover:border-[var(--color-app-border-focus)] transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-[var(--color-app-text)]">{row.customerName}</span>
                      <span className="text-xs text-[var(--color-app-text-subtle)] font-mono">
                        {new Date(row.order_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        {" "}
                        <span className="text-[10px] text-[var(--color-app-text-subtle)]">
                          {new Date(row.order_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-bold text-sm text-[var(--color-app-text)]">{formatCurrency(row.final_total)}</span>
                        {due > 0 ? (
                          <span className="text-[10px] font-mono font-semibold text-[var(--color-app-warning)]">Due: {formatCurrency(due)}</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[var(--color-app-success)]">Paid</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(row);
                        }}
                        className="text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-error)] p-1.5 rounded ml-1"
                        aria-label="Delete sale"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--color-app-text-muted)] pt-1 border-t border-[var(--color-app-border)] flex justify-between items-center">
                    <span>{row.itemsSummary} ({row.totalItemsCount} items)</span>
                    <span className="font-mono text-[var(--color-app-success)] font-semibold">+{formatCurrency(row.final_profit)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={tableRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
        />

      </div>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        row={detailRow}
        products={mockProducts}
        categories={categories}
        onClose={() => setDetailRow(null)}
        onDelete={(row) => setDeleteTarget(row)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title="Delete Sale Record"
      >
        {deleteTarget && (
          <div className="flex flex-col gap-6">
            {deleteError && (
              <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
                {deleteError}
              </div>
            )}

            <div className="bg-[var(--color-app-error)]/5 border border-[var(--color-app-error)]/20 rounded-xl p-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-[var(--color-app-error)]">This action cannot be undone.</p>
              <p className="text-sm text-[var(--color-app-text-muted)]">
                Deleting this order will permanently remove <strong className="text-[var(--color-app-text)]">{deleteTarget.itemsSummary}</strong> for <strong className="text-[var(--color-app-text)]">{deleteTarget.customerName}</strong>.
              </p>
            </div>
            <p className="text-sm text-[var(--color-app-text-muted)]">
              Stock for all items in this order (<strong className="text-[var(--color-app-text)]">{deleteTarget.totalItemsCount} total unit{deleteTarget.totalItemsCount !== 1 ? "s" : ""}</strong>) will be restored to inventory automatically.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-app-border)]">
              <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(""); }} disabled={isDeleting}>Cancel</Button>
              <Button
                variant="primary"
                className="bg-[var(--color-app-error)] hover:opacity-90"
                onClick={handleDeleteConfirm}
                loading={isDeleting}
              >
                Yes, Delete Sale
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

