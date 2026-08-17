import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input, Modal } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { mockCustomers as initialCustomers } from "@/data/mockCustomers";
import { mockSales } from "@/data/mockSales";

// Helper to generate a 2-letter avatar from a name
function getInitials(name) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0][0] || "?").toUpperCase();
}

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ id: "", name: "", phone: "", notes: "" });

  const resetForm = () => setFormData({ id: "", name: "", phone: "", notes: "" });

  // Compute LTV and Order Count, then apply search filter
  const processedCustomers = useMemo(() => {
    // 1. Aggregate Sales by Customer ID
    const salesByCustomer = {};
    mockSales.forEach(sale => {
      if (!salesByCustomer[sale.customer_id]) {
        salesByCustomer[sale.customer_id] = { orders: 0, spend: 0 };
      }
      salesByCustomer[sale.customer_id].orders += 1;
      salesByCustomer[sale.customer_id].spend += sale.total_price;
    });

    // 2. Join data and apply search
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
      .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend); // Sort by highest spend
  }, [customers, search]);

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (isAddModalOpen) {
      const newCustomer = {
        id: `c${Date.now()}`,
        name: formData.name,
        phone: formData.phone || "No phone provided",
        notes: formData.notes
      };
      setCustomers([newCustomer, ...customers]);
      setIsAddModalOpen(false);
    }
    resetForm();
  };

  const customerForm = (
    <form onSubmit={handleSaveCustomer} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-2">Identity & Contact</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" placeholder="e.g. Jane Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Phone Number" placeholder="e.g. 555-0199" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-2">Additional Information</h4>
        <Input label="Notes" placeholder="Preferences, special requests, etc." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-app-border)]">
        <Button variant="secondary" type="button" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>Cancel</Button>
        <Button variant="primary" type="submit">Save Customer</Button>
      </div>
    </form>
  );

  return (
    <PageContainer 
      title="Customers" 
      subtitle="View and manage your client relationships."
      actions={<Button variant="primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>+ Add Customer</Button>}
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
                {!search && <Button variant="primary" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>Add your first customer</Button>}
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--color-app-border)]">
                {processedCustomers.map(customer => (
                  <li key={customer.id}>
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="w-full text-left flex items-center justify-between p-4 sm:p-5 bg-[var(--color-app-panel)] hover:bg-[var(--color-app-panel-hover)] transition-colors duration-150 group outline-none focus-visible:bg-[var(--color-app-panel-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-app-border-focus)]"
                    >
                      {/* Left: Identity */}
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white font-semibold text-sm sm:text-base shadow-sm shrink-0">
                          {getInitials(customer.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-app-text)] group-hover:text-[var(--color-app-accent)] transition-colors">{customer.name}</span>
                          <span className="text-sm text-[var(--color-app-text-muted)]">{customer.phone}</span>
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="flex flex-col items-end text-right">
                        <span className="text-xs font-medium text-[var(--color-app-text-muted)] uppercase tracking-wider mb-0.5">Lifetime Spend</span>
                        <span className="font-mono text-[var(--color-app-text)] font-semibold sm:text-lg leading-tight">
                          ${customer.lifetimeSpend.toFixed(2)}
                        </span>
                        <span className="text-xs text-[var(--color-app-text-subtle)] mt-1 font-medium bg-[var(--color-app-elevated)] px-2 py-0.5 rounded-full border border-[var(--color-app-border)]">
                          {customer.totalOrders} {customer.totalOrders === 1 ? 'Order' : 'Orders'}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); resetForm(); }} title="Add New Customer">
        {customerForm}
      </Modal>
    </PageContainer>
  );
}
