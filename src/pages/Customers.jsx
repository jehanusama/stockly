import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Select, Modal, LoadingState, ErrorState, Pagination } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "?").toUpperCase();
}

export default function Customers() {
  const navigate = useNavigate();
  const { customers, orders, printedSales = [], getCustomerTotalBalance, addCustomer, updateCustomer, deleteCustomer, isLoading, error, refreshData } = useAppData();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("balance"); // "balance" | "spend" | "name"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ id: "", name: "", phone: "", notes: "" });

  const resetForm = () => setFormData({ id: "", name: "", phone: "", notes: "" });

  const openAddModal = () => {
    resetForm();
    setFormError("");
    setIsAddModalOpen(true);
  };

  const openEditModal = (customer) => {
    setFormData({
      id: customer.id,
      name: customer.name || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setFormError("");
    resetForm();
  };

  const processedCustomers = useMemo(() => {
    const salesByCustomer = {};
    orders.forEach(order => {
      if (!order.customer_id) return;
      if (!salesByCustomer[order.customer_id]) {
        salesByCustomer[order.customer_id] = { orders: 0, spend: 0 };
      }
      salesByCustomer[order.customer_id].orders += 1;
      salesByCustomer[order.customer_id].spend += Number(order.final_total ?? 0);
    });

    printedSales.forEach(sale => {
      if (!sale.customer_id) return;
      if (!salesByCustomer[sale.customer_id]) {
        salesByCustomer[sale.customer_id] = { orders: 0, spend: 0 };
      }
      salesByCustomer[sale.customer_id].orders += 1;
      salesByCustomer[sale.customer_id].spend += Number(sale.line_total ?? 0);
    });

    const lowerSearch = search.toLowerCase();
    return customers
      .map(c => ({
        ...c,
        totalOrders: salesByCustomer[c.id]?.orders || 0,
        lifetimeSpend: salesByCustomer[c.id]?.spend || 0,
        outstandingBalance: getCustomerTotalBalance(c.id),
      }))
      .filter(c => 
        (c.name ?? "").toLowerCase().includes(lowerSearch) || 
        (c.phone ?? "").toLowerCase().includes(lowerSearch) ||
        (c.notes ?? "").toLowerCase().includes(lowerSearch)
      )
      .sort((a, b) => {
        if (sortBy === "balance") return (b.outstandingBalance || 0) - (a.outstandingBalance || 0);
        if (sortBy === "spend") return (b.lifetimeSpend || 0) - (a.lifetimeSpend || 0);
        if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "newest") {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        }
        if (sortBy === "oldest") {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tA - tB;
        }
        return 0;
      }); 
  }, [customers, orders, printedSales, getCustomerTotalBalance, search, sortBy]);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setFormError("");
    setIsSubmitting(true);
    if (isAddModalOpen) {
      const res = await addCustomer({
        name: formData.name.trim(),
        phone: (formData.phone || "").trim(),
        notes: formData.notes.trim()
      });
      setIsSubmitting(false);
      if (res && !res.success) {
        setFormError(res.error || "Failed to add customer.");
        return;
      }
      setIsAddModalOpen(false);
    } else if (isEditModalOpen) {
      const res = await updateCustomer({
        id: formData.id,
        name: formData.name.trim(),
        phone: (formData.phone || "").trim(),
        notes: formData.notes.trim()
      });
      setIsSubmitting(false);
      if (res && !res.success) {
        setFormError(res.error || "Failed to update customer.");
        return;
      }
      setIsEditModalOpen(false);
    }
    resetForm();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteCustomer(deleteTarget.id);
    setIsDeleting(false);

    if (res && !res.success) {
      setDeleteError(res.error || "Cannot delete customer because they have existing order history.");
    } else {
      setDeleteTarget(null);
    }
  };

  const customerForm = (
    <form onSubmit={handleSaveCustomer} className="flex flex-col gap-6">
      {formError && (
        <div className="px-4 py-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm font-medium border border-[var(--color-app-danger)]">
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-2">Identity & Contact</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" placeholder="e.g. أحمد محمد" dir="auto" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Phone Number" placeholder="e.g. 555-0199" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-2">Additional Information</h4>
        <Input label="Notes" placeholder="Preferences, special requests, etc." dir="auto" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-app-border)]">
        <Button variant="secondary" type="button" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>{isEditModalOpen ? "Save Changes" : "Save Customer"}</Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <PageContainer title="Customers" subtitle="View and manage your client relationships.">
        <LoadingState message="Loading customer directory..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Customers" subtitle="View and manage your client relationships.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title="Customers" 
      subtitle="View and manage your client relationships."
      actions={<Button variant="primary" onClick={openAddModal}>+ Add Customer</Button>}
    >
      <div className="flex flex-col gap-6 pb-8">
        
        {/* Search & Sort Toolbar */}
        <div className="p-4 border border-[var(--color-app-border)] bg-[var(--color-app-panel)] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <Input 
            placeholder="Search by name or phone..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:max-w-xs bg-[var(--color-app-bg)] border-[var(--color-app-border)] shadow-sm"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider hidden sm:inline">Sort:</span>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "balance", label: "Balance Owed (High to Low)" },
                { value: "spend", label: "Lifetime Spend (High to Low)" },
                { value: "name", label: "Name (A-Z)" },
                { value: "newest", label: "Newest Added" },
                { value: "oldest", label: "Oldest Added" },
              ]}
              className="w-full sm:w-56"
              selectClassName="h-9 text-xs"
            />
          </div>
        </div>

        {processedCustomers.length === 0 ? (
          <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center border-dashed border-[var(--color-app-border)] bg-[var(--color-app-bg)] shadow-none">
            <div className="w-16 h-16 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center mb-4 border border-[var(--color-app-border)] shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-app-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[var(--color-app-text)] mb-2">No customers found</h3>
            <p className="text-sm text-[var(--color-app-text-muted)] mb-6 max-w-sm">
              {search ? "We couldn't find anyone matching your search." : "Your directory is empty. Add your first customer to start tracking relationships."}
            </p>
            {!search && <Button variant="primary" onClick={openAddModal}>Add your first customer</Button>}
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Balance Owed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Lifetime Spend</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-app-border)]">
                  {(() => {
                    const maxP = Math.max(1, Math.ceil(processedCustomers.length / pageSize));
                    const safeP = Math.min(currentPage, maxP);
                    return processedCustomers.slice((safeP - 1) * pageSize, safeP * pageSize);
                  })().map(customer => (
                    <tr 
                      key={customer.id} 
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className={`cursor-pointer transition-colors duration-150 ${customer.outstandingBalance > 0 ? "bg-[var(--color-app-warning)]/[0.03] hover:bg-[var(--color-app-warning)]/[0.08]" : "hover:bg-[var(--color-app-panel-hover)]"}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-sm">
                            {getInitials(customer.name)}
                          </div>
                          <span className="font-semibold text-[var(--color-app-text)] hover:text-[var(--color-app-accent)] transition-colors">
                            {customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--color-app-text-muted)] font-mono">
                        {customer.phone || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {customer.outstandingBalance > 0 ? (
                          <span className="inline-flex flex-col items-end px-2.5 py-1 rounded-md bg-[var(--color-app-warning)]/15 border border-[var(--color-app-warning)]/30 font-mono text-xs font-bold text-[var(--color-app-warning)]">
                            {formatCurrency(customer.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--color-app-success)]">
                            Settled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-xs text-[var(--color-app-text)]">
                        {formatCurrency(customer.lifetimeSpend)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-[var(--color-app-text-muted)]">
                        {customer.totalOrders} {customer.totalOrders === 1 ? 'transaction' : 'transactions'}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(customer);
                            }}
                            className="p-1.5 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] rounded-lg transition-colors"
                            title="Edit Customer"
                            aria-label="Edit Customer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(customer);
                              setDeleteError(null);
                            }}
                            className="p-1.5 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-elevated)] rounded-lg transition-colors"
                            title="Delete Customer"
                            aria-label="Delete Customer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={processedCustomers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </div>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="sm:hidden flex flex-col gap-3">
              {(() => {
                const maxP = Math.max(1, Math.ceil(processedCustomers.length / pageSize));
                const safeP = Math.min(currentPage, maxP);
                return processedCustomers.slice((safeP - 1) * pageSize, safeP * pageSize);
              })().map(customer => (
                <Card 
                  key={customer.id}
                  padding="md"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className={`cursor-pointer border-[var(--color-app-border)] ${customer.outstandingBalance > 0 ? "bg-[var(--color-app-warning)]/[0.03]" : "bg-[var(--color-app-panel)]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {getInitials(customer.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-[var(--color-app-text)] truncate">{customer.name}</span>
                        <span className="text-xs text-[var(--color-app-text-muted)] truncate">{customer.phone || "No phone"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {customer.outstandingBalance > 0 ? (
                        <span className="font-mono text-xs font-bold text-[var(--color-app-warning)] bg-[var(--color-app-warning)]/15 px-2 py-0.5 rounded border border-[var(--color-app-warning)]/30">
                          {formatCurrency(customer.outstandingBalance)}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--color-app-success)]">Settled</span>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="p-1.5 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

              <Pagination
                currentPage={currentPage}
                totalItems={processedCustomers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={closeModal} title={isEditModalOpen ? "Edit Customer" : "Add New Customer"}>
        {customerForm}
      </Modal>

      {/* Delete Confirmation / Warning Modal */}
      <Modal 
        isOpen={!!deleteTarget} 
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }} 
        title="Delete Customer"
      >
        <div className="flex flex-col gap-6">
          {deleteTarget?.totalOrders > 0 ? (
            <>
              <div className="px-4 py-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm font-medium border border-[var(--color-app-danger)] flex flex-col gap-1">
                <span className="font-bold">Cannot Delete Customer</span>
                <span>
                  <strong>{deleteTarget.name}</strong> has {deleteTarget.totalOrders} existing transaction{deleteTarget.totalOrders === 1 ? '' : 's'}. Customers with transaction history cannot be deleted.
                </span>
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              {deleteError && (
                <div className="px-4 py-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm font-medium border border-[var(--color-app-danger)]">
                  {deleteError}
                </div>
              )}

              <p className="text-sm text-[var(--color-app-text-muted)]">
                Are you sure you want to delete customer <strong className="text-[var(--color-app-text)]">{deleteTarget?.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleDeleteConfirm}
                  loading={isDeleting}
                >
                  Delete Customer
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
