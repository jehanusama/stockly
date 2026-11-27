import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Input, Select, Modal, LoadingState, ErrorState, Pagination, CustomerSelect, DatePicker } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency, parseNumber, toEnglishDigits } from "@/utils/currency";
import { useToast } from "@/context/ToastContext";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

export default function Deposits() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customers = [], customerDeposits = [], getCustomerDepositBalance, addCustomerDeposit, deleteCustomerDeposit, isLoading, error, refreshData } = useAppData();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState("deposits"); // "deposits" | "customers"
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "used"
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest" | "amount_desc" | "balance_desc"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(() => searchParams.get("action") === "new");
  const [depositForm, setDepositForm] = useState(() => ({
    customer_id: searchParams.get("customer_id") || "",
    amount: "",
    deposit_date: new Date().toISOString().split("T")[0],
    notes: "",
  }));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalDeposited = 0;
    let totalUsed = 0;
    let totalRemaining = 0;
    const customersWithCreditSet = new Set();

    customerDeposits.forEach((d) => {
      const amt = Number(d.amount ?? 0);
      const used = Number(d.amount_used ?? 0);
      const rem = Math.max(0, amt - used);

      totalDeposited += amt;
      totalUsed += used;
      totalRemaining += rem;

      if (rem > 0 && d.customer_id) {
        customersWithCreditSet.add(d.customer_id);
      }
    });

    return {
      totalDeposited,
      totalUsed,
      totalRemaining,
      customersWithCreditCount: customersWithCreditSet.size,
    };
  }, [customerDeposits]);

  // Filtered deposits list
  const processedDeposits = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    const searchEng = toEnglishDigits(lowerSearch);

    return customerDeposits
      .map((d) => {
        const cust = customerMap.get(d.customer_id);
        const rem = Number(d.amount_remaining ?? (d.amount - (d.amount_used || 0)));
        return {
          ...d,
          customer: cust,
          customerName: cust?.name || "Unknown Customer",
          customerPhone: cust?.phone || "",
          calculatedRemaining: rem,
          isFullyUsed: rem <= 0.001,
        };
      })
      .filter((d) => {
        // Status filter
        if (statusFilter === "active" && d.isFullyUsed) return false;
        if (statusFilter === "used" && !d.isFullyUsed) return false;

        // Search filter
        if (!lowerSearch) return true;
        const nameMatch = d.customerName.toLowerCase().includes(lowerSearch);
        const phoneMatch = d.customerPhone.toLowerCase().includes(lowerSearch) || d.customerPhone.toLowerCase().includes(searchEng);
        const notesMatch = (d.notes || "").toLowerCase().includes(lowerSearch);
        return nameMatch || phoneMatch || notesMatch;
      })
      .sort((a, b) => {
        if (sortBy === "amount_desc") return (b.amount || 0) - (a.amount || 0);
        if (sortBy === "balance_desc") return (b.calculatedRemaining || 0) - (a.calculatedRemaining || 0);
        if (sortBy === "oldest") {
          const tA = a.deposit_date ? new Date(a.deposit_date).getTime() : 0;
          const tB = b.deposit_date ? new Date(b.deposit_date).getTime() : 0;
          return tA - tB;
        }
        // default newest
        const tA = a.deposit_date ? new Date(a.deposit_date).getTime() : 0;
        const tB = b.deposit_date ? new Date(b.deposit_date).getTime() : 0;
        return tB - tA;
      });
  }, [customerDeposits, customerMap, search, statusFilter, sortBy]);

  // Aggregated Customer Balances (for "By Customer" tab)
  const processedCustomerBalances = useMemo(() => {
    const customerDepositSummary = new Map();

    customerDeposits.forEach((d) => {
      if (!d.customer_id) return;
      if (!customerDepositSummary.has(d.customer_id)) {
        customerDepositSummary.set(d.customer_id, {
          totalDeposited: 0,
          totalUsed: 0,
          totalRemaining: 0,
          depositCount: 0,
        });
      }
      const entry = customerDepositSummary.get(d.customer_id);
      const amt = Number(d.amount ?? 0);
      const used = Number(d.amount_used ?? 0);
      const rem = Math.max(0, amt - used);

      entry.totalDeposited += amt;
      entry.totalUsed += used;
      entry.totalRemaining += rem;
      entry.depositCount += 1;
    });

    const lowerSearch = search.toLowerCase().trim();
    const searchEng = toEnglishDigits(lowerSearch);

    const list = [];
    customerDepositSummary.forEach((summary, custId) => {
      const cust = customerMap.get(custId);
      const name = cust?.name || "Unknown Customer";
      const phone = cust?.phone || "";

      // Filter by search
      if (lowerSearch) {
        const nameMatch = name.toLowerCase().includes(lowerSearch);
        const phoneMatch = phone.toLowerCase().includes(lowerSearch) || phone.toLowerCase().includes(searchEng);
        if (!nameMatch && !phoneMatch) return;
      }

      // Filter by status
      if (statusFilter === "active" && summary.totalRemaining <= 0.001) return;
      if (statusFilter === "used" && summary.totalRemaining > 0.001) return;

      list.push({
        customer: cust,
        id: custId,
        name,
        phone,
        ...summary,
      });
    });

    return list.sort((a, b) => b.totalRemaining - a.totalRemaining || b.totalDeposited - a.totalDeposited);
  }, [customerDeposits, customerMap, search, statusFilter]);

  // Pagination for currently active tab
  const activeList = activeTab === "deposits" ? processedDeposits : processedCustomerBalances;
  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, currentPage, pageSize]);

  // Open record modal
  const openRecordModal = (prefillCustId = "") => {
    setDepositForm({
      customer_id: prefillCustId || "",
      amount: "",
      deposit_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setFormError("");
    setIsDepositModalOpen(true);
  };

  const closeRecordModal = () => {
    setIsDepositModalOpen(false);
    setFormError("");
    if (searchParams.get("action")) {
      setSearchParams({});
    }
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositForm.customer_id) {
      setFormError("Please select a customer.");
      return;
    }
    const amt = parseNumber(depositForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError("Please enter a valid deposit amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const res = await addCustomerDeposit({
      customer_id: depositForm.customer_id,
      amount: amt,
      deposit_date: depositForm.deposit_date,
      notes: depositForm.notes.trim() || null,
    });

    setIsSubmitting(false);

    if (res && !res.success) {
      const msg = res.error || "Failed to record customer deposit.";
      setFormError(msg);
      toastError(msg);
      return;
    }

    success("Customer advance deposit recorded successfully!");
    closeRecordModal();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");

    const res = await deleteCustomerDeposit(deleteTarget.id);
    setIsDeleting(false);

    if (res && !res.success) {
      const msg = res.error || "Failed to delete deposit.";
      setDeleteError(msg);
      toastError(msg);
      return;
    }

    success("Deposit deleted successfully");
    setDeleteTarget(null);
  };

  const selectedCustCredit = useMemo(() => {
    if (!depositForm.customer_id || !getCustomerDepositBalance) return 0;
    return getCustomerDepositBalance(depositForm.customer_id);
  }, [depositForm.customer_id, getCustomerDepositBalance]);

  if (isLoading) {
    return (
      <PageContainer title="Customer Deposits" subtitle="Track customer advance payments and available deposit credits.">
        <LoadingState message="Loading deposits data..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Customer Deposits" subtitle="Track customer advance payments and available deposit credits.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Customer Deposits"
      subtitle="Track customer advance payments, unapplied deposit balances, and apply deposits to future sales."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/customers")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Customers
          </Button>
          <Button variant="primary" onClick={() => openRecordModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Record Deposit
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-12">
        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="border-l-4 border-l-[var(--color-app-success)] bg-[var(--color-app-panel)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Active Deposit Credit</span>
              <p className="text-2xl font-bold font-mono text-[var(--color-app-success)] mt-1">
                {formatCurrency(stats.totalRemaining)}
              </p>
            </div>
            <p className="text-[11px] text-[var(--color-app-text-muted)] mt-2">Available across all customer accounts</p>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[var(--color-app-accent)] bg-[var(--color-app-panel)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Total Received</span>
              <p className="text-2xl font-bold font-mono text-[var(--color-app-text)] mt-1">
                {formatCurrency(stats.totalDeposited)}
              </p>
            </div>
            <p className="text-[11px] text-[var(--color-app-text-muted)] mt-2">{customerDeposits.length} deposits recorded in total</p>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[var(--color-app-text-muted)] bg-[var(--color-app-panel)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Total Applied</span>
              <p className="text-2xl font-bold font-mono text-[var(--color-app-text-subtle)] mt-1">
                {formatCurrency(stats.totalUsed)}
              </p>
            </div>
            <p className="text-[11px] text-[var(--color-app-text-muted)] mt-2">Deducted from completed sales</p>
          </Card>

          <Card padding="md" className="border-l-4 border-l-[var(--color-app-warning)] bg-[var(--color-app-panel)] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Holding Credit</span>
              <p className="text-2xl font-bold font-mono text-[var(--color-app-warning)] mt-1">
                {stats.customersWithCreditCount} <span className="text-sm font-sans font-normal text-[var(--color-app-text-muted)]">clients</span>
              </p>
            </div>
            <p className="text-[11px] text-[var(--color-app-text-muted)] mt-2">Customers with unapplied deposit credit</p>
          </Card>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-[var(--color-app-border)]">
          <button
            type="button"
            onClick={() => { setActiveTab("deposits"); setCurrentPage(1); }}
            className={`pb-3 px-4 text-sm font-semibold transition-colors relative cursor-pointer ${
              activeTab === "deposits"
                ? "text-[var(--color-app-accent)]"
                : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]"
            }`}
          >
            All Deposit Transactions ({customerDeposits.length})
            {activeTab === "deposits" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-app-accent)]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("customers"); setCurrentPage(1); }}
            className={`pb-3 px-4 text-sm font-semibold transition-colors relative cursor-pointer ${
              activeTab === "customers"
                ? "text-[var(--color-app-accent)]"
                : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]"
            }`}
          >
            By Customer ({stats.customersWithCreditCount} with active credit)
            {activeTab === "customers" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-app-accent)]" />
            )}
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border border-[var(--color-app-border)] bg-[var(--color-app-panel)] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <Input
            placeholder="Search by customer name, phone, notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:max-w-xs bg-[var(--color-app-bg)] border-[var(--color-app-border)] shadow-sm"
          />

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end flex-wrap">
            <div className="flex rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-bg)] p-0.5">
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === "all"
                    ? "bg-[var(--color-app-panel)] text-[var(--color-app-text)] shadow-sm"
                    : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("active"); setCurrentPage(1); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === "active"
                    ? "bg-[var(--color-app-success)]/15 text-[var(--color-app-success)] shadow-sm"
                    : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]"
                }`}
              >
                Active Credit
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("used"); setCurrentPage(1); }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === "used"
                    ? "bg-[var(--color-app-panel)] text-[var(--color-app-text-muted)] shadow-sm"
                    : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]"
                }`}
              >
                Fully Used
              </button>
            </div>

            {activeTab === "deposits" && (
              <Select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "balance_desc", label: "Highest Credit Remaining" },
                  { value: "amount_desc", label: "Highest Total Amount" },
                ]}
                className="w-44"
                selectClassName="h-8 text-xs"
              />
            )}
          </div>
        </div>

        {/* Content Table / Cards */}
        {activeList.length === 0 ? (
          <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center border-dashed border-[var(--color-app-border)] bg-[var(--color-app-bg)] shadow-none">
            <div className="w-16 h-16 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center mb-4 border border-[var(--color-app-border)] shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-app-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[var(--color-app-text)] mb-2">No deposits found</h3>
            <p className="text-sm text-[var(--color-app-text-muted)] mb-6 max-w-sm">
              {search || statusFilter !== "all"
                ? "No deposits match your search or filter criteria."
                : "No customer advance deposits have been recorded yet."}
            </p>
            {(!search && statusFilter === "all") && (
              <Button variant="primary" onClick={() => openRecordModal()}>
                Record First Deposit
              </Button>
            )}
          </Card>
        ) : activeTab === "deposits" ? (
          /* TAB 1: Individual Deposit Transactions */
          <div className="flex flex-col gap-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] text-xs uppercase tracking-wider font-semibold border-b border-[var(--color-app-border)]">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Deposit Date</th>
                    <th className="py-3 px-4 text-right">Original Deposit</th>
                    <th className="py-3 px-4 text-right">Used in Sales</th>
                    <th className="py-3 px-4 text-right">Available Credit</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-app-border)]">
                  {pagedItems.map((deposit) => {
                    const isTouchLocked = Number(deposit.amount_used ?? 0) > 0.001;
                    return (
                      <tr key={deposit.id} className="hover:bg-[var(--color-app-panel-hover)] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-center text-xs font-bold text-[var(--color-app-text)] shrink-0">
                              {getInitials(deposit.customerName)}
                            </span>
                            <div>
                              <button
                                type="button"
                                onClick={() => deposit.customer_id && navigate(`/customers/${deposit.customer_id}`)}
                                className="font-semibold text-[var(--color-app-text)] hover:text-[var(--color-app-accent)] transition-colors text-left"
                              >
                                {deposit.customerName}
                              </button>
                              {deposit.customerPhone && (
                                <p className="text-xs text-[var(--color-app-text-muted)] font-mono">
                                  {deposit.customerPhone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[var(--color-app-text-muted)]">
                          {deposit.deposit_date || "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[var(--color-app-text)]">
                          {formatCurrency(deposit.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-[var(--color-app-text-muted)]">
                          {Number(deposit.amount_used ?? 0) > 0 ? (
                            <span className="text-[var(--color-app-warning)]">-{formatCurrency(deposit.amount_used)}</span>
                          ) : (
                            "0.00 EGP"
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                              deposit.calculatedRemaining > 0
                                ? "bg-[var(--color-app-success)]/15 text-[var(--color-app-success)] border border-[var(--color-app-success)]/30"
                                : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] border border-[var(--color-app-border)]"
                            }`}
                          >
                            {formatCurrency(deposit.calculatedRemaining)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--color-app-text-muted)] max-w-xs truncate" title={deposit.notes || ""}>
                          {deposit.notes || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => deposit.customer_id && navigate(`/customers/${deposit.customer_id}`)}
                              className="p-1.5 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] transition-colors"
                              title="View Customer Profile"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </button>
                            {!isTouchLocked && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(deposit)}
                                className="p-1.5 rounded-lg text-[var(--color-app-danger)] hover:bg-[var(--color-app-danger)]/10 transition-colors"
                                title="Delete Deposit"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {pagedItems.map((deposit) => {
                const isTouchLocked = Number(deposit.amount_used ?? 0) > 0.001;
                return (
                  <Card key={deposit.id} padding="md" className="flex flex-col gap-3 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-center text-xs font-bold text-[var(--color-app-text)] shrink-0">
                          {getInitials(deposit.customerName)}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[var(--color-app-text)]">{deposit.customerName}</p>
                          {deposit.customerPhone && (
                            <p className="text-xs text-[var(--color-app-text-muted)] font-mono">{deposit.customerPhone}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                          deposit.calculatedRemaining > 0
                            ? "bg-[var(--color-app-success)]/15 text-[var(--color-app-success)] border border-[var(--color-app-success)]/30"
                            : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] border border-[var(--color-app-border)]"
                        }`}
                      >
                        {formatCurrency(deposit.calculatedRemaining)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[var(--color-app-border)]">
                      <div>
                        <span className="text-[var(--color-app-text-muted)]">Deposited:</span>
                        <p className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(deposit.amount)}</p>
                      </div>
                      <div>
                        <span className="text-[var(--color-app-text-muted)]">Used in Sales:</span>
                        <p className="font-mono font-semibold text-[var(--color-app-warning)]">
                          {formatCurrency(deposit.amount_used || 0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[var(--color-app-text-muted)]">Date:</span>
                        <p className="font-mono text-[var(--color-app-text)]">{deposit.deposit_date || "—"}</p>
                      </div>
                      {deposit.notes && (
                        <div className="col-span-2 text-[var(--color-app-text-muted)] italic">
                          "{deposit.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => deposit.customer_id && navigate(`/customers/${deposit.customer_id}`)}
                        className="text-xs font-semibold text-[var(--color-app-accent)] hover:underline"
                      >
                        View Customer Profile →
                      </button>
                      {!isTouchLocked && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(deposit)}
                          className="text-xs font-semibold text-[var(--color-app-danger)] hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* TAB 2: Aggregated By Customer */
          <div className="flex flex-col gap-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] text-xs uppercase tracking-wider font-semibold border-b border-[var(--color-app-border)]">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-center">Deposits Count</th>
                    <th className="py-3 px-4 text-right">Total Deposited</th>
                    <th className="py-3 px-4 text-right">Total Used</th>
                    <th className="py-3 px-4 text-right">Available Credit</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-app-border)]">
                  {pagedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-app-panel-hover)] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-center text-xs font-bold text-[var(--color-app-text)] shrink-0">
                            {getInitials(item.name)}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${item.id}`)}
                              className="font-semibold text-[var(--color-app-text)] hover:text-[var(--color-app-accent)] transition-colors text-left"
                            >
                              {item.name}
                            </button>
                            {item.phone && (
                              <p className="text-xs text-[var(--color-app-text-muted)] font-mono">
                                {item.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-[var(--color-app-text-muted)]">
                        {item.depositCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[var(--color-app-text)]">
                        {formatCurrency(item.totalDeposited)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-[var(--color-app-text-muted)]">
                        {item.totalUsed > 0 ? (
                          <span className="text-[var(--color-app-warning)]">-{formatCurrency(item.totalUsed)}</span>
                        ) : (
                          "0.00 EGP"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                            item.totalRemaining > 0
                              ? "bg-[var(--color-app-success)]/15 text-[var(--color-app-success)] border border-[var(--color-app-success)]/30"
                              : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] border border-[var(--color-app-border)]"
                          }`}
                        >
                          {formatCurrency(item.totalRemaining)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openRecordModal(item.id)}
                            className="text-xs py-1 px-2.5"
                          >
                            + Add Deposit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/customers/${item.id}`)}
                            className="text-xs py-1 px-2.5"
                          >
                            Profile
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {pagedItems.map((item) => (
                <Card key={item.id} padding="md" className="flex flex-col gap-3 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-center text-xs font-bold text-[var(--color-app-text)] shrink-0">
                        {getInitials(item.name)}
                      </span>
                      <div>
                        <p className="font-semibold text-sm text-[var(--color-app-text)]">{item.name}</p>
                        {item.phone && (
                          <p className="text-xs text-[var(--color-app-text-muted)] font-mono">{item.phone}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        item.totalRemaining > 0
                          ? "bg-[var(--color-app-success)]/15 text-[var(--color-app-success)] border border-[var(--color-app-success)]/30"
                          : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] border border-[var(--color-app-border)]"
                      }`}
                    >
                      {formatCurrency(item.totalRemaining)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[var(--color-app-border)]">
                    <div>
                      <span className="text-[var(--color-app-text-muted)]">Total Deposited:</span>
                      <p className="font-mono font-semibold text-[var(--color-app-text)]">{formatCurrency(item.totalDeposited)}</p>
                    </div>
                    <div>
                      <span className="text-[var(--color-app-text-muted)]">Total Used:</span>
                      <p className="font-mono font-semibold text-[var(--color-app-warning)]">{formatCurrency(item.totalUsed)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/customers/${item.id}`)}
                      className="text-xs py-1"
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openRecordModal(item.id)}
                      className="text-xs py-1"
                    >
                      + Add Deposit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--color-app-text-muted)]">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, activeList.length)} of {activeList.length} entries
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ── Record Deposit Modal ── */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={closeRecordModal}
        title="Record Customer Advance Deposit"
      >
        <form onSubmit={handleDepositSubmit} className="flex flex-col gap-5">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {formError}
            </div>
          )}

          <CustomerSelect
            label="Customer"
            value={depositForm.customer_id}
            onChange={(val) => setDepositForm((prev) => ({ ...prev, customer_id: val }))}
            customers={customers}
            required
            placeholder="Search and select customer..."
          />

          {depositForm.customer_id && (
            <div className="p-3 rounded-lg bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] text-xs flex justify-between items-center">
              <span className="text-[var(--color-app-text-muted)]">Current Available Deposit Credit:</span>
              <span className="font-mono font-bold text-[var(--color-app-accent)]">
                {formatCurrency(selectedCustCredit)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Deposit Amount (EGP)"
              type="number"
              min="0.01"
              step="any"
              value={depositForm.amount}
              onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
              placeholder="0.00"
              required
              autoFocus
            />

            <DatePicker
              label="Deposit Date"
              value={depositForm.deposit_date}
              onChange={(iso) => setDepositForm({ ...depositForm, deposit_date: iso })}
              required
            />
          </div>

          {depositForm.amount && parseNumber(depositForm.amount) > 0 && (
            <div className="p-3 rounded-lg bg-[var(--color-app-success)]/10 border border-[var(--color-app-success)]/20 text-xs flex justify-between items-center">
              <span className="text-[var(--color-app-success)] font-medium">Updated Credit After Deposit:</span>
              <span className="font-mono font-bold text-[var(--color-app-success)]">
                {formatCurrency(selectedCustCredit + parseNumber(depositForm.amount))}
              </span>
            </div>
          )}

          <Input
            label="Notes / Reference (Optional)"
            type="text"
            value={depositForm.notes}
            onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
            placeholder="e.g. Advance for upcoming bulk bags order, cash in hand..."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={closeRecordModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              Save Deposit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Untouched Deposit Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Untouched Deposit"
      >
        <div className="flex flex-col gap-4">
          {deleteError && (
            <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-[var(--color-app-text-muted)]">
            Are you sure you want to delete the deposit of{" "}
            <strong className="text-[var(--color-app-text)] font-mono">{formatCurrency(deleteTarget?.amount)}</strong>{" "}
            for <strong className="text-[var(--color-app-text)]">{deleteTarget?.customerName}</strong> recorded on{" "}
            <strong className="text-[var(--color-app-text)]">{deleteTarget?.deposit_date}</strong>?
          </p>
          <p className="text-xs text-[var(--color-app-text-muted)] italic">
            This deposit has not been applied to any sales and will be safely removed.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-app-border)]">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" loading={isDeleting} onClick={handleDeleteConfirm}>
              Delete Deposit
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
