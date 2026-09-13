import { useState } from "react";
import { Button, Modal, Select, DatePicker, LoadingState, ErrorState, Pagination } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatCurrency } from "@/utils/currency";
import { useAppData } from "@/context/AppContext";

// Filter Toolbar for Printed Sales
function FilterToolbar({ filters, onChange, onClear, hasActiveFilters, customers, printedItems }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 p-3.5 sm:p-4 bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] rounded-xl">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-app-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mr-1 hidden sm:block">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>

      {/* Customer Filter */}
      <Select
        value={filters.customerId}
        onChange={e => onChange("customerId", e.target.value)}
        options={[{ value: "", label: "All Customers" }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
        placeholder=""
        className="flex-1 min-w-[130px]"
        selectClassName="h-9 text-xs"
      />

      {/* Payment Status Filter */}
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

      {/* Printed Item Filter */}
      <Select
        value={filters.printedItemId}
        onChange={e => onChange("printedItemId", e.target.value)}
        options={[{ value: "", label: "All Printed Items" }, ...printedItems.map(item => ({ value: item.id, label: item.name }))]}
        placeholder=""
        className="flex-1 min-w-[130px]"
        selectClassName="h-9 text-xs"
      />

      {/* Date Range Filter */}
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

// Main Component
export default function PrintedSalesHistory() {
  const {
    printedSales = [],
    customers = [],
    printedItems = [],
    deletePrintedSale,
    isLoading,
    error,
    refreshData,
  } = useAppData();

  const [filters, setFilters] = useState({
    customerId: "",
    paymentStatus: "",
    printedItemId: "",
    dateFrom: "",
    dateTo: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ customerId: "", paymentStatus: "", printedItemId: "", dateFrom: "", dateTo: "" });
    setCurrentPage(1);
  };

  // Filter and process printed sales
  const filteredSales = printedSales
    .filter(sale => {
      if (filters.customerId && sale.customer_id !== filters.customerId) return false;

      const balDue = sale.balance_due ?? 0;
      if (filters.paymentStatus === "paid" && balDue > 0) return false;
      if (filters.paymentStatus === "unpaid" && balDue === 0) return false;

      if (filters.printedItemId && sale.printed_item_id !== filters.printedItemId) return false;

      if (filters.dateFrom && new Date(sale.sale_date) < new Date(filters.dateFrom + "T00:00:00Z")) return false;
      if (filters.dateTo && new Date(sale.sale_date) > new Date(filters.dateTo + "T23:59:59Z")) return false;

      return true;
    })
    .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
    .map(sale => {
      const cust = customers.find(c => c.id === sale.customer_id) || sale.customers;
      const item = printedItems.find(p => p.id === sale.printed_item_id) || sale.printed_items;

      const lineTotal = Number(sale.line_total ?? 0);
      const lineProfit = Number(sale.line_profit ?? 0);
      const marginPct = lineTotal > 0 ? ((lineProfit / lineTotal) * 100).toFixed(0) : 0;

      return {
        ...sale,
        customerName: cust?.name ?? "Guest Customer",
        itemName: item?.name ?? "Unknown Item",
        itemUnit: item?.unit ?? "piece",
        marginPct,
      };
    });

  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Footer / Summary Totals
  const footerTotal = filteredSales.reduce((s, r) => s + Number(r.line_total ?? 0), 0);
  const footerPaid = filteredSales.reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
  const footerBalance = filteredSales.reduce((s, r) => s + Number(r.balance_due ?? 0), 0);
  const footerProfit = filteredSales.reduce((s, r) => s + Number(r.line_profit ?? 0), 0);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    const res = await deletePrintedSale(deleteTarget.id);
    setIsDeleting(false);
    if (res && !res.success) {
      setDeleteError(res.error || "Failed to delete printed sale.");
    } else {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Printed Sales History" subtitle="View past sales, payment statuses, and profit metrics for printed products.">
        <LoadingState message="Loading printed sales history..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Printed Sales History" subtitle="View past sales, payment statuses, and profit metrics for printed products.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Printed Sales History"
      subtitle="View past sales, payment statuses, and profit metrics for printed products."
    >
      <div className="flex flex-col gap-6">
        {/* Filter Toolbar */}
        <FilterToolbar
          filters={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          customers={customers}
          printedItems={printedItems}
        />

        {/* Sales Table Container */}
        <div className="bg-[var(--color-app-bg)] rounded-xl border border-[var(--color-app-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-app-border)] bg-[var(--color-app-panel)] text-xs uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Printed Item</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Sale Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Balance Due</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-app-border)] text-[var(--color-app-text)]">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center border border-[var(--color-app-border)] text-[var(--color-app-text-muted)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-[var(--color-app-text)]">No printed sales match your filters</p>
                        <p className="text-xs text-[var(--color-app-text-muted)] max-w-xs">
                          Try adjusting the customer, payment status, printed item, or date range — or clear all filters to see the full history.
                        </p>
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="mt-2 text-xs font-semibold text-[var(--color-app-accent)] hover:opacity-70 transition-opacity">
                            Clear all filters →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => {
                    const due = Number(sale.balance_due ?? 0);
                    return (
                      <tr key={sale.id} className="hover:bg-[var(--color-app-panel)] transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-[var(--color-app-text-muted)]">
                          {new Date(sale.sale_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-[var(--color-app-text)]">
                          {sale.customerName}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[var(--color-app-text)]">
                          {sale.itemName}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[var(--color-app-text)]">
                          {sale.quantity} <span className="text-xs text-[var(--color-app-text-muted)]">{sale.itemUnit}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[var(--color-app-text-muted)]">
                          {formatCurrency(sale.sale_price)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-[var(--color-app-text)]">
                          {formatCurrency(sale.line_total)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-[var(--color-app-text-muted)]">
                          {formatCurrency(sale.amount_paid ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono">
                          {due > 0 ? (
                            <span className="font-bold text-[var(--color-app-warning)] px-2 py-0.5 rounded bg-[var(--color-app-warning)]/10 text-xs">
                              {formatCurrency(due)}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-[var(--color-app-success)]">Paid</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(sale.line_profit)}</span>
                            <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded-full leading-tight">
                              {sale.marginPct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => { setDeleteError(""); setDeleteTarget(sale); }}
                            className="text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-error)] transition-colors p-1 rounded"
                            aria-label="Delete printed sale"
                            title="Delete printed sale"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Summary Footer */}
              {filteredSales.length > 0 && (
                <tfoot className="border-t-2 border-[var(--color-app-border)] bg-[var(--color-app-panel)] font-bold text-xs">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-[var(--color-app-text-muted)] uppercase tracking-wider">
                      Total ({filteredSales.length} {filteredSales.length === 1 ? "sale" : "sales"})
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-app-text)]">
                      {formatCurrency(footerTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-app-text-muted)]">
                      {formatCurrency(footerPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {footerBalance > 0 ? (
                        <span className="text-[var(--color-app-warning)]">{formatCurrency(footerBalance)}</span>
                      ) : (
                        <span className="text-[var(--color-app-success)]">0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-app-success)]">
                      +{formatCurrency(footerProfit)}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {filteredSales.length > 0 && (
            <div className="p-3 border-t border-[var(--color-app-border)]">
              <Pagination
                currentPage={currentPage}
                totalCount={filteredSales.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Printed Sale"
      >
        <div className="flex flex-col gap-5">
          {deleteError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-[var(--color-app-text-muted)]">
            Are you sure you want to delete this printed sale of <strong className="text-[var(--color-app-text)]">{deleteTarget?.itemName}</strong> ({deleteTarget?.quantity} {deleteTarget?.itemUnit}) to <strong className="text-[var(--color-app-text)]">{deleteTarget?.customerName}</strong>?
          </p>
          <p className="text-xs text-[var(--color-app-text-muted)] bg-[var(--color-app-elevated)] p-3 rounded-lg border border-[var(--color-app-border)]">
            Deleting this sale will automatically restore <strong className="text-[var(--color-app-text)] font-mono">{deleteTarget?.quantity} {deleteTarget?.itemUnit}</strong> back to your stock batch inventory in FIFO order.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleDeleteConfirm}>
              Delete Printed Sale
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
