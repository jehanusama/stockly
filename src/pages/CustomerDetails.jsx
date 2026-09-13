import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, LoadingState, ErrorState, Modal, Input, Pagination } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0][0] || "?").toUpperCase();
}

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    customers: mockCustomers = [],
    orders: mockOrders = [],
    printedSales = [],
    printedItems = [],
    products: mockProducts = [],
    getCustomerTotalBalance,
    isLoading,
    error,
    refreshData,
    recordCustomerPayment,
  } = useAppData();

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const customer = useMemo(() => mockCustomers.find(c => c.id === id), [mockCustomers, id]);

  // Build unified transaction ledger combining Bags orders and Printed sales
  const allTransactions = useMemo(() => {
    const bagTxns = (mockOrders || [])
      .filter(o => o.customer_id === id)
      .map(o => ({
        id: o.id,
        lineType: "Bags",
        date: o.order_date,
        itemsCount: (o.items || []).length,
        itemsSummary: (o.items || []).length > 0
          ? `${o.items.length} product type${o.items.length !== 1 ? 's' : ''}`
          : (o.notes || "Manual Balance Entry"),
        subtotal: o.subtotal ?? 0,
        discountAmount: o.discount_type !== "none" ? (o.subtotal - o.final_total) : 0,
        finalTotal: o.final_total ?? 0,
        amountPaid: o.amount_paid ?? 0,
        balanceDue: o.balance_due ?? 0,
        profit: o.final_profit ?? 0,
        items: (o.items || []).map((item, idx) => {
          const p = mockProducts.find(prod => prod.id === item.product_id);
          return {
            id: item.id || `${item.product_id}-${idx}`,
            name: p?.name ?? "Unknown product",
            quantity: item.quantity,
            unit: p?.unit ?? "kilo",
            price: item.sale_price,
            lineTotal: item.line_total,
          };
        }),
        notes: o.notes,
      }));

    const printedTxns = (printedSales || [])
      .filter(s => s.customer_id === id)
      .map(s => {
        const item = printedItems.find(p => p.id === s.printed_item_id) || s.printed_items;
        const itemName = item?.name ?? "Printed Item";
        const itemUnit = item?.unit ?? "piece";
        return {
          id: s.id,
          lineType: "Printed",
          date: s.sale_date,
          itemsCount: 1,
          itemsSummary: itemName,
          subtotal: Number(s.line_total ?? 0),
          discountAmount: 0,
          finalTotal: Number(s.line_total ?? 0),
          amountPaid: Number(s.amount_paid ?? 0),
          balanceDue: Number(s.balance_due ?? 0),
          profit: Number(s.line_profit ?? 0),
          items: [{
            id: s.id,
            name: itemName,
            quantity: Number(s.quantity ?? 0),
            unit: itemUnit,
            price: Number(s.sale_price ?? 0),
            lineTotal: Number(s.line_total ?? 0),
          }],
          notes: s.notes,
        };
      });

    return [...bagTxns, ...printedTxns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mockOrders, printedSales, id, mockProducts, printedItems]);

  // Aggregate metrics across unified transactions
  const totalOrders = allTransactions.length;
  const lifetimeSpend = allTransactions.reduce((sum, t) => sum + t.finalTotal, 0);
  const totalProfit = allTransactions.reduce((sum, t) => sum + t.profit, 0);
  const totalOutstandingBalance = useMemo(() => {
    return getCustomerTotalBalance ? getCustomerTotalBalance(id) : allTransactions.reduce((sum, t) => sum + (t.balanceDue ?? 0), 0);
  }, [getCustomerTotalBalance, id, allTransactions]);

  // Unpaid transactions sorted oldest first for FIFO allocation preview
  const oldestUnpaidTransactions = useMemo(() => {
    return [...allTransactions]
      .filter(t => (t.balanceDue ?? 0) > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allTransactions]);

  // Live FIFO Allocation Preview computation
  const allocationPreview = useMemo(() => {
    const val = parseFloat(paymentAmount);
    if (isNaN(val) || val <= 0) return [];

    let remaining = val;
    const allocations = [];

    for (const txn of oldestUnpaidTransactions) {
      if (remaining <= 0) break;
      const allocated = Math.min(txn.balanceDue, remaining);
      remaining -= allocated;
      const newBal = txn.balanceDue - allocated;
      allocations.push({
        txn,
        allocated,
        previousBalance: txn.balanceDue,
        newBalance: newBal,
        isFullyPaid: newBal === 0,
      });
    }

    return allocations;
  }, [paymentAmount, oldestUnpaidTransactions]);

  const handleOpenPaymentModal = () => {
    setPaymentAmount(totalOutstandingBalance > 0 ? String(totalOutstandingBalance) : "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setModalError("");
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError("Please enter a valid payment amount greater than 0.");
      return;
    }

    if (amountNum > totalOutstandingBalance + 0.001) {
      setModalError(`Payment amount cannot exceed customer's total balance of ${formatCurrency(totalOutstandingBalance)}.`);
      return;
    }

    setIsSubmitting(true);
    const result = await recordCustomerPayment(customer.id, amountNum, paymentDate, paymentNotes);
    setIsSubmitting(false);

    if (result.success) {
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
    } else {
      setModalError(result.error || "Failed to record payment.");
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Customer Profile">
        <LoadingState message="Loading customer details..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Customer Profile">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  if (!customer) {
    return (
      <PageContainer title="Customer Not Found" actions={<Button variant="secondary" onClick={() => navigate('/customers')}>Back to Customers</Button>}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h3 className="text-lg font-medium text-[var(--color-app-text)] mb-2">Error 404</h3>
          <p className="text-sm text-[var(--color-app-text-muted)] mb-6">The customer you are looking for does not exist.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/customers')}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-[var(--color-app-panel-hover)] text-[var(--color-app-text-muted)] transition-colors mr-2"
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          Customer Profile
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {totalOutstandingBalance > 0 && (
            <Button variant="secondary" onClick={handleOpenPaymentModal}>
              💳 Record Payment
            </Button>
          )}
          <Button variant="primary" onClick={() => navigate(`/new-sale?customer_id=${customer.id}`)}>
            + New Sale
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-8 pb-8">
        
        {/* ── Account Header ── */}
        <Card padding="lg" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-8 border-[var(--color-app-border)] bg-[var(--color-app-panel)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-app-accent)] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          {/* Identity */}
          <div className="flex items-start gap-4 sm:gap-5 z-10 w-full sm:w-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white font-semibold text-xl sm:text-2xl shadow-sm shrink-0 mt-1">
              {getInitials(customer.name)}
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-app-text)] tracking-tight leading-none mb-2">{customer.name}</h1>
              <p className="text-[var(--color-app-text-muted)] font-medium flex items-center gap-1.5 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                {customer.phone || "No phone"}
              </p>
              {customer.notes && (
                <p className="text-sm text-[var(--color-app-text-subtle)] mt-1.5 max-w-sm italic">"{customer.notes}"</p>
              )}
            </div>
          </div>

          {/* Combined Relationship Stats */}
          <div className="flex flex-wrap sm:flex-nowrap gap-6 sm:gap-8 sm:pl-8 sm:border-l border-[var(--color-app-border)] z-10 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Total Outstanding Balance</span>
              <span className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${totalOutstandingBalance > 0 ? "text-[var(--color-app-warning)]" : "text-[var(--color-app-success)]"}`}>
                {formatCurrency(totalOutstandingBalance)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Lifetime Spend</span>
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--color-app-text)] tracking-tight">
                {formatCurrency(lifetimeSpend)}
              </span>
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider">Net Profit</span>
                <span className="font-mono text-sm text-[var(--color-app-success)] font-semibold">{formatCurrency(totalProfit)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider">Transactions</span>
                <span className="font-mono text-sm text-[var(--color-app-text)] font-semibold">{totalOrders}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Unified Transaction Ledger ── */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-semibold text-[var(--color-app-text)] tracking-tight">Unified Transaction Ledger</h2>
            <span className="text-xs text-[var(--color-app-text-muted)] font-medium">Bags & Printed Line Transactions</span>
          </div>
          
          {allTransactions.length === 0 ? (
            <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center border-dashed border-[var(--color-app-border)] bg-[var(--color-app-bg)] shadow-none">
              <div className="w-16 h-16 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center mb-4 border border-[var(--color-app-border)] shadow-sm text-[var(--color-app-accent)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--color-app-text)] mb-2">No purchases yet</h3>
              <p className="text-sm text-[var(--color-app-text-muted)] mb-6 max-w-sm">
                This customer's ledger is completely empty. Ready to record their first transaction?
              </p>
              <Button variant="primary" onClick={() => navigate(`/new-sale?customer_id=${customer.id}`)}>Record First Sale</Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {(() => {
                const maxP = Math.max(1, Math.ceil(allTransactions.length / pageSize));
                const safeP = Math.min(currentPage, maxP);
                return allTransactions.slice((safeP - 1) * pageSize, safeP * pageSize);
              })().map((txn) => {
                const margin = txn.finalTotal > 0 ? ((txn.profit / txn.finalTotal) * 100).toFixed(0) : 0;
                const balDue = Number(txn.balanceDue ?? 0);
                const isPaid = balDue < 0.01;
                const isPartial = balDue >= 0.01 && balDue < txn.finalTotal;

                return (
                  <Card key={txn.id} padding="none" className="overflow-hidden bg-[var(--color-app-panel)] border-[var(--color-app-border)] hover:bg-[var(--color-app-panel-hover)] transition-colors shadow-sm">

                    {/* Transaction Header — Date, Line Badge, Status & Totals */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3 border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-[var(--color-app-bg)] border border-[var(--color-app-border)] rounded-xl shrink-0">
                          <span className="text-[9px] uppercase font-bold text-[var(--color-app-text-muted)] tracking-wider leading-none mb-0.5">
                            {new Date(txn.date).toLocaleString('default', { month: 'short' })}
                          </span>
                          <span className="text-base font-mono font-bold text-[var(--color-app-text)] leading-none">
                            {new Date(txn.date).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider truncate">
                              Ref #{txn.id}
                            </span>

                            {/* Product Line Badge */}
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                              txn.lineType === "Bags" 
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30" 
                                : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                            }`}>
                              {txn.lineType}
                            </span>

                            {/* Payment Status Badge */}
                            {isPaid ? (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--color-app-success)]/15 text-[var(--color-app-success)] rounded-full">
                                Fully Paid
                              </span>
                            ) : isPartial ? (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/15 text-sky-400 rounded-full">
                                Bal: {formatCurrency(balDue)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--color-app-warning)]/15 text-[var(--color-app-warning)] rounded-full">
                                Unpaid ({formatCurrency(balDue)})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-app-text-subtle)] mt-0.5 truncate">
                            {txn.itemsSummary}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 border-t sm:border-t-0 sm:border-l border-[var(--color-app-border)] pt-2 sm:pt-0 sm:pl-4">
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[10px] font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider mb-0.5">Total</span>
                          <span className="font-mono font-bold text-sm sm:text-base text-[var(--color-app-text)]">{formatCurrency(txn.finalTotal)}</span>
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[10px] font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider mb-0.5">Paid</span>
                          <span className="font-mono font-semibold text-xs sm:text-sm text-[var(--color-app-text-muted)]">{formatCurrency(txn.amountPaid)}</span>
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[10px] font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider mb-0.5">Due</span>
                          <span className={`font-mono font-semibold text-xs sm:text-sm ${balDue > 0 ? "text-[var(--color-app-warning)] font-bold" : "text-[var(--color-app-success)]"}`}>
                            {formatCurrency(balDue)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end min-w-[60px]">
                          <span className="text-[10px] font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider mb-0.5">Profit</span>
                          <span className="font-mono text-xs sm:text-sm text-[var(--color-app-success)] font-semibold">+{formatCurrency(txn.profit)}</span>
                          <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded mt-0.5">{margin}% mgn</span>
                        </div>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="flex flex-col divide-y divide-[var(--color-app-border)]">
                      {(txn.items || []).length === 0 ? (
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-app-accent)] shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-[var(--color-app-text)]">{txn.notes || "Manual Balance Entry"}</span>
                              <span className="block text-xs text-[var(--color-app-text-subtle)]">Manual Entry</span>
                            </div>
                          </div>
                          <span className="font-mono text-sm font-semibold text-[var(--color-app-text)] shrink-0">{formatCurrency(txn.finalTotal)}</span>
                        </div>
                      ) : (
                        txn.items.map((item, idx) => (
                          <div key={item.id || idx} className="flex items-center justify-between gap-4 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${txn.lineType === "Bags" ? "bg-blue-400" : "bg-purple-400"}`} />
                              <div>
                                <span className="text-sm font-medium text-[var(--color-app-text)]">{item.name}</span>
                                <span className="block text-xs font-mono text-[var(--color-app-text-muted)]">
                                  {item.quantity} {item.unit} × {formatCurrency(item.price)}
                                </span>
                              </div>
                            </div>
                            <span className="font-mono text-sm font-semibold text-[var(--color-app-text)] shrink-0">{formatCurrency(item.lineTotal)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                );
              })}

              <div className="pt-2">
                <Pagination
                  currentPage={currentPage}
                  totalCount={allTransactions.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment — ${customer.name}`}
      >
        <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col gap-6">
          {modalError && (
            <div className="px-4 py-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm font-medium border border-[var(--color-app-danger)]">
              {modalError}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">Total Outstanding Balance</span>
            <span className="text-xl font-mono font-bold text-[var(--color-app-warning)]">
              {formatCurrency(totalOutstandingBalance)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Payment Amount (EGP)"
              type="number"
              min="0.01"
              step="0.01"
              max={totalOutstandingBalance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />

            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Notes (Optional)"
            type="text"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="e.g. Bank Transfer, Cash receipt #"
          />

          {/* Live FIFO Allocation Preview */}
          {allocationPreview.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">
                  FIFO Payment Allocation Preview
                </span>
                <span className="text-[11px] text-[var(--color-app-text-subtle)]">Oldest unpaid items first</span>
              </div>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {allocationPreview.map(({ txn, allocated, newBalance, isFullyPaid }) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] text-xs">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--color-app-text)]">{new Date(txn.date).toLocaleDateString()}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${txn.lineType === "Bags" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>{txn.lineType}</span>
                      </div>
                      <span className="text-[var(--color-app-text-muted)] font-mono">Previous due: {formatCurrency(txn.balanceDue)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(allocated)}</span>
                      <span className={`font-mono text-[11px] ${isFullyPaid ? "text-[var(--color-app-success)] font-semibold" : "text-[var(--color-app-warning)]"}`}>
                        {isFullyPaid ? "✓ Fully settled" : `Remaining: ${formatCurrency(newBalance)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              Confirm & Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
