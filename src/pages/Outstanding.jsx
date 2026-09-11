import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Select, Input, Modal, LoadingState, ErrorState, Pagination } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

// Helpers
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatAge(dateStr) {
  const days = daysSince(dateStr);
  const d = new Date(dateStr);
  const label = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  return { label, days };
}

function AgeBadge({ dateStr }) {
  const { label, days } = formatAge(dateStr);
  const isEscalated = days >= 30;
  const isCritical = days >= 60;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full",
        isCritical
          ? "bg-[var(--color-app-danger)]/15 text-[var(--color-app-danger)]"
          : isEscalated
          ? "bg-[var(--color-app-warning)]/15 text-[var(--color-app-warning)]"
          : "bg-[var(--color-app-text-muted)]/10 text-[var(--color-app-text-muted)]",
      ].join(" ")}
    >
      {isCritical && (
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14zM11 15h2v2h-2zm0-6h2v4h-2z"/>
        </svg>
      )}
      Owing since {label} · {days}d
    </span>
  );
}

// Main Component
export default function Outstanding() {
  const navigate = useNavigate();
  const { customers, orders, isLoading, error, refreshData, recordCustomerPayment } = useAppData();

  const [sortBy, setSortBy] = useState("balance"); // "balance" | "oldest"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [paymentTarget, setPaymentTarget] = useState(null); // { customer, totalBalance, oldestOrderDate }
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Build the unpaid customer list
  const unpaidCustomers = useMemo(() => {
    const map = {};

    orders.forEach((o) => {
      const due = Number(o.balance_due ?? 0);
      if (due < 0.01 || !o.customer_id) return;

      if (!map[o.customer_id]) {
        map[o.customer_id] = {
          customerId: o.customer_id,
          totalBalance: 0,
          unpaidOrderCount: 0,
          oldestUnpaidDate: o.order_date,
        };
      }
      map[o.customer_id].totalBalance += due;
      map[o.customer_id].unpaidOrderCount += 1;

      const existing = new Date(map[o.customer_id].oldestUnpaidDate);
      const current = new Date(o.order_date);
      if (current < existing) {
        map[o.customer_id].oldestUnpaidDate = o.order_date;
      }
    });

    return Object.values(map)
      .map((entry) => {
        const cust = customers.find((c) => c.id === entry.customerId);
        return {
          ...entry,
          totalBalance: Math.round(entry.totalBalance * 100) / 100,
          name: cust?.name ?? "Unknown Customer",
          phone: cust?.phone ?? "",
        };
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.oldestUnpaidDate) - new Date(b.oldestUnpaidDate);
        }
        return b.totalBalance - a.totalBalance;
      });
  }, [orders, customers, sortBy]);

  const totalOutstanding = useMemo(
    () => unpaidCustomers.reduce((sum, c) => sum + c.totalBalance, 0),
    [unpaidCustomers]
  );

  // FIFO Allocation Preview
  const allocationPreview = useMemo(() => {
    if (!paymentTarget) return [];
    const val = parseFloat(paymentAmount);
    if (isNaN(val) || val <= 0) return [];

    const unpaidOrders = orders
      .filter(
        (o) =>
          o.customer_id === paymentTarget.customerId &&
          (o.balance_due ?? 0) >= 0.01
      )
      .sort((a, b) => new Date(a.order_date) - new Date(b.order_date));

    let remaining = val;
    const result = [];
    for (const order of unpaidOrders) {
      if (remaining <= 0) break;
      const allocated = Math.min(order.balance_due, remaining);
      remaining -= allocated;
      const newBal = order.balance_due - allocated;
      result.push({
        order,
        allocated,
        newBalance: newBal,
        isFullyPaid: newBal < 0.01,
      });
    }
    return result;
  }, [paymentAmount, paymentTarget, orders]);

  const openPaymentModal = (entry) => {
    setPaymentTarget(entry);
    setPaymentAmount(String(entry.totalBalance));
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setModalError("");
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError("Please enter a valid amount greater than 0.");
      return;
    }
    if (amountNum > paymentTarget.totalBalance + 0.001) {
      setModalError(
        `Amount cannot exceed outstanding balance of ${formatCurrency(paymentTarget.totalBalance)}.`
      );
      return;
    }
    setIsSubmitting(true);
    const res = await recordCustomerPayment(
      paymentTarget.customerId,
      amountNum,
      paymentDate,
      paymentNotes
    );
    setIsSubmitting(false);
    if (res.success) {
      setPaymentTarget(null);
    } else {
      setModalError(res.error || "Failed to record payment.");
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Outstanding Payments">
        <LoadingState message="Loading outstanding balances..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Outstanding Payments">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Outstanding Payments"
      subtitle="Customers who currently owe money — sorted by largest balance."
    >
      <div className="flex flex-col gap-6 pb-8">

        {/* Hero Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            padding="lg"
            className={`sm:col-span-2 flex flex-col justify-center relative overflow-hidden border-l-4 ${
              totalOutstanding > 0
                ? "border-l-[var(--color-app-warning)] bg-[var(--color-app-warning)]/5"
                : "border-l-[var(--color-app-success)] bg-[var(--color-app-success)]/5"
            }`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-app-warning)] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
              Total Outstanding Credit
            </span>
            <span
              className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight ${
                totalOutstanding > 0
                  ? "text-[var(--color-app-warning)]"
                  : "text-[var(--color-app-success)]"
              }`}
            >
              {formatCurrency(totalOutstanding)}
            </span>
            {totalOutstanding > 0 && (
              <span className="text-xs text-[var(--color-app-text-muted)] mt-2">
                Across {unpaidCustomers.length} customer{unpaidCustomers.length !== 1 ? "s" : ""}
              </span>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card padding="md" className="flex flex-col justify-center flex-1">
              <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
                Customers Owing
              </span>
              <span className="text-2xl font-mono font-bold text-[var(--color-app-text)]">
                {unpaidCustomers.length}
              </span>
            </Card>
            <Card padding="md" className="flex flex-col justify-center flex-1">
              <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">
                30+ Days Outstanding
              </span>
              <span className="text-2xl font-mono font-bold text-[var(--color-app-warning)]">
                {unpaidCustomers.filter((c) => daysSince(c.oldestUnpaidDate) >= 30).length}
              </span>
            </Card>
          </div>
        </div>

        {/*  Sort toolbar  */}
        {unpaidCustomers.length > 1 && (
          <div className="flex items-center gap-3 justify-end">
            <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">
              Sort by:
            </span>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "balance", label: "Highest Balance" },
                { value: "oldest", label: "Oldest Unpaid Order" },
              ]}
              className="w-52"
              selectClassName="h-9 text-xs"
            />
          </div>
        )}

        {/* Customer Worklist */}
        {unpaidCustomers.length === 0 ? (
          /* Empty state */
          <Card
            padding="lg"
            className="flex flex-col items-center justify-center py-20 text-center border-dashed border-[var(--color-app-border)] bg-[var(--color-app-bg)] shadow-none"
          >
            <div className="w-20 h-20 rounded-full bg-[var(--color-app-success)]/10 flex items-center justify-center mb-5 border border-[var(--color-app-success)]/20 text-[var(--color-app-success)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--color-app-text)] mb-2">
              All Customers Are Paid Up
            </h3>
            <p className="text-sm text-[var(--color-app-text-muted)] max-w-sm">
              No outstanding balances right now. Every account is fully settled.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {(() => {
              const maxP = Math.max(1, Math.ceil(unpaidCustomers.length / pageSize));
              const safeP = Math.min(currentPage, maxP);
              return unpaidCustomers.slice((safeP - 1) * pageSize, safeP * pageSize);
            })().map((entry) => {
              const days = daysSince(entry.oldestUnpaidDate);
              const isEscalated = days >= 30;
              const isCritical = days >= 60;

              return (
                <Card
                  key={entry.customerId}
                  padding="none"
                  className={[
                    "overflow-hidden transition-all duration-150",
                    isCritical
                      ? "border-[var(--color-app-danger)]/40 bg-[var(--color-app-danger)]/[0.02]"
                      : isEscalated
                      ? "border-[var(--color-app-warning)]/40 bg-[var(--color-app-warning)]/[0.02]"
                      : "border-[var(--color-app-border)] bg-[var(--color-app-panel)]",
                  ].join(" ")}
                >
                  {/* Escalation accent bar */}
                  {(isEscalated || isCritical) && (
                    <div
                      className={`h-0.5 w-full ${
                        isCritical
                          ? "bg-[var(--color-app-danger)]"
                          : "bg-[var(--color-app-warning)]"
                      }`}
                    />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
                    {/* Identity */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={[
                          "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-sm shrink-0",
                          isCritical
                            ? "bg-[var(--color-app-danger)]"
                            : isEscalated
                            ? "bg-[var(--color-app-warning)]"
                            : "bg-[var(--color-app-accent)]",
                        ].join(" ")}
                      >
                        {getInitials(entry.name)}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <button
                          onClick={() => navigate(`/customers/${entry.customerId}`)}
                          className="text-sm sm:text-base font-semibold text-[var(--color-app-text)] hover:text-[var(--color-app-accent)] transition-colors text-left truncate"
                        >
                          {entry.name}
                        </button>
                        {entry.phone && (
                          <span className="text-xs text-[var(--color-app-text-muted)] truncate">
                            {entry.phone}
                          </span>
                        )}
                        <div className="mt-1">
                          <AgeBadge dateStr={entry.oldestUnpaidDate} />
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 pl-14 sm:pl-0">
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-0.5">
                          Balance Owed
                        </span>
                        <span
                          className={`font-mono font-bold text-lg sm:text-xl ${
                            isCritical
                              ? "text-[var(--color-app-danger)]"
                              : isEscalated
                              ? "text-[var(--color-app-warning)]"
                              : "text-[var(--color-app-warning)]"
                          }`}
                        >
                          {formatCurrency(entry.totalBalance)}
                        </span>
                      </div>

                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-0.5">
                          Unpaid Orders
                        </span>
                        <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">
                          {entry.unpaidOrderCount}
                        </span>
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => openPaymentModal(entry)}
                        className="shrink-0 text-xs h-9 px-3"
                      >
                        💳 Record Payment
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            <Pagination
              currentPage={currentPage}
              totalItems={unpaidCustomers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        )}
      </div>

      {/* ── Payment Modal ── */}
      <Modal
        isOpen={!!paymentTarget}
        onClose={() => !isSubmitting && setPaymentTarget(null)}
        title={`Record Payment — ${paymentTarget?.name ?? ""}`}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="secondary"
              onClick={() => setPaymentTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePaymentSubmit}
              disabled={
                isSubmitting ||
                !paymentAmount ||
                parseFloat(paymentAmount) <= 0 ||
                parseFloat(paymentAmount) > (paymentTarget?.totalBalance ?? 0) + 0.001
              }
            >
              {isSubmitting ? "Recording..." : "Confirm Payment"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
          <div className="p-3 bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-lg flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-app-text-muted)]">
              Total Outstanding:
            </span>
            <span className="text-lg font-mono font-bold text-[var(--color-app-warning)]">
              {formatCurrency(paymentTarget?.totalBalance ?? 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="outstanding-payment-amount"
              label="Payment Amount"
              type="number"
              step="0.01"
              min="0.01"
              max={paymentTarget?.totalBalance}
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(e.target.value);
                setModalError("");
              }}
              required
            />
            <Input
              id="outstanding-payment-date"
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <Input
            id="outstanding-payment-notes"
            label="Notes (Optional)"
            type="text"
            placeholder="e.g. Cash payment, bank transfer..."
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
          />

          {modalError && (
            <div className="p-3 bg-[var(--color-app-danger)]/10 border border-[var(--color-app-danger)]/20 rounded-lg text-xs font-medium text-[var(--color-app-danger)]">
              {modalError}
            </div>
          )}

          {/* FIFO Allocation Preview */}
          {allocationPreview.length > 0 && (
            <div className="p-3.5 bg-[var(--color-app-bg)] border border-[var(--color-app-border)] rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">
                  Allocation Preview (Oldest First)
                </span>
                <span className="text-[10px] font-mono text-[var(--color-app-text-subtle)]">
                  {allocationPreview.length} order{allocationPreview.length !== 1 ? "s" : ""} affected
                </span>
              </div>
              <div className="flex flex-col divide-y divide-[var(--color-app-border)]">
                {allocationPreview.map(({ order, allocated, newBalance, isFullyPaid }) => (
                  <div key={order.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--color-app-text)]">
                        Order #{order.id}
                      </span>
                      <span className="text-[10px] text-[var(--color-app-text-subtle)]">
                        {new Date(order.order_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-semibold text-[var(--color-app-success)]">
                        +{formatCurrency(allocated)}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isFullyPaid
                            ? "text-[var(--color-app-success)] font-medium"
                            : "text-[var(--color-app-text-muted)]"
                        }`}
                      >
                        {isFullyPaid ? "Fully Paid" : `Remaining: ${formatCurrency(newBalance)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>
    </PageContainer>
  );
}
