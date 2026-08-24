import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Modal } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatCurrency } from "@/utils/currency";
import { mockOrders as initialOrders } from "@/data/mockOrders";
import { mockCustomers } from "@/data/mockCustomers";
import { mockProducts } from "@/data/mockProducts";

// ── Helpers ──────────────────────────────────────────────────────
function toISODate(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate) {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });
}

function prevDay(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextDay(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Compact Calendar ─────────────────────────────────────────────
function MiniCalendar({ selectedDate, activeDates, onSelect }) {
  const [viewYear, setViewYear] = useState(() => new Date(selectedDate + "T12:00:00").getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate + "T12:00:00").getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span className="text-sm font-semibold text-[var(--color-app-text)]">{monthName}</span>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      {/* Day Headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-[10px] font-semibold text-[var(--color-app-text-muted)] text-center py-1 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Day Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isoDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = isoDate === selectedDate;
          const hasActivity = activeDates.has(isoDate);
          const today = new Date().toISOString().slice(0, 10);
          const isToday = isoDate === today;

          return (
            <button
              key={isoDate}
              onClick={() => onSelect(isoDate)}
              style={{ aspectRatio: "1", width: "100%" }}
              className={[
                "relative flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-100",
                isSelected
                  ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                  : isToday
                  ? "border border-[var(--color-app-accent)] text-[var(--color-app-accent)]"
                  : "text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
              ].join(" ")}
            >
              {day}
              {/* Activity dot */}
              {hasActivity && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-app-accent)]" />
              )}
              {hasActivity && isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Reassign Modal ───────────────────────────────────────────────
function ReassignModal({ isOpen, onClose, targetDate, allOrders, onReassign }) {
  const [query, setQuery] = useState("");

  const enriched = allOrders
    .filter(o => toISODate(o.order_date) !== targetDate)
    .map(o => {
      const customer = mockCustomers.find(c => c.id === o.customer_id);
      let itemsSummary = "—";
      if (o.items.length > 0) {
        const firstProduct = mockProducts.find(p => p.id === o.items[0].product_id);
        itemsSummary = firstProduct?.name ?? "Unknown";
        if (o.items.length > 1) {
          itemsSummary += ` (+${o.items.length - 1} more)`;
        }
      }
      return { ...o, customerName: customer?.name ?? "—", itemsSummary };
    })
    .filter(o => {
      const q = query.toLowerCase();
      return !q || o.customerName.toLowerCase().includes(q) || o.itemsSummary.toLowerCase().includes(q) ||
             toISODate(o.order_date).includes(q);
    });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move Order to ${formatDisplayDate(targetDate)}`}>
      <div className="flex flex-col gap-5">
        <p className="text-sm text-[var(--color-app-text-muted)]">
          Select an order from any other date to reassign it to <strong className="text-[var(--color-app-text)]">{formatDisplayDate(targetDate)}</strong>.
        </p>

        <input
          type="text"
          placeholder="Search by customer or product…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="h-10 w-full bg-[var(--color-app-bg)] border border-[var(--color-app-border)] rounded-lg px-3 text-sm text-[var(--color-app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-app-border-focus)]"
        />

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          {enriched.length === 0 ? (
            <p className="text-sm text-center text-[var(--color-app-text-muted)] py-6 italic">No orders found.</p>
          ) : (
            enriched.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-4 p-3 bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] rounded-xl hover:border-[var(--color-app-accent)]/40 transition-colors">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-app-text)] truncate">{order.customerName}</span>
                  <span className="text-xs text-[var(--color-app-text-subtle)] truncate">{order.itemsSummary} · {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
                  <span className="text-[10px] font-mono text-[var(--color-app-text-muted)]">{toISODate(order.order_date)}</span>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(order.final_total)}</span>
                  <Button variant="primary" className="text-xs h-7 px-3" onClick={() => { onReassign(order.id); onClose(); }}>
                    Move here
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-[var(--color-app-border)] flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function SalesByDay() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  // Default to most recent order date if available
  const latestOrderDate = initialOrders.length > 0
    ? toISODate(initialOrders.reduce((a, b) => new Date(a.order_date) > new Date(b.order_date) ? a : b).order_date)
    : today;

  const [selectedDate, setSelectedDate] = useState(latestOrderDate);
  const [orders, setOrders] = useState(initialOrders);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  // Build the set of active (order-having) dates for the calendar dots
  const activeDates = new Set(orders.map(o => toISODate(o.order_date)));

  // Orders for the selected day
  const dayOrders = orders
    .filter(o => toISODate(o.order_date) === selectedDate)
    .map(o => {
      const customer = mockCustomers.find(c => c.id === o.customer_id);
      return { ...o, customerName: customer?.name ?? "—" };
    })
    .sort((a, b) => a.customer_id.localeCompare(b.customer_id));

  // Group by customer
  const byCustomer = dayOrders.reduce((acc, order) => {
    if (!acc[order.customer_id]) {
      acc[order.customer_id] = { customerName: order.customerName, orders: [] };
    }
    acc[order.customer_id].orders.push(order);
    return acc;
  }, {});

  // Day totals
  const dayRevenue = dayOrders.reduce((s, r) => s + r.final_total, 0);
  const dayProfit = dayOrders.reduce((s, r) => s + r.final_profit, 0);
  const dayOrdersCount = dayOrders.length;

  const handleReassign = (orderId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, order_date: selectedDate + "T12:00:00Z" }
        : o
    ));
  };

  return (
    <PageContainer
      title="Sales by Day"
      subtitle="Review and manage all transactions for a specific day."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">

        {/* ── Left: Calendar Column ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 flex flex-col gap-4">
            <Card padding="lg" className="bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
              <MiniCalendar
                selectedDate={selectedDate}
                activeDates={activeDates}
                onSelect={setSelectedDate}
              />
            </Card>

            {/* Prev/Next Day Nav */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2 text-sm"
                onClick={() => setSelectedDate(prevDay(selectedDate))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Prev Day
              </Button>
              <Button
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2 text-sm"
                onClick={() => setSelectedDate(today)}
              >
                Today
              </Button>
              <Button
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2 text-sm"
                onClick={() => setSelectedDate(nextDay(selectedDate))}
              >
                Next Day
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </Button>
            </div>

            <p className="text-xs text-center text-[var(--color-app-text-muted)]">
              Days with a <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-app-accent)] mx-0.5 translate-y-px"></span> dot have recorded sales.
            </p>
          </div>
        </div>

        {/* ── Right: Day Detail Column ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Day Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-app-text)] tracking-tight">
                {formatDisplayDate(selectedDate)}
              </h2>
              {dayOrdersCount > 0 && (
                <p className="text-sm text-[var(--color-app-text-muted)] mt-0.5">
                  {dayOrdersCount} transaction{dayOrdersCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              className="flex items-center gap-2 text-sm shrink-0"
              onClick={() => setIsReassignOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              Assign Sale to This Day
            </Button>
          </div>

          {/* Day Summary Strip */}
          {dayOrdersCount > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Revenue", value: formatCurrency(dayRevenue), highlight: false },
                { label: "Net Profit", value: `+${formatCurrency(dayProfit)}`, highlight: true },
                { label: "Orders Made", value: dayOrdersCount.toString(), highlight: false },
              ].map(({ label, value, highlight }) => (
                <Card key={label} padding="md" className="flex flex-col bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">{label}</span>
                  <span className={[
                    "font-mono text-xl font-bold tracking-tight",
                    highlight ? "text-[var(--color-app-success)]" : "text-[var(--color-app-text)]"
                  ].join(" ")}>
                    {value}
                  </span>
                </Card>
              ))}
            </div>
          )}

          {/* Orders Feed */}
          {dayOrdersCount === 0 ? (
            <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center border-dashed bg-[var(--color-app-bg)] border-[var(--color-app-border)] shadow-none">
              <div className="w-14 h-14 rounded-full bg-[var(--color-app-elevated)] flex items-center justify-center mb-4 border border-[var(--color-app-border)] text-[var(--color-app-text-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-app-text)] mb-2">No orders on this day</h3>
              <p className="text-sm text-[var(--color-app-text-muted)] max-w-sm mb-6">
                No transactions were recorded for this date. You can record a new order or move an existing order to this day.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setIsReassignOpen(true)}>Move an Order Here</Button>
                <Button variant="primary" onClick={() => navigate("/new-sale")}>Record New Order</Button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              {Object.entries(byCustomer).map(([customerId, { customerName, orders: custOrders }]) => {
                const custRevenue = custOrders.reduce((s, r) => s + r.final_total, 0);
                const custProfit = custOrders.reduce((s, r) => s + r.final_profit, 0);
                const initials = customerName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

                return (
                  <Card key={customerId} padding="none" className="overflow-hidden bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                    {/* Customer Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-app-accent)] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--color-app-text)]">{customerName}</span>
                          <p className="text-xs text-[var(--color-app-text-muted)]">{custOrders.length} order{custOrders.length !== 1 ? "s" : ""} placed</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(custRevenue)}</span>
                        <span className="font-mono text-xs font-bold text-[var(--color-app-success)]">+{formatCurrency(custProfit)}</span>
                      </div>
                    </div>

                    {/* Nested Orders */}
                    <div className="flex flex-col divide-y divide-[var(--color-app-border)]">
                      {custOrders.map(order => {
                        const marginPct = order.final_total > 0 ? ((order.final_profit / order.final_total) * 100).toFixed(0) : 0;
                        const discountAmount = order.discount_type === "none" ? 0 : order.subtotal - order.final_total;
                        
                        return (
                          <div key={order.id} className="flex flex-col px-5 py-3.5 gap-2 hover:bg-[var(--color-app-panel-hover)] transition-colors">
                            {order.items.map((item, idx) => {
                              const product = mockProducts.find(p => p.id === item.product_id);
                              return (
                                <div key={idx} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-app-border)] shrink-0 ml-1" />
                                    <div className="min-w-0">
                                      <span className="text-sm font-medium text-[var(--color-app-text)] truncate block">{product?.name || "Unknown Product"}</span>
                                      <span className="text-xs text-[var(--color-app-text-subtle)]">
                                        {item.quantity} × {formatCurrency(item.sale_price)}/unit
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                    <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(item.line_total)}</span>
                                  </div>
                                </div>
                              );
                            })}

                            {discountAmount > 0 && (
                              <div className="flex items-center justify-between gap-4 pt-2 mt-1 border-t border-dashed border-[var(--color-app-border)]">
                                <span className="text-xs font-medium text-[var(--color-app-warning)] uppercase tracking-wider pl-6">Order Discount</span>
                                <span className="font-mono text-xs font-semibold text-[var(--color-app-warning)]">-{formatCurrency(discountAmount)}</span>
                              </div>
                            )}

                            {/* Financials (Order level) */}
                            <div className="flex items-center justify-end gap-6 shrink-0 pt-2 mt-1 border-t border-[var(--color-app-border)]">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(order.final_total)}</span>
                                <span className="text-[10px] text-[var(--color-app-text-muted)]">order total</span>
                              </div>
                              <div className="flex flex-col items-end min-w-[60px]">
                                <span className="font-mono text-sm font-bold text-[var(--color-app-success)]">+{formatCurrency(order.final_profit)}</span>
                                <span className="text-[10px] font-mono text-[var(--color-app-success)] bg-[var(--color-app-success)]/10 px-1.5 rounded-full">{marginPct}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ReassignModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        targetDate={selectedDate}
        allOrders={orders}
        onReassign={handleReassign}
      />
    </PageContainer>
  );
}
