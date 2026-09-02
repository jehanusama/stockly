import { useState } from "react";
import { Button, Modal, Select, DatePicker, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatCurrency } from "@/utils/currency";
import { useAppData } from "@/context/AppContext";

//  Filter Toolbar 
function FilterToolbar({ filters, onChange, onClear, hasActiveFilters, customers, products, categories }) {

  return (
    <div className="flex flex-wrap items-center gap-2.5 p-3.5 sm:p-4 bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] rounded-xl">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-app-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mr-1 hidden sm:block">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>

      <Select
        value={filters.customerId}
        onChange={e => onChange("customerId", e.target.value)}
        options={[{ value: "", label: "All Customers" }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
        placeholder=""
        className="flex-1 min-w-[130px]"
        selectClassName="h-9 text-xs"
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

//  Main Component 
export default function SalesHistory() {
  const { orders, customers: mockCustomers, products: mockProducts, categories, deleteOrder, isLoading, error, refreshData } = useAppData();
  const [filters, setFilters] = useState({ customerId: "", productId: "", categoryId: "", dateFrom: "", dateTo: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ customerId: "", productId: "", categoryId: "", dateFrom: "", dateTo: "" });

  // Process and filter orders
  const tableRows = orders
    .filter(order => {
      if (filters.customerId && order.customer_id !== filters.customerId) return false;
      
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
    .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
    .map(order => {
      const customer = mockCustomers.find(c => c.id === order.customer_id);
      
      let itemsSummary = "—";
      if (order.items.length > 0) {
        const firstProduct = mockProducts.find(p => p.id === order.items[0].product_id);
        itemsSummary = firstProduct?.name ?? "Unknown";
        if (order.items.length > 1) {
          itemsSummary += ` (+${order.items.length - 1} more)`;
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

  // Totals for the footer
  const footerRevenue = tableRows.reduce((s, r) => s + r.final_total, 0);
  const footerProfit = tableRows.reduce((s, r) => s + r.final_profit, 0);

  const columns = [
    {
      key: "order_date",
      label: "Date",
      render: (val) => (
        <span className="font-mono text-xs text-[var(--color-app-text-muted)]">
          {new Date(val).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
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
      key: "discountAmount",
      label: "Discount",
      align: "right",
      render: (_, row) => {
        const discountAmount = row.discount_type === "none" ? 0 : row.subtotal - row.final_total;
        return discountAmount > 0 ? (
          <span className="font-mono text-[var(--color-app-warning)]">-{formatCurrency(discountAmount)}</span>
        ) : (
          <span className="text-[var(--color-app-text-muted)]">—</span>
        );
      },
    },
    {
      key: "final_total",
      label: "Total",
      align: "right",
      render: (val) => <span className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(val)}</span>,
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
          onClick={() => setDeleteTarget(row)}
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
          <p className="text-xs text-[var(--color-app-text-muted)] max-w-xs">Try adjusting the customer, product, or date range — or clear all filters to see the full history.</p>
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
          <div className="flex items-center gap-6 px-4 py-3 bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl text-xs">
            <span className="text-[var(--color-app-text-muted)]">
              Showing <span className="font-semibold text-[var(--color-app-text)]">{tableRows.length}</span> transactions
            </span>
            <span className="ml-auto text-[var(--color-app-text-muted)]">
              Revenue: <span className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(footerRevenue)}</span>
            </span>
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
                tableRows.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    className="border-b border-[var(--color-app-border)] last:border-0 bg-[var(--color-app-panel)] hover:bg-[var(--color-app-panel-hover)] transition-colors duration-100"
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
            tableRows.map((row, idx) => (
              <div key={row.id ?? idx} className="bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl p-4 flex flex-col gap-2.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-[var(--color-app-text)]">{row.customerName}</span>
                    <span className="text-xs text-[var(--color-app-text-subtle)] font-mono">
                      {new Date(row.order_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[var(--color-app-text)]">{formatCurrency(row.final_total)}</span>
                    <button
                      onClick={() => setDeleteTarget(row)}
                      className="text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-error)] p-1.5 rounded"
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
            ))
          )}
        </div>

      </div>

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
                Deleting this sale will permanently remove the record for <strong className="text-[var(--color-app-text)]">{deleteTarget.productName}</strong> sold to <strong className="text-[var(--color-app-text)]">{deleteTarget.customerName}</strong>.
              </p>
            </div>
            <p className="text-sm text-[var(--color-app-text-muted)]">
              Restoring stock for <strong className="text-[var(--color-app-text)]">{deleteTarget.quantity} unit{deleteTarget.quantity !== 1 ? "s" : ""}</strong> of <strong className="text-[var(--color-app-text)]">{deleteTarget.productName}</strong> to inventory.
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

