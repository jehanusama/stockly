import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Input, StockBar } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { mockCustomers } from "@/data/mockCustomers";
import { mockProducts } from "@/data/mockProducts";

function newItem() {
  return { id: crypto.randomUUID(), productId: "", quantity: "1", customPrice: "" };
}

export default function NewSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Lazy-initialize customerId from URL param so we avoid setState inside useEffect
  const [customerId, setCustomerId] = useState(() => {
    const urlId = searchParams.get("customer_id") ?? "";
    return mockCustomers.some(c => c.id === urlId) ? urlId : "";
  });

  const [cart, setCart] = useState(() => [newItem()]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // Derived Customer
  const selectedCustomer = mockCustomers.find(c => c.id === customerId);

  // Cart Functions
  const addCartItem = () => {
    setCart(prev => [...prev, newItem()]);
  };

  const removeCartItem = (id) => {
    setCart(prev => {
      if (prev.length === 1) return [newItem()];
      return prev.filter(item => item.id !== id);
    });
  };

  const updateCartItem = (id, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "productId" && value) {
        const product = mockProducts.find(p => p.id === value);
        if (product) updated.customPrice = (product.cost_price * 1.2).toFixed(2);
      }
      return updated;
    }));
  };

  // Math & Validation — pure derivation, no mutation
  const processedCart = cart.map(item => {
    const product = mockProducts.find(p => p.id === item.productId);
    const qty = parseInt(item.quantity) || 0;
    const price = parseFloat(item.customPrice) || 0;
    const hasEnoughStock = product ? qty <= product.stock_quantity : true;
    return { ...item, product, qty, price, hasEnoughStock };
  });

  const { totalRevenue, totalCost, totalItemsCount } = processedCart.reduce(
    (acc, item) => {
      if (item.product) {
        acc.totalRevenue += item.qty * item.price;
        acc.totalCost += item.qty * item.product.cost_price;
        acc.totalItemsCount += item.qty;
      }
      return acc;
    },
    { totalRevenue: 0, totalCost: 0, totalItemsCount: 0 }
  );

  const isFormValid =
    customerId !== "" &&
    processedCart.length > 0 &&
    processedCart.every(
      item => item.product && item.qty > 0 && item.price >= 0 && item.hasEnoughStock
    );

  const netProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLastSale({
      customer: selectedCustomer,
      items: processedCart,
      totalItemsCount,
      totalRevenue,
      netProfit
    });
    setIsSuccess(true);
  };

  const resetForm = () => {
    setCart([newItem()]);
    setIsSuccess(false);
    setLastSale(null);
  };

  // ── Success State View ──
  if (isSuccess && lastSale) {
    return (
      <PageContainer title="Sale Recorded" subtitle="Transaction completed successfully.">
        <div className="flex justify-center py-10">
          <Card padding="lg" className="w-full max-w-lg flex flex-col items-center text-center gap-6 border-[var(--color-app-success)] shadow-[0_0_40px_rgba(var(--color-app-success-rgb),0.1)]">
            <div className="w-20 h-20 rounded-full bg-[var(--color-app-success)]/10 text-[var(--color-app-success)] flex items-center justify-center border-2 border-[var(--color-app-success)]/20 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-[var(--color-app-text)]">Success!</h2>
              <p className="text-[var(--color-app-text-muted)]">
                You sold <span className="font-semibold text-[var(--color-app-text)]">{lastSale.totalItemsCount} items</span> to <span className="font-semibold text-[var(--color-app-text)]">{lastSale.customer.name}</span>.
              </p>
            </div>

            <div className="w-full bg-[var(--color-app-bg)] rounded-xl p-4 border border-[var(--color-app-border)] flex justify-between items-center my-2">
              <div className="flex flex-col text-left">
                <span className="text-xs uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Total Revenue</span>
                <span className="font-mono text-xl font-bold text-[var(--color-app-text)]">${lastSale.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Net Profit</span>
                <span className="font-mono text-xl font-bold text-[var(--color-app-success)]">+${lastSale.netProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex w-full gap-4 mt-2">
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/')}>Dashboard</Button>
              <Button variant="primary" className="flex-1" onClick={resetForm}>Record Another Sale</Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // ── Main Form View ──
  return (
    <PageContainer title="New Sale" subtitle="Record a transaction and calculate live profit.">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <form id="new-sale-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <Card padding="lg" className="flex flex-col gap-6 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-3">1. Select Customer</h3>
              <div className="flex flex-col gap-1.5">
                <select 
                  value={customerId} 
                  onChange={e => setCustomerId(e.target.value)}
                  className="h-11 w-full bg-[var(--color-app-bg)] border border-[var(--color-app-border)] rounded-lg px-3 text-sm text-[var(--color-app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-app-border-focus)] appearance-none"
                  required
                >
                  <option value="" disabled>Select a customer...</option>
                  {mockCustomers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end mb-2 px-1">
                <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider">2. Transaction Items</h3>
              </div>
              
              {processedCart.map((item, index) => (
                <Card key={item.id} padding="lg" className="flex flex-col gap-6 bg-[var(--color-app-panel)] border-[var(--color-app-border)] relative">
                  
                  {/* Remove Item Button */}
                  <button 
                    type="button" 
                    onClick={() => removeCartItem(item.id)}
                    className="absolute top-4 right-4 text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-error)] transition-colors"
                    aria-label="Remove item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>

                  <h4 className="text-xs font-semibold text-[var(--color-app-text-muted)] tracking-wider">Item {index + 1}</h4>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 pr-8">
                      <label className="text-sm font-medium text-[var(--color-app-text-subtle)]">Product</label>
                      <select 
                        value={item.productId} 
                        onChange={e => updateCartItem(item.id, "productId", e.target.value)}
                        className="h-11 w-full bg-[var(--color-app-bg)] border border-[var(--color-app-border)] rounded-lg px-3 text-sm text-[var(--color-app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-app-border-focus)] appearance-none"
                        required
                      >
                        <option value="" disabled>Select a product...</option>
                        {mockProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {item.product && (
                      <div className="bg-[var(--color-app-elevated)] p-4 rounded-xl border border-[var(--color-app-border)] flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)] tracking-wider">Unit Cost Price</span>
                          <span className="font-mono text-lg font-semibold text-[var(--color-app-text)]">${item.product.cost_price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col sm:w-1/2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)] tracking-wider">Available Stock</span>
                            <span className="font-mono text-xs font-semibold text-[var(--color-app-text)]">{item.product.stock_quantity} {item.product.unit}</span>
                          </div>
                          <StockBar current={item.product.stock_quantity} threshold={10} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                      <div className="flex flex-col gap-1.5">
                        <Input 
                          type="number" 
                          min="1" 
                          step="1"
                          label="Quantity" 
                          value={item.quantity} 
                          onChange={e => updateCartItem(item.id, "quantity", e.target.value)} 
                          required 
                        />
                        {!item.hasEnoughStock && item.product && (
                          <span className="text-xs font-medium text-[var(--color-app-error)] flex items-center gap-1 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            Only {item.product.stock_quantity} units available.
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          label="Custom Sale Price (per unit)" 
                          value={item.customPrice} 
                          onChange={e => updateCartItem(item.id, "customPrice", e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <Button 
                type="button" 
                variant="secondary" 
                className="w-full border-dashed py-3"
                onClick={addCartItem}
              >
                + Add Another Product
              </Button>
            </div>

          </form>
        </div>

        {/* Right Column: Live Receipt */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 flex flex-col gap-4">
            <Card padding="lg" className="flex flex-col gap-6 bg-[var(--color-app-bg)] border-[var(--color-app-border)] border-t-4 border-t-[var(--color-app-accent)] shadow-xl shadow-black/10">
              <h3 className="text-sm font-bold text-[var(--color-app-text)] text-center tracking-widest uppercase mb-2">Live Receipt</h3>
              
              <div className="flex justify-between items-center pb-4 border-b border-dashed border-[var(--color-app-border)]">
                <span className="text-sm text-[var(--color-app-text-muted)]">Subtotal ({totalItemsCount} items)</span>
                <span className="font-mono text-[var(--color-app-text)] font-semibold">${totalRevenue.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-dashed border-[var(--color-app-border)]">
                <span className="text-sm text-[var(--color-app-text-muted)]">Total Cost</span>
                <span className="font-mono text-[var(--color-app-text-subtle)]">-${totalCost.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col pt-2 gap-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs uppercase font-bold text-[var(--color-app-text-subtle)] tracking-wider">Net Profit</span>
                  <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded">{margin}% Margin</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-mono font-bold text-[var(--color-app-success)]">+${netProfit.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 pt-6 border-t border-[var(--color-app-border)]">
                <Button 
                  type="submit" 
                  form="new-sale-form" 
                  variant="primary" 
                  className="w-full h-12 text-base font-semibold"
                  disabled={!isFormValid}
                >
                  Record Sale
                </Button>
              </div>
            </Card>
            
            <p className="text-xs text-center text-[var(--color-app-text-muted)] flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Transaction is recorded securely
            </p>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
