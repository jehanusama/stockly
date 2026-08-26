import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Input, StockBar, Select, DatePicker } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

function newItem() {
  return { id: crypto.randomUUID(), productId: "", quantity: "1", customPrice: "" };
}

export default function NewSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { customers: mockCustomers, products: mockProducts } = useAppData();
  
  // Lazy-initialize customerId from URL param so we avoid setState inside useEffect
  const [customerId, setCustomerId] = useState(() => {
    const urlId = searchParams.get("customer_id") ?? "";
    return mockCustomers.some(c => c.id === urlId) ? urlId : "";
  });
  const [orderDate, setOrderDate] = useState(() => {
    const urlDate = searchParams.get("date");
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
    return new Date().toISOString().slice(0, 10);
  });
  
  const [cart, setCart] = useState(() => [newItem()]);
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
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

  const preDiscountProfit = totalRevenue - totalCost;

  const discountAmount = useMemo(() => {
    if (discountType === "none" || !discountValue) return 0;
    const val = parseFloat(discountValue) || 0;
    if (discountType === "fixed") return Math.min(val, totalRevenue); // can't discount more than revenue
    if (discountType === "percentage") return totalRevenue * Math.min(val / 100, 1);
    return 0;
  }, [discountType, discountValue, totalRevenue]);

  const finalTotal = totalRevenue - discountAmount;
  const finalProfit = finalTotal - totalCost;
  const finalMargin = finalTotal > 0 ? ((finalProfit / finalTotal) * 100).toFixed(0) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLastSale({
      orderDate,
      customer: selectedCustomer,
      items: processedCart,
      totalItemsCount,
      subtotal: totalRevenue,
      discountAmount,
      finalTotal,
      finalProfit
    });
    setIsSuccess(true);
  };

  const resetForm = () => {
    setCustomerId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setCart([newItem()]);
    setDiscountType("none");
    setDiscountValue("");
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
                You sold <span className="font-semibold text-[var(--color-app-text)]">{lastSale.totalItemsCount} items</span> to <span className="font-semibold text-[var(--color-app-text)]">{lastSale.customer.name}</span> on <span className="font-semibold text-[var(--color-app-text)]">{lastSale.orderDate}</span>.
              </p>
            </div>

            <div className="w-full bg-[var(--color-app-bg)] rounded-xl p-4 border border-[var(--color-app-border)] flex flex-col gap-3 my-2">
              <div className="flex justify-between items-center pb-2 border-b border-dashed border-[var(--color-app-border)]">
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Subtotal</span>
                <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(lastSale.subtotal)}</span>
              </div>
              {lastSale.discountAmount > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-dashed border-[var(--color-app-border)]">
                  <span className="text-xs font-semibold text-[var(--color-app-warning)] uppercase tracking-wider">Discount</span>
                  <span className="font-mono text-sm font-semibold text-[var(--color-app-warning)]">-{formatCurrency(lastSale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-dashed border-[var(--color-app-border)]">
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Total</span>
                <span className="font-mono text-xl font-bold text-[var(--color-app-text)]">{formatCurrency(lastSale.finalTotal)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Net Profit</span>
                <span className="font-mono text-xl font-bold text-[var(--color-app-success)]">+{formatCurrency(lastSale.finalProfit)}</span>
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
              <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-3">1. Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Customer"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  options={mockCustomers.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))}
                  placeholder="Select a customer..."
                  required
                  selectClassName="h-11"
                />
                <DatePicker
                  label="Order Date"
                  value={orderDate}
                  onChange={(iso) => setOrderDate(iso)}
                  required
                  className="h-11"
                />
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
                    <Select
                      label="Product"
                      value={item.productId}
                      onChange={e => updateCartItem(item.id, "productId", e.target.value)}
                      options={mockProducts.map(p => ({ value: p.id, label: p.name }))}
                      placeholder="Select a product..."
                      required
                      className="pr-8"
                      selectClassName="h-11"
                    />

                    {item.product && (
                      <div className="bg-[var(--color-app-elevated)] p-4 rounded-xl border border-[var(--color-app-border)] flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)] tracking-wider">Unit Cost Price</span>
                          <span className="font-mono text-lg font-semibold text-[var(--color-app-text)]">{formatCurrency(item.product.cost_price)}</span>
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

            {/* Discount Card */}
            <Card padding="lg" className="flex flex-col gap-4 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-3">3. Apply Discount (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Discount Type"
                  value={discountType}
                  onChange={e => { setDiscountType(e.target.value); setDiscountValue(""); }}
                  options={[
                    { value: "none", label: "No Discount" },
                    { value: "fixed", label: "Fixed Amount" },
                    { value: "percentage", label: "Percentage (%)" }
                  ]}
                  placeholder=""
                  selectClassName="h-11"
                />
                {discountType !== "none" && (
                  <div className="flex flex-col gap-1.5">
                    <Input 
                      type="number" 
                      min="0"
                      step={discountType === "percentage" ? "1" : "0.01"}
                      max={discountType === "percentage" ? "100" : undefined}
                      label={discountType === "percentage" ? "Percentage Off (%)" : "Amount Off (EGP)"} 
                      value={discountValue} 
                      onChange={e => setDiscountValue(e.target.value)} 
                    />
                  </div>
                )}
              </div>
            </Card>

          </form>
        </div>

        {/* Right Column: Live Receipt */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 flex flex-col gap-4">
            <Card padding="lg" className="flex flex-col gap-6 bg-[var(--color-app-bg)] border-[var(--color-app-border)] border-t-4 border-t-[var(--color-app-accent)] shadow-xl shadow-black/10">
              <h3 className="text-sm font-bold text-[var(--color-app-text)] text-center tracking-widest uppercase mb-2">Live Receipt</h3>
              
              <div className="flex justify-between items-center pb-4 border-b border-dashed border-[var(--color-app-border)]">
                <span className="text-sm text-[var(--color-app-text-muted)]">Subtotal ({totalItemsCount} items)</span>
                <span className="font-mono text-[var(--color-app-text)] font-semibold">{formatCurrency(totalRevenue)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between items-center pb-4 border-b border-dashed border-[var(--color-app-border)]">
                  <span className="text-sm text-[var(--color-app-warning)]">Discount</span>
                  <span className="font-mono text-[var(--color-app-warning)] font-semibold">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-4 border-b border-dashed border-[var(--color-app-border)]">
                <span className="text-sm text-[var(--color-app-text-muted)]">Total Cost</span>
                <span className="font-mono text-[var(--color-app-text-subtle)]">-{formatCurrency(totalCost)}</span>
              </div>
              
              <div className="flex flex-col pt-2 gap-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs uppercase font-bold text-[var(--color-app-text-subtle)] tracking-wider">
                    {discountAmount > 0 ? "Final Profit" : "Net Profit"}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded">{finalMargin}% Margin</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(finalProfit)}</span>
                </div>
                {discountAmount > 0 && (
                  <span className="text-right text-xs text-[var(--color-app-text-muted)] mt-1">
                    (was {formatCurrency(preDiscountProfit)} before discount)
                  </span>
                )}
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
