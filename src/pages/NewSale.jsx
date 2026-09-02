import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Input, StockBar, Select, DatePicker, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";


function StockBadge({ quantity, unit }) {
  const isOut = quantity <= 0;
  const isLow = quantity > 0 && quantity < 10;
  const label = isOut ? "Out of stock" : `${quantity} ${unit}`;
  const style = isOut
    ? "bg-[var(--color-app-danger)]/10 text-[var(--color-app-danger)] border-[var(--color-app-danger)]/30"
    : isLow
    ? "bg-[var(--color-app-warning)]/10 text-[var(--color-app-warning)] border-[var(--color-app-warning)]/30"
    : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] border-[var(--color-app-border)]";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold font-mono shrink-0 ${style}`}>
      {isLow && !isOut && (
        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      )}
      {label}
    </span>
  );
}


function BatchPicker({ categories, products, onAddToCart }) {
  const [pickedCategoryId, setPickedCategoryId] = useState("");
  // { [productId]: { checked, quantity, customPrice } }
  const [selections, setSelections] = useState({});

  const categoryProducts = useMemo(
    () => (pickedCategoryId ? products.filter(p => p.category_id === pickedCategoryId) : []),
    [pickedCategoryId, products]
  );

  const handleCategoryChange = (catId) => {
    setPickedCategoryId(catId);
    setSelections({});
  };

  const toggleProduct = (product) => {
    setSelections(prev => {
      if (prev[product.id]?.checked) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return {
        ...prev,
        [product.id]: {
          checked: true,
          quantity: "1",
          customPrice: (product.cost_price * 1.2).toFixed(2),
        },
      };
    });
  };

  const updateSelection = (productId, field, value) => {
    setSelections(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const checkedProducts = categoryProducts.filter(p => selections[p.id]?.checked);

  const canAdd = checkedProducts.length > 0 && checkedProducts.every(p => {
    const s = selections[p.id];
    const qty = parseFloat(s.quantity) || 0;
    return qty > 0 && qty <= p.stock_quantity && parseFloat(s.customPrice) >= 0;
  });

  const handleAddToCart = () => {
    const newItems = checkedProducts.map(p => ({
      id: crypto.randomUUID(),
      productId: p.id,
      quantity: selections[p.id].quantity,
      customPrice: selections[p.id].customPrice,
    }));
    onAddToCart(newItems);
    setPickedCategoryId("");
    setSelections({});
  };

  return (
    <Card padding="lg" className="flex flex-col gap-5 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
      <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-3">
        2. Add Products
      </h3>

      {/* Step 1: Category */}
      <Select
        label="Category"
        value={pickedCategoryId}
        onChange={e => handleCategoryChange(e.target.value)}
        options={categories.map(c => ({ value: c.id, label: c.name }))}
        placeholder="Select a category..."
        selectClassName="h-11"
      />

      {/* Step 2: Product checkbox list */}
      {pickedCategoryId && (
        <div className="flex flex-col gap-3">
          {categoryProducts.length === 0 ? (
            <p className="text-sm text-[var(--color-app-text-muted)] italic py-4 text-center">
              No products in this category yet.
            </p>
          ) : (
            <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--color-app-border)]">
              {categoryProducts.map((product, idx) => {
                const sel = selections[product.id];
                const isChecked = !!sel?.checked;
                const qty = parseFloat(sel?.quantity) || 0;
                const isStockOk = qty <= product.stock_quantity;
                const isOutOfStock = product.stock_quantity <= 0;

                return (
                  <div
                    key={product.id}
                    className={[
                      "flex flex-col transition-all duration-200",
                      idx > 0 ? "border-t border-[var(--color-app-border)]" : "",
                      isChecked ? "bg-[var(--color-app-accent)]/[0.04]" : "bg-[var(--color-app-bg)]",
                    ].join(" ")}
                    style={{ borderLeft: isChecked ? "3px solid var(--color-app-accent)" : "3px solid transparent" }}
                  >
                    {/* Clickable product row */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => !isOutOfStock && toggleProduct(product)}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                        isOutOfStock
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-[var(--color-app-elevated)] cursor-pointer",
                      ].join(" ")}
                    >
                      {/* Custom checkbox */}
                      <span className={[
                        "w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                        isChecked
                          ? "bg-[var(--color-app-accent)] border-[var(--color-app-accent)]"
                          : "border-[var(--color-app-border)] bg-transparent",
                      ].join(" ")}>
                        {isChecked && (
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <polyline points="1.5,5.5 4,8 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>

                      {/* Name + pricing hint */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-app-text)] truncate leading-snug">
                          {product.name}
                        </p>
                        <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">
                          Cost {formatCurrency(product.cost_price)}
                          <span className="mx-1.5 opacity-30">·</span>
                          Sale ~{formatCurrency(product.cost_price * 1.2)}
                        </p>
                      </div>

                      {/* Stock badge */}
                      <StockBadge quantity={product.stock_quantity} unit={product.unit} />
                    </button>

                    {/* Expanded qty + price inputs */}
                    {isChecked && (
                      <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3 border-t border-dashed border-[var(--color-app-border)]/60">
                        <div className="flex flex-col gap-1">
                          <Input
                            label={`Qty (${product.unit})`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={sel.quantity}
                            onChange={e => updateSelection(product.id, "quantity", e.target.value)}
                            required
                          />
                          {!isStockOk && qty > 0 && (
                            <span className="text-[11px] text-[var(--color-app-danger)] flex items-center gap-1 font-medium">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                              </svg>
                              Max {product.stock_quantity} {product.unit}
                            </span>
                          )}
                        </div>
                        <Input
                          label="Sale price / unit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={sel.customPrice}
                          onChange={e => updateSelection(product.id, "customPrice", e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {checkedProducts.length > 0 && (
            <Button type="button" variant="primary" disabled={!canAdd} onClick={handleAddToCart} className="w-full">
              ＋ Add {checkedProducts.length} product{checkedProducts.length > 1 ? "s" : ""} to cart
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}




export default function NewSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { customers: mockCustomers, products: mockProducts, categories, addOrder, isLoading, error, refreshData } = useAppData();

  const [customerId, setCustomerId] = useState(() => {
    const urlId = searchParams.get("customer_id") ?? "";
    return mockCustomers.some(c => c.id === urlId) ? urlId : "";
  });
  const [orderDate, setOrderDate] = useState(() => {
    const urlDate = searchParams.get("date");
    if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
    return new Date().toISOString().slice(0, 10);
  });

  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedCustomer = mockCustomers.find(c => c.id === customerId);

 
  const addBatchToCart = (newItems) => {
    setCart(prev => [...prev, ...newItems]);
  };

  const removeCartItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartItem = (id, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };


  const processedCart = cart.map(item => {
    const product = mockProducts.find(p => p.id === item.productId);
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.customPrice) || 0;
    const hasEnoughStock = product ? qty <= product.stock_quantity : false;
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
    processedCart.every(item => item.product && item.qty > 0 && item.price >= 0 && item.hasEnoughStock);

  const preDiscountProfit = totalRevenue - totalCost;

  const discountAmount = useMemo(() => {
    if (discountType === "none" || !discountValue) return 0;
    const val = parseFloat(discountValue) || 0;
    if (discountType === "fixed") return Math.min(val, totalRevenue);
    if (discountType === "percentage") return totalRevenue * Math.min(val / 100, 1);
    return 0;
  }, [discountType, discountValue, totalRevenue]);

  const finalTotal = totalRevenue - discountAmount;
  const finalProfit = finalTotal - totalCost;
  const finalMargin = finalTotal > 0 ? ((finalProfit / finalTotal) * 100).toFixed(0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmitError("");

    const newOrder = {
      customer_id: customerId,
      order_date: orderDate.includes("T") ? orderDate : `${orderDate}T12:00:00Z`,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      subtotal: totalRevenue,
      final_total: finalTotal,
      final_profit: finalProfit,
      items: processedCart.map(item => ({
        product_id: item.productId,
        quantity: item.qty,
        sale_price: item.price,
        line_total: item.qty * item.price,
        line_profit: (item.qty * item.price) - (item.qty * item.product.cost_price),
      })),
    };

    const res = await addOrder(newOrder);
    setIsSubmitting(false);

    if (res && !res.success) {
      setSubmitError(res.error || "Failed to record sale.");
      return;
    }

    setLastSale({
      orderDate,
      customer: selectedCustomer,
      items: processedCart,
      totalItemsCount,
      subtotal: totalRevenue,
      discountAmount,
      finalTotal,
      finalProfit,
    });
    setIsSuccess(true);
  };

  const resetForm = () => {
    setCustomerId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setCart([]);
    setDiscountType("none");
    setDiscountValue("");
    setIsSuccess(false);
    setLastSale(null);
    setSubmitError("");
  };

  if (isLoading) {
    return (
      <PageContainer title="New Sale" subtitle="Record a new transaction for a client.">
        <LoadingState message="Loading catalog & customers..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="New Sale" subtitle="Record a new transaction for a client.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }


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
                You sold{" "}
                <span className="font-semibold text-[var(--color-app-text)]">{lastSale.items.length} product{lastSale.items.length !== 1 ? "s" : ""}</span>{" "}
                to <span className="font-semibold text-[var(--color-app-text)]">{lastSale.customer.name}</span>{" "}
                on <span className="font-semibold text-[var(--color-app-text)]">{lastSale.orderDate}</span>.
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
              <Button variant="secondary" className="flex-1" onClick={() => navigate("/")}>Dashboard</Button>
              <Button variant="primary" className="flex-1" onClick={resetForm}>Record Another Sale</Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }


  return (
    <PageContainer title="New Sale" subtitle="Record a transaction and calculate live profit.">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">

        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <form id="new-sale-form" onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* 1. Order Details */}
            <Card padding="lg" className="flex flex-col gap-6 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-3">
                1. Order Details
              </h3>
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

            {/* 2. Batch Picker */}
            <BatchPicker
              categories={categories}
              products={mockProducts}
              onAddToCart={addBatchToCart}
            />

            {/* 3. Cart Line Items */}
            {processedCart.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider">
                    3. Cart ({processedCart.length} line{processedCart.length !== 1 ? "s" : ""})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                {processedCart.map((item, index) => {
                  const cat = item.product ? categories.find(c => c.id === item.product.category_id) : null;
                  return (
                    <Card
                      key={item.id}
                      padding="lg"
                      className="flex flex-col gap-4 bg-[var(--color-app-panel)] border-[var(--color-app-border)] relative"
                    >
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        className="absolute top-4 right-4 text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-danger)] transition-colors"
                        aria-label="Remove item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>

                      {/* Header */}
                      <div className="flex items-center gap-2 pr-8">
                        <span className="text-xs font-semibold text-[var(--color-app-text-muted)] tracking-wider">#{index + 1}</span>
                        <span className="text-sm font-semibold text-[var(--color-app-text)]">{item.product?.name ?? "Unknown"}</span>
                        {cat && (
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-app-accent)] bg-[var(--color-app-accent)]/10 px-2 py-0.5 rounded-full">
                            {cat.name}
                          </span>
                        )}
                      </div>

                      {/* Stock info */}
                      {item.product && (
                        <div className="bg-[var(--color-app-elevated)] p-3 rounded-xl border border-[var(--color-app-border)] flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)] tracking-wider">Unit Cost Price</span>
                            <span className="font-mono text-base font-semibold text-[var(--color-app-text)]">{formatCurrency(item.product.cost_price)}</span>
                          </div>
                          <div className="flex flex-col sm:w-1/2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] uppercase font-bold text-[var(--color-app-text-muted)] tracking-wider">Available Stock</span>
                              <span className="font-mono text-xs font-semibold text-[var(--color-app-text)]">{item.product.stock_quantity} {item.product.unit}</span>
                            </div>
                            <StockBar current={item.product.stock_quantity} threshold={Math.max(item.product.stock_quantity, 10)} />
                          </div>
                        </div>
                      )}

                      {/* Editable qty + price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            label={`Quantity (${item.product?.unit ?? "unit"})`}
                            value={item.quantity}
                            onChange={e => updateCartItem(item.id, "quantity", e.target.value)}
                            required
                          />
                          {!item.hasEnoughStock && item.product && (
                            <span className="text-xs font-medium text-[var(--color-app-danger)] flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              Only {item.product.stock_quantity} {item.product.unit} available.
                            </span>
                          )}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          label="Sale Price (per unit)"
                          value={item.customPrice}
                          onChange={e => updateCartItem(item.id, "customPrice", e.target.value)}
                          required
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Discount */}
            <Card padding="lg" className="flex flex-col gap-4 bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider border-b border-[var(--color-app-border)] pb-3">
                {processedCart.length > 0 ? "4" : "3"}. Apply Discount (Optional)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Discount Type"
                  value={discountType}
                  onChange={e => { setDiscountType(e.target.value); setDiscountValue(""); }}
                  options={[
                    { value: "none", label: "No Discount" },
                    { value: "fixed", label: "Fixed Amount" },
                    { value: "percentage", label: "Percentage (%)" },
                  ]}
                  placeholder=""
                  selectClassName="h-11"
                />
                {discountType !== "none" && (
                  <Input
                    type="number"
                    min="0"
                    step={discountType === "percentage" ? "1" : "0.01"}
                    max={discountType === "percentage" ? "100" : undefined}
                    label={discountType === "percentage" ? "Percentage Off (%)" : "Amount Off (EGP)"}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                  />
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

              {processedCart.length === 0 ? (
                <p className="text-sm text-[var(--color-app-text-muted)] text-center py-6 italic">
                  Pick a category and add products to see totals.
                </p>
              ) : (
                <>
                  {/* Line items mini-list */}
                  <div className="flex flex-col gap-1 mb-2">
                    {processedCart.map(item => (
                      item.product && (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-[var(--color-app-text-muted)] truncate pr-2">{item.product.name} ×{item.qty}</span>
                          <span className="font-mono text-[var(--color-app-text)] shrink-0">{formatCurrency(item.qty * item.price)}</span>
                        </div>
                      )
                    ))}
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-dashed border-[var(--color-app-border)]">
                    <span className="text-sm text-[var(--color-app-text-muted)]">Subtotal ({processedCart.length} lines)</span>
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
                    <span className="text-3xl font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(finalProfit)}</span>
                    {discountAmount > 0 && (
                      <span className="text-xs text-[var(--color-app-text-muted)] mt-1">
                        (was {formatCurrency(preDiscountProfit)} before discount)
                      </span>
                    )}
                  </div>
                </>
              )}

              {submitError && (
                <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium mb-4">
                  {submitError}
                </div>
              )}

              <div className="mt-4 pt-6 border-t border-[var(--color-app-border)]">
                <Button
                  type="submit"
                  form="new-sale-form"
                  variant="primary"
                  className="w-full h-12 text-base font-semibold"
                  disabled={!isFormValid}
                  loading={isSubmitting}
                >
                  Record Sale
                </Button>
              </div>
            </Card>

            <p className="text-xs text-center text-[var(--color-app-text-muted)] flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Transaction is recorded securely
            </p>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
