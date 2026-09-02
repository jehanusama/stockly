import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, DatePicker, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { formatCurrency } from "@/utils/currency";

// Helpers 
function toISO(d) { return d.toISOString().slice(0, 10); }

function getPresetRange(preset) {
  const now = new Date();
  if (preset === "all") return { from: "", to: "" };
  if (preset === "30d") {
    const from = new Date(now); from.setDate(now.getDate() - 29);
    return { from: toISO(from), to: toISO(now) };
  }
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISO(from), to: toISO(now) };
  }
  return { from: "", to: "" };
}

function getInitials(name = "") {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] ?? "?").toUpperCase();
}

// CSV export 
function exportCSV(rows, filename) {
  const header = "Date,Customer,Product,Qty,Sale Price,Total,Profit\n";
  const body = rows.map(r =>
    `${r.date},${r.customerName},${r.productName},${r.quantity},${r.sale_price},${r.total_price},${r.profit}`
  ).join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Proportional Bar 
function ProfitBar({ label, value, maxValue, rank }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs font-mono text-[var(--color-app-text-muted)] w-4 text-right shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-[var(--color-app-text)] truncate pr-2">{label}</span>
          <span className="font-mono text-sm font-bold text-[var(--color-app-success)] shrink-0">+{formatCurrency(value)}</span>
        </div>
        <div className="h-1.5 bg-[var(--color-app-elevated)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-app-success)] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Customer Leaderboard Row 
function CustomerRow({ rank, name, orders, spend, profit, marginPct }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[var(--color-app-border)] last:border-0 group">
      {/* Rank */}
      <div className="w-6 text-center shrink-0">
        {medal
          ? <span className="text-base">{medal}</span>
          : <span className="text-xs font-mono text-[var(--color-app-text-muted)]">{rank}</span>
        }
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white text-xs font-bold shrink-0">
        {getInitials(name)}
      </div>

      {/* Name + orders */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[var(--color-app-text)] block truncate">{name}</span>
        <span className="text-xs text-[var(--color-app-text-muted)]">{orders} order{orders !== 1 ? "s" : ""} · {formatCurrency(spend)} spent</span>
      </div>

      {/* Profit */}
      <div className="flex flex-col items-end shrink-0">
        <span className="font-mono font-bold text-[var(--color-app-success)]">+{formatCurrency(profit)}</span>
        <span className="text-[10px] font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded-full">{marginPct}% mgn</span>
      </div>
    </div>
  );
}

//  Main Component  
export default function ProfitReport() {
  const navigate = useNavigate();
  const { orders: mockOrders, products: mockProducts, customers: mockCustomers, categories, isLoading, error, refreshData } = useAppData();

  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const { from, to } = isCustom
    ? { from: customFrom, to: customTo }
    : getPresetRange(preset);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    return mockOrders.filter(order => {
      const d = new Date(order.order_date);
      if (from && d < new Date(from)) return false;
      if (to && d > new Date(to + "T23:59:59Z")) return false;
      return true;
    });
  }, [mockOrders, from, to]);

  // By-Product aggregation (proportional profit tracking)
  const byProduct = useMemo(() => {
    const map = {};
    filteredOrders.forEach(order => {
      const orderDiscount = order.discount_type !== "none" ? order.subtotal - order.final_total : 0;
      
      order.items.forEach(item => {
        if (!map[item.product_id]) map[item.product_id] = { profit: 0, revenue: 0, qty: 0 };
        
        const proportion = order.subtotal > 0 ? (item.line_total / order.subtotal) : 0;
        const itemDiscount = orderDiscount * proportion;
        
        const effectiveRevenue = item.line_total - itemDiscount;
        const effectiveProfit = item.line_profit - itemDiscount;
        
        map[item.product_id].profit += effectiveProfit;
        map[item.product_id].revenue += effectiveRevenue;
        map[item.product_id].qty += item.quantity;
      });
    });
    return Object.entries(map)
      .map(([id, v]) => {
        const product = mockProducts.find(p => p.id === id);
        return { id, name: product?.name ?? "Unknown", ...v };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [filteredOrders, mockProducts]);

  // By-Customer aggregation
  const byCustomer = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      if (!map[o.customer_id]) map[o.customer_id] = { profit: 0, spend: 0, orders: 0 };
      map[o.customer_id].profit += o.final_profit;
      map[o.customer_id].spend += o.final_total;
      map[o.customer_id].orders += 1;
    });
    return Object.entries(map)
      .map(([id, v]) => {
        const customer = mockCustomers.find(c => c.id === id);
        const marginPct = v.spend > 0 ? ((v.profit / v.spend) * 100).toFixed(0) : "0";
        return { id, name: customer?.name ?? "Unknown", marginPct, ...v };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [filteredOrders, mockCustomers]);

  // By-Category aggregation
  const byCategory = useMemo(() => {
    const map = {};
    filteredOrders.forEach(order => {
      const orderDiscount = order.discount_type !== "none" ? order.subtotal - order.final_total : 0;
      order.items.forEach(item => {
        const product = mockProducts.find(p => p.id === item.product_id);
        const catId = product?.category_id ?? "__uncategorised__";
        if (!map[catId]) map[catId] = { profit: 0, revenue: 0, qty: 0 };
        const proportion = order.subtotal > 0 ? (item.line_total / order.subtotal) : 0;
        const itemDiscount = orderDiscount * proportion;
        map[catId].profit += item.line_profit - itemDiscount;
        map[catId].revenue += item.line_total - itemDiscount;
        map[catId].qty += item.quantity;
      });
    });
    return Object.entries(map)
      .map(([id, v]) => {
        const cat = id === "__uncategorised__" ? { name: "Uncategorised" } : categories.find(c => c.id === id);
        return { id, name: cat?.name ?? "Unknown", ...v };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [filteredOrders, mockProducts, categories]);

  // CSV rows (flatten items)
  const csvRows = useMemo(() => filteredOrders.flatMap(o => 
    o.items.map(item => ({
      order_id: o.id,
      date: new Date(o.order_date).toLocaleDateString("en-GB"),
      customerName: mockCustomers.find(c => c.id === o.customer_id)?.name ?? "—",
      productName: mockProducts.find(p => p.id === item.product_id)?.name ?? "—",
      quantity: item.quantity,
      sale_price: item.sale_price,
      line_total: item.line_total,
      line_profit: item.line_profit,
      order_discount_type: o.discount_type,
      order_discount_value: o.discount_value
    }))
  ), [filteredOrders, mockCustomers, mockProducts]);

  if (isLoading) {
    return (
      <PageContainer title="Profit Report" subtitle="Financial analytics and profit breakdown across products, categories, and customers.">
        <LoadingState message="Calculating profit metrics..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Profit Report" subtitle="Financial analytics and profit breakdown across products, categories, and customers.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  const hasData = filteredOrders.length > 0;

  // Hero metrics
  const totalRevenue = filteredOrders.reduce((s, o) => s + o.final_total, 0);
  const totalProfit = filteredOrders.reduce((s, o) => s + o.final_profit, 0);
  const totalCost = totalRevenue - totalProfit;
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const maxProductProfit = byProduct[0]?.profit ?? 0;
  const maxCategoryProfit = byCategory[0]?.profit ?? 0;

  const presetOptions = [
    { key: "all", label: "All Time" },
    { key: "30d", label: "Last 30 Days" },
    { key: "month", label: "This Month" },
  ];

  return (
    <PageContainer title="Profit Report" subtitle="Business performance analytics.">
      <div className="flex flex-col gap-8 pb-12">

        {/* ── Hero Card ── */}
        <Card padding="lg" className="relative overflow-hidden bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
          {/* Decorative glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-[var(--color-app-success)] opacity-[0.04] rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">

            {/* Left: hero number */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">Net Profit</span>
                {hasData && (
                  <span className="text-xs font-mono text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-2 py-0.5 rounded-full">{overallMargin}% margin</span>
                )}
              </div>
              <span className="text-5xl sm:text-6xl font-mono font-black text-[var(--color-app-success)] tracking-tight leading-none">
                {hasData ? `+${formatCurrency(totalProfit)}` : formatCurrency(0)}
              </span>

              {/* Secondary metrics */}
              {hasData && (
                <div className="flex items-center gap-6 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">Revenue</span>
                    <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">Cost</span>
                    <span className="font-mono text-sm font-semibold text-[var(--color-app-text-subtle)]">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">Transactions</span>
                    <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{filteredOrders.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: date controls + export */}
            <div className="flex flex-col gap-3 sm:items-end">
              {/* Preset chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {presetOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setPreset(opt.key); setIsCustom(false); }}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                      !isCustom && preset === opt.key
                        ? "bg-[var(--color-app-accent)] text-white"
                        : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustom(true)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    isCustom
                      ? "bg-[var(--color-app-accent)] text-white"
                      : "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
                  ].join(" ")}
                >
                  Custom
                </button>
              </div>

              {/* Custom date inputs */}
              {isCustom && (
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={customFrom}
                    onChange={(iso) => setCustomFrom(iso)}
                    placeholder="From date"
                    maxDate={customTo || undefined}
                  />
                  <span className="text-xs text-[var(--color-app-text-muted)]">to</span>
                  <DatePicker
                    value={customTo}
                    onChange={(iso) => setCustomTo(iso)}
                    placeholder="To date"
                    minDate={customFrom || undefined}
                  />
                </div>
              )}

              {/* CSV Export — quiet utility */}
              <button
                onClick={() => exportCSV(csvRows, `profit-report-${toISO(new Date())}.csv`)}
                disabled={!hasData}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] disabled:opacity-30 transition-colors"
                title="Export as CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </Card>

        {/* ── Empty State ── */}
        {!hasData && (
          <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center border-dashed bg-[var(--color-app-bg)] border-[var(--color-app-border)] shadow-none">
            <div className="w-14 h-14 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center mb-4 border border-[var(--color-app-border)] text-[var(--color-app-text-muted)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-app-text)] mb-2">No sales in this period</h3>
            <p className="text-sm text-[var(--color-app-text-muted)] max-w-sm mb-6">
              There are no recorded transactions for the selected date range. Try selecting "All Time" or record a new sale.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setPreset("all"); setIsCustom(false); }}>View All Time</Button>
              <Button variant="primary" onClick={() => navigate("/new-sale")}>Record a Sale</Button>
            </div>
          </Card>
        )}

        {/* ── Analytics Grid ── */}
        {hasData && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* By-Product: Ranked Bar List */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex items-end justify-between px-1">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-app-text)] tracking-tight">What Sells</h2>
                    <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">Profit contribution by product</p>
                  </div>
                  <span className="text-xs font-mono text-[var(--color-app-text-muted)]">{byProduct.length} products</span>
                </div>
                <Card padding="lg" className="bg-[var(--color-app-panel)] border-[var(--color-app-border)] flex flex-col gap-5">
                  {byProduct.map((item, i) => (
                    <ProfitBar
                      key={item.id}
                      rank={i + 1}
                      label={item.name}
                      value={item.profit}
                      maxValue={maxProductProfit}
                    />
                  ))}
                </Card>
              </div>

              {/* By-Customer: Leaderboard */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="flex items-end justify-between px-1">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-app-text)] tracking-tight">Who Buys</h2>
                    <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">Customer ranking by profit generated</p>
                  </div>
                  <span className="text-xs font-mono text-[var(--color-app-text-muted)]">{byCustomer.length} customers</span>
                </div>
                <Card padding="none" className="bg-[var(--color-app-panel)] border-[var(--color-app-border)] overflow-hidden">
                  {/* Podium header for top customer */}
                  <div className="px-5 py-4 bg-gradient-to-r from-[var(--color-app-success)]/[0.07] to-transparent border-b border-[var(--color-app-border)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-app-success)]">Top Customer</span>
                    <p className="font-semibold text-[var(--color-app-text)] mt-0.5">{byCustomer[0]?.name ?? "—"}</p>
                  </div>
                  <div className="px-5 divide-y divide-[var(--color-app-border)]">
                    {byCustomer.map((c, i) => (
                      <CustomerRow
                        key={c.id}
                        rank={i + 1}
                        name={c.name}
                        orders={c.orders}
                        spend={c.spend}
                        profit={c.profit}
                        marginPct={c.marginPct}
                      />
                    ))}
                  </div>
                </Card>
              </div>

            </div>

            {/* By-Category: Bar List — full width */}
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between px-1">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-app-text)] tracking-tight">By Category</h2>
                  <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">Which product categories generate the most profit</p>
                </div>
                <span className="text-xs font-mono text-[var(--color-app-text-muted)]">{byCategory.length} categories</span>
              </div>
              <Card padding="lg" className="bg-[var(--color-app-panel)] border-[var(--color-app-border)] flex flex-col gap-5">
                {byCategory.map((item, i) => (
                  <ProfitBar
                    key={item.id}
                    rank={i + 1}
                    label={item.name}
                    value={item.profit}
                    maxValue={maxCategoryProfit}
                  />
                ))}
              </Card>
            </div>

          </div>
        )}

      </div>
    </PageContainer>
  );
}

