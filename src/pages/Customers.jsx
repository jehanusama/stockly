import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Modal, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

function getInitials(name) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0][0] || "?").toUpperCase();
}

export default function Customers() {
  const navigate = useNavigate();
  const { customers, orders, addCustomer, updateCustomer, deleteCustomer, isLoading, error, refreshData } = useAppData();
  const [search, setSearch] = useState("");
  
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
      if (!salesByCustomer[order.customer_id]) {
        salesByCustomer[order.customer_id] = { orders: 0, spend: 0 };
      }
      salesByCustomer[order.customer_id].orders += 1;
      salesByCustomer[order.customer_id].spend += order.final_total;
    });

    const lowerSearch = search.toLowerCase();
    return customers
      .map(c => ({
        ...c,
        totalOrders: salesByCustomer[c.id]?.orders || 0,
        lifetimeSpend: salesByCustomer[c.id]?.spend || 0
      }))
      .filter(c => 
        c.name.toLowerCase().includes(lowerSearch) || 
        c.phone.toLowerCase().includes(lowerSearch)
      )
      .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend); 
  }, [customers, orders, search]);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setFormError("");
    setIsSubmitting(true);
    if (isAddModalOpen) {
      const res = await addCustomer({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
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
        phone: formData.phone.trim(),
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
          <Input label="Phone Number" placeholder="e.g. 555-0199" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
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
      <div className="flex flex-col h-[calc(100vh-180px)] pb-8">
        <Card className="flex flex-col flex-1 min-h-0 relative border-[var(--color-app-border)] p-0 overflow-hidden bg-[var(--color-app-bg)] shadow-none">
          
          {/* Sticky Search */}
          <div className="sticky top-0 z-10 p-4 border-b border-[var(--color-app-border)] bg-[var(--color-app-panel)] rounded-t-xl">
            <Input 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-[var(--color-app-bg)] border-[var(--color-app-border)] shadow-sm"
            />
          </div>

          {/* Directory List Area */}
          <div className="flex-1 overflow-auto bg-[var(--color-app-bg)]">
            {processedCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
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
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--color-app-border)]">
                {processedCustomers.map(customer => (
                  <li key={customer.id} className="relative group">
                    <div className="w-full flex items-center justify-between p-3.5 sm:p-5 gap-3 bg-[var(--color-app-panel)] hover:bg-[var(--color-app-panel-hover)] transition-colors duration-150">
                      {/* Left: Identity & Click area */}
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-app-border-focus)] rounded-lg p-1"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-sm shrink-0">
                          {getInitials(customer.name)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm sm:text-base text-[var(--color-app-text)] group-hover:text-[var(--color-app-accent)] transition-colors truncate">{customer.name}</span>
                          <span className="text-xs sm:text-sm text-[var(--color-app-text-muted)] truncate">{customer.phone}</span>
                        </div>
                      </button>

                      {/* Right: Metrics & Actions */}
                      <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                        <div className="flex flex-col items-end text-right">
                          <span className="text-[10px] sm:text-xs font-medium text-[var(--color-app-text-muted)] uppercase tracking-wider mb-0.5">Spend</span>
                          <span className="font-mono text-sm sm:text-lg text-[var(--color-app-text)] font-semibold leading-tight">
                            {formatCurrency(customer.lifetimeSpend)}
                          </span>
                          <span className="text-[10px] sm:text-xs text-[var(--color-app-text-subtle)] mt-1 font-medium bg-[var(--color-app-elevated)] px-2 py-0.5 rounded-full border border-[var(--color-app-border)]">
                            {customer.totalOrders} {customer.totalOrders === 1 ? 'Order' : 'Orders'}
                          </span>
                        </div>

                        {/* Actions: Edit & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(customer);
                            }}
                            className="p-2 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]"
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
                            className="p-2 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-elevated)] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]"
                            title="Delete Customer"
                            aria-label="Delete Customer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
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
                  <strong>{deleteTarget.name}</strong> has {deleteTarget.totalOrders} existing order{deleteTarget.totalOrders === 1 ? '' : 's'}. Customers with order history cannot be deleted.
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
