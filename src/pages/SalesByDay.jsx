import { useState, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button, Card, Modal, LoadingState, ErrorState, Pagination, Input, DatePicker } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatCurrency } from "@/utils/currency";
import { useAppData } from "@/context/AppContext";

// ── Helpers ──────────────────────────────────────────────────────
function toISODate(dateString) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match && !dateString.includes("Z") && !dateString.includes("+")) {
      return match[1];
    }
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  const [viewYear, setViewYear] = useState(() => new Date(selectedDate + "T12:00:00").getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate + "T12:00:00").getMonth());

  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    const d = new Date(selectedDate + "T12:00:00");
    if (!isNaN(d.getTime())) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }

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
        <button onClick={prevMonth} aria-label="Previous month" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span className="text-sm font-semibold text-[var(--color-app-text)]">{monthName}</span>
        <button onClick={nextMonth} aria-label="Next month" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
          const today = toISODate(new Date());
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
function ReassignModal({ isOpen, onClose, targetDate, allOrders, onReassign, customers, products }) {
  const [query, setQuery] = useState("");
  const [reassigningId, setReassigningId] = useState(null);
  const [reassignError, setReassignError] = useState("");

  const handleClose = () => {
    setQuery("");
    setReassignError("");
    setReassigningId(null);
    onClose();
  };

  const handleMove = async (orderId) => {
    setReassigningId(orderId);
    setReassignError("");
    const res = await onReassign(orderId);
    setReassigningId(null);
    if (res && !res.success) {
      setReassignError(res.error || "Failed to reassign order.");
    } else {
      handleClose();
    }
  };

  const enriched = allOrders
    .filter(o => toISODate(o.order_date) !== targetDate)
    .map(o => {
      const customer = customers.find(c => c.id === o.customer_id);
      const items = o.items || [];
      let itemsSummary = "—";
      if (items.length > 0) {
        const firstProduct = products.find(p => p.id === items[0].product_id);
        itemsSummary = firstProduct?.name ?? "Unknown";
        if (items.length > 1) {
          itemsSummary += ` (+${items.length - 1} more)`;
        }
      }
      return { ...o, customerName: customer?.name ?? "Walk-in Customer", itemsSummary };
    })
    .filter(o => {
      const q = query.toLowerCase();
      return !q || o.customerName.toLowerCase().includes(q) || o.itemsSummary.toLowerCase().includes(q) ||
             toISODate(o.order_date).includes(q);
    });

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Move Order to ${formatDisplayDate(targetDate)}`}>
      <div className="flex flex-col gap-5">
        {reassignError && (
          <div className="p-3 rounded-lg bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] text-sm border border-[var(--color-app-danger)] font-medium">
            {reassignError}
          </div>
        )}

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
            enriched.map(order => {
              const items = order.items || [];
              const itemCount = items.reduce((s, i) => s + (i.quantity || 0), 0);
              return (
                <div key={order.id} className="flex items-center justify-between gap-4 p-3 bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] rounded-xl hover:border-[var(--color-app-accent)]/40 transition-colors">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-[var(--color-app-text)] truncate">{order.customerName}</span>
                    <span className="text-xs text-[var(--color-app-text-subtle)] truncate">{order.itemsSummary} · {itemCount} item(s)</span>
                    <span className="text-[10px] font-mono text-[var(--color-app-text-muted)]">{toISODate(order.order_date)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(order.final_total)}</span>
                    <Button
                      variant="primary"
                      className="text-xs h-7 px-3"
                      loading={reassigningId === order.id}
                      disabled={reassigningId !== null}
                      onClick={() => handleMove(order.id)}
                    >
                      Move here
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-[var(--color-app-border)] flex justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={reassigningId !== null}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function SalesByDay({ defaultTab = "daily" }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toISODate(new Date());

  const {
    orders = [],
    customers: mockCustomers = [],
    products: mockProducts = [],
    categories = [],
    printedSales = [],
    printedItems = [],
    updateOrderDate,
    isLoading,
    error,
    refreshData
  } = useAppData();

  const location = useLocation();
  const isItemSalesRoute = location.pathname.startsWith("/item-sales");

  // Tab & Item state (directly derived from searchParams and route so URL is single source of truth)
  const activeTab = searchParams.get("tab") || (isItemSalesRoute ? "item" : defaultTab);
  const selectedItemId = searchParams.get("itemId") || searchParams.get("productId") || "";

  // Daily View states
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get("date") || today);
  const [dayViewMode, setDayViewMode] = useState("customer"); // "customer" | "item"
  const [dayItemFilter, setDayItemFilter] = useState("");
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Item Sales by Day View states
  const [itemDatePreset, setItemDatePreset] = useState("all"); // "all", "month", "30d", "custom"
  const [itemCustomFrom, setItemCustomFrom] = useState("");
  const [itemCustomTo, setItemCustomTo] = useState("");
  const [buyerQuery, setBuyerQuery] = useState("");

  const handleTabChange = (tab) => {
    if (tab === "item") {
      navigate("/item-sales" + (selectedItemId ? `?itemId=${encodeURIComponent(selectedItemId)}` : ""));
    } else {
      navigate("/sales-by-day" + (selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : ""));
    }
  };

  const handleItemSelect = (itemId) => {
    if (isItemSalesRoute) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (itemId) next.set("itemId", itemId);
        else next.delete("itemId");
        return next;
      }, { replace: true });
    } else {
      navigate("/item-sales" + (itemId ? `?itemId=${encodeURIComponent(itemId)}` : ""));
    }
  };

  // Calendar active dates (combining bags orders and printed sales)
  const activeDates = useMemo(() => {
    const dates = new Set();
    orders.forEach(o => {
      if (o.order_date) dates.add(toISODate(o.order_date));
    });
    (printedSales || []).forEach(s => {
      if (s.sale_date) dates.add(toISODate(s.sale_date));
    });
    return dates;
  }, [orders, printedSales]);

  // All selectable items for "Item Sales by Day"
  const selectableItems = useMemo(() => {
    const list = [];
    (categories || []).forEach(cat => {
      const prods = (mockProducts || []).filter(p => p.category_id === cat.id);
      prods.forEach(p => {
        list.push({
          id: p.id,
          name: p.name,
          categoryName: cat.name,
          unit: p.unit || "pcs",
          stock: p.stock_quantity ?? 0,
          type: "product",
        });
      });
    });

    const uncategorized = (mockProducts || []).filter(p => !p.category_id);
    uncategorized.forEach(p => {
      list.push({
        id: p.id,
        name: p.name,
        categoryName: "Uncategorized",
        unit: p.unit || "pcs",
        stock: p.stock_quantity ?? 0,
        type: "product",
      });
    });

    (printedItems || []).forEach(pi => {
      list.push({
        id: `printed-${pi.id}`,
        rawId: pi.id,
        name: pi.name,
        categoryName: "Printed Items",
        unit: pi.unit || "piece",
        stock: pi.stock_quantity ?? 0,
        type: "printed",
      });
    });

    return list;
  }, [categories, mockProducts, printedItems]);

  const selectedItemObj = useMemo(() => {
    return selectableItems.find(i => i.id === selectedItemId);
  }, [selectableItems, selectedItemId]);

  // ── Daily View Data ──────────────────────────────────────────────
  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setCurrentPage(1);
  };

  const dayOrders = useMemo(() => {
    return orders
      .filter(o => toISODate(o.order_date) === selectedDate)
      .map(o => {
        const customer = mockCustomers.find(c => c.id === o.customer_id);
        return { ...o, customerName: customer?.name ?? "Walk-in Customer", customerPhone: customer?.phone };
      })
      .sort((a, b) => (a.customer_id || "").localeCompare(b.customer_id || ""));
  }, [orders, selectedDate, mockCustomers]);

  const dayPrintedSales = useMemo(() => {
    return (printedSales || [])
      .filter(s => toISODate(s.sale_date) === selectedDate)
      .map(s => {
        const customer = mockCustomers.find(c => c.id === s.customer_id);
        return { ...s, customerName: customer?.name ?? "Walk-in Customer", customerPhone: customer?.phone };
      });
  }, [printedSales, selectedDate, mockCustomers]);

  // Group by customer for selected day
  const byCustomer = useMemo(() => {
    const acc = {};
    dayOrders.forEach(order => {
      const key = order.customer_id || "guest";
      if (!acc[key]) {
        acc[key] = {
          customerId: order.customer_id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          orders: [],
          printedSales: [],
        };
      }
      acc[key].orders.push(order);
    });

    dayPrintedSales.forEach(sale => {
      const key = sale.customer_id || "guest";
      if (!acc[key]) {
        acc[key] = {
          customerId: sale.customer_id,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          orders: [],
          printedSales: [],
        };
      }
      acc[key].printedSales.push(sale);
    });

    return acc;
  }, [dayOrders, dayPrintedSales]);

  // Group by item for selected day
  const byItemForDay = useMemo(() => {
    const itemMap = {};

    dayOrders.forEach(order => {
      (order.items || []).forEach((item, idx) => {
        const prod = mockProducts.find(p => p.id === item.product_id);
        const cat = categories.find(c => c.id === prod?.category_id);
        const key = item.product_id || `unknown-${idx}`;
        if (!itemMap[key]) {
          itemMap[key] = {
            id: key,
            type: "product",
            name: prod?.name || "Unknown Product",
            categoryName: cat?.name || "Uncategorized",
            unit: prod?.unit || "pcs",
            totalQuantity: 0,
            totalRevenue: 0,
            totalProfit: 0,
            buyers: [],
          };
        }
        const qty = Number(item.quantity || 0);
        const rev = Number(item.line_total || 0);
        const prof = Number(item.line_profit || 0);
        itemMap[key].totalQuantity += qty;
        itemMap[key].totalRevenue += rev;
        itemMap[key].totalProfit += prof;
        itemMap[key].buyers.push({
          customerId: order.customer_id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          quantity: qty,
          salePrice: Number(item.sale_price || 0),
          lineTotal: rev,
          lineProfit: prof,
          orderId: order.id,
          orderNotes: order.notes,
        });
      });
    });

    dayPrintedSales.forEach(sale => {
      const pItem = (printedItems || []).find(pi => pi.id === sale.printed_item_id);
      const key = sale.printed_item_id ? `printed-${sale.printed_item_id}` : `printed-${sale.id}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          id: key,
          type: "printed",
          name: sale.item_name || pItem?.name || "Printed Item",
          categoryName: "Printed",
          unit: pItem?.unit || "piece",
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          buyers: [],
        };
      }
      const qty = Number(sale.quantity || 0);
      const rev = Number(sale.line_total || 0);
      const prof = Number(sale.line_profit || 0);
      itemMap[key].totalQuantity += qty;
      itemMap[key].totalRevenue += rev;
      itemMap[key].totalProfit += prof;
      itemMap[key].buyers.push({
        customerId: sale.customer_id,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        quantity: qty,
        salePrice: Number(sale.sale_price || 0),
        lineTotal: rev,
        lineProfit: prof,
        orderId: `printed-${sale.id}`,
        orderNotes: sale.notes,
        isPrinted: true,
      });
    });

    let items = Object.values(itemMap);
    if (dayItemFilter.trim()) {
      const q = dayItemFilter.toLowerCase();
      items = items.filter(it =>
        it.name.toLowerCase().includes(q) ||
        it.categoryName.toLowerCase().includes(q) ||
        it.buyers.some(b => b.customerName.toLowerCase().includes(q))
      );
    }
    return items.sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [dayOrders, dayPrintedSales, mockProducts, categories, printedItems, dayItemFilter]);

  // Day totals
  const dayRevenue = useMemo(() => {
    return dayOrders.reduce((s, r) => s + (r.final_total || 0), 0) +
      dayPrintedSales.reduce((s, r) => s + (r.line_total || 0), 0);
  }, [dayOrders, dayPrintedSales]);

  const dayProfit = useMemo(() => {
    return dayOrders.reduce((s, r) => s + (r.final_profit || 0), 0) +
      dayPrintedSales.reduce((s, r) => s + (r.line_profit || 0), 0);
  }, [dayOrders, dayPrintedSales]);

  const dayOrdersCount = dayOrders.length + dayPrintedSales.length;

  const customerEntries = useMemo(() => {
    let entries = Object.entries(byCustomer);
    if (dayItemFilter.trim()) {
      const q = dayItemFilter.toLowerCase();
      entries = entries.filter(([, data]) => {
        const matchesCustomer = data.customerName.toLowerCase().includes(q);
        const matchesOrder = data.orders.some(o => (o.items || []).some(i => {
          const p = mockProducts.find(pr => pr.id === i.product_id);
          return (p?.name || "").toLowerCase().includes(q);
        }));
        const matchesPrinted = data.printedSales.some(s => (s.item_name || "").toLowerCase().includes(q));
        return matchesCustomer || matchesOrder || matchesPrinted;
      });
    }
    return entries;
  }, [byCustomer, dayItemFilter, mockProducts]);

  const totalPages = Math.max(1, Math.ceil(customerEntries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCustomerEntries = customerEntries.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleReassign = async (orderId) => {
    return await updateOrderDate(orderId, selectedDate + "T12:00:00Z");
  };

  // ── Item Sales by Day View Data ──────────────────────────────────
  const itemDateRange = useMemo(() => {
    const now = new Date();
    if (itemDatePreset === "30d") {
      const from = new Date(now);
      from.setDate(now.getDate() - 29);
      return { from: toISODate(from), to: toISODate(now) };
    }
    if (itemDatePreset === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISODate(from), to: toISODate(now) };
    }
    if (itemDatePreset === "custom") {
      return { from: itemCustomFrom, to: itemCustomTo };
    }
    return { from: "", to: "" };
  }, [itemDatePreset, itemCustomFrom, itemCustomTo]);

  const selectedItemSalesByDay = useMemo(() => {
    if (!selectedItemId) return [];

    const isPrinted = selectedItemId.startsWith("printed-");
    const rawId = isPrinted ? selectedItemId.replace("printed-", "") : selectedItemId;
    const dayMap = {};

    const { from, to } = itemDateRange;

    if (!isPrinted) {
      // Regular products sold in orders
      orders.forEach(order => {
        const d = toISODate(order.order_date);
        if (from && d < from) return;
        if (to && d > to) return;

        (order.items || []).forEach(item => {
          if (item.product_id === rawId) {
            const cust = mockCustomers.find(c => c.id === order.customer_id);
            const custName = cust?.name || "Walk-in Customer";

            if (buyerQuery.trim() && !custName.toLowerCase().includes(buyerQuery.toLowerCase())) {
              return;
            }

            if (!dayMap[d]) {
              dayMap[d] = {
                date: d,
                displayDate: formatDisplayDate(d),
                totalQuantity: 0,
                totalRevenue: 0,
                totalProfit: 0,
                buyers: [],
              };
            }

            const qty = Number(item.quantity || 0);
            const rev = Number(item.line_total || 0);
            const prof = Number(item.line_profit || 0);
            dayMap[d].totalQuantity += qty;
            dayMap[d].totalRevenue += rev;
            dayMap[d].totalProfit += prof;
            dayMap[d].buyers.push({
              customerId: order.customer_id,
              customerName: custName,
              customerPhone: cust?.phone,
              quantity: qty,
              salePrice: Number(item.sale_price || 0),
              lineTotal: rev,
              lineProfit: prof,
              orderId: order.id,
              notes: order.notes,
              isPrinted: false,
            });
          }
        });
      });
    } else {
      // Printed items sold in printedSales
      (printedSales || []).forEach(sale => {
        const d = toISODate(sale.sale_date);
        if (from && d < from) return;
        if (to && d > to) return;

        const matches = sale.printed_item_id === rawId || sale.item_name === selectedItemObj?.name;
        if (matches) {
          const cust = mockCustomers.find(c => c.id === sale.customer_id);
          const custName = cust?.name || "Walk-in Customer";

          if (buyerQuery.trim() && !custName.toLowerCase().includes(buyerQuery.toLowerCase())) {
            return;
          }

          if (!dayMap[d]) {
            dayMap[d] = {
              date: d,
              displayDate: formatDisplayDate(d),
              totalQuantity: 0,
              totalRevenue: 0,
              totalProfit: 0,
              buyers: [],
            };
          }

          const qty = Number(sale.quantity || 0);
          const rev = Number(sale.line_total || 0);
          const prof = Number(sale.line_profit || 0);
          dayMap[d].totalQuantity += qty;
          dayMap[d].totalRevenue += rev;
          dayMap[d].totalProfit += prof;
          dayMap[d].buyers.push({
            customerId: sale.customer_id,
            customerName: custName,
            customerPhone: cust?.phone,
            quantity: qty,
            salePrice: Number(sale.sale_price || 0),
            lineTotal: rev,
            lineProfit: prof,
            orderId: `printed-${sale.id}`,
            notes: sale.notes,
            isPrinted: true,
          });
        }
      });
    }

    return Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedItemId, selectedItemObj, orders, printedSales, mockCustomers, itemDateRange, buyerQuery]);

  // Aggregated KPIs for selected item
  const itemSummary = useMemo(() => {
    let totalQty = 0;
    let totalRev = 0;
    let totalProf = 0;
    const buyerSet = new Set();

    selectedItemSalesByDay.forEach(day => {
      totalQty += day.totalQuantity;
      totalRev += day.totalRevenue;
      totalProf += day.totalProfit;
      day.buyers.forEach(b => {
        buyerSet.add(b.customerId || b.customerName);
      });
    });

    return {
      totalQuantity: totalQty,
      totalRevenue: totalRev,
      totalProfit: totalProf,
      daysCount: selectedItemSalesByDay.length,
      buyersCount: buyerSet.size,
    };
  }, [selectedItemSalesByDay]);

  if (isLoading) {
    return (
      <PageContainer title="Sales by Day" subtitle="Review and track daily transactions and item sales.">
        <LoadingState message="Loading sales data..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Sales by Day" subtitle="Review and track daily transactions and item sales.">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Sales by Day"
      subtitle="Analyze daily revenue, transactions, and see exactly who bought each item on each sale day."
    >
      {/* ── Top Header / Tab Switcher ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-app-border)] pb-4 mb-6">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--color-app-panel)] border border-[var(--color-app-border)]">
          <button
            type="button"
            onClick={() => handleTabChange("daily")}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === "daily"
                ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
            ].join(" ")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Daily Overview</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("item")}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
              activeTab === "item"
                ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
            ].join(" ")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>Item Sales by Day</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
              Who Bought
            </span>
          </button>
        </div>

        {activeTab === "daily" && (
          <Button
            variant="secondary"
            className="flex items-center gap-2 text-sm shrink-0"
            onClick={() => setIsReassignOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            Assign Sale to Day
          </Button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: DAILY OVERVIEW
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "daily" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
          {/* Left: Calendar Column */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 flex flex-col gap-4">
              <Card padding="lg" className="bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                <MiniCalendar
                  selectedDate={selectedDate}
                  activeDates={activeDates}
                  onSelect={handleSelectDate}
                />
              </Card>

              {/* Prev/Next Day Nav */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2 text-sm"
                  onClick={() => handleSelectDate(prevDay(selectedDate))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  Prev Day
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2 text-sm"
                  onClick={() => handleSelectDate(today)}
                >
                  Today
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2 text-sm"
                  onClick={() => handleSelectDate(nextDay(selectedDate))}
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

          {/* Right: Day Detail Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Day Header */}
            <div>
              <h2 className="text-xl font-bold text-[var(--color-app-text)] tracking-tight">
                {formatDisplayDate(selectedDate)}
              </h2>
              {dayOrdersCount > 0 && (
                <p className="text-sm text-[var(--color-app-text-muted)] mt-0.5">
                  {dayOrdersCount} transaction{dayOrdersCount !== 1 ? "s" : ""} recorded
                </p>
              )}
            </div>

            {/* Day Summary Strip */}
            {dayOrdersCount > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Revenue", value: formatCurrency(dayRevenue), highlight: false },
                  { label: "Net Profit", value: `+${formatCurrency(dayProfit)}`, highlight: true },
                  { label: "Transactions", value: dayOrdersCount.toString(), highlight: false },
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

            {/* View Mode Toggle & Search Filter */}
            {dayOrdersCount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl">
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--color-app-bg)] border border-[var(--color-app-border)]">
                  <button
                    type="button"
                    onClick={() => setDayViewMode("customer")}
                    className={[
                      "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                      dayViewMode === "customer"
                        ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                        : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
                    ].join(" ")}
                  >
                    👤 Group by Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayViewMode("item")}
                    className={[
                      "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                      dayViewMode === "item"
                        ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                        : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]",
                    ].join(" ")}
                  >
                      Group by Item (Who Bought)
                  </button>
                </div>

                <div className="flex-1 max-w-xs">
                  <Input
                    placeholder="Filter items or buyers…"
                    value={dayItemFilter}
                    onChange={(e) => setDayItemFilter(e.target.value)}
                    inputClassName="h-9 text-xs"
                  />
                </div>
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
                  <Button variant="primary" onClick={() => navigate(`/new-sale?date=${selectedDate}`)}>Record New Order</Button>
                </div>
              </Card>
            ) : dayViewMode === "item" ? (
              /* ── GROUP BY ITEM VIEW (Day Level) ── */
              <div className="flex flex-col gap-4">
                {byItemForDay.length === 0 ? (
                  <p className="text-sm text-center text-[var(--color-app-text-muted)] py-8 italic">
                    No items match your filter.
                  </p>
                ) : (
                  byItemForDay.map((item) => (
                    <Card key={item.id} padding="none" className="overflow-hidden bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)] gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--color-app-accent)]/15 text-[var(--color-app-accent)] flex items-center justify-center font-bold text-xs shrink-0">
                            
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[var(--color-app-text)]">{item.name}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-accent)] bg-[var(--color-app-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--color-app-accent)]/20">
                                {item.categoryName}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">
                              Sold to {item.buyers.length} buyer{item.buyers.length !== 1 ? "s" : ""} on this day
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Total Sold</span>
                            <span className="font-mono text-sm font-bold text-[var(--color-app-accent)]">
                              {item.totalQuantity} {item.unit}
                            </span>
                          </div>
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Revenue</span>
                            <span className="font-mono text-sm font-bold text-[var(--color-app-text)]">
                              {formatCurrency(item.totalRevenue)}
                            </span>
                          </div>
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Profit</span>
                            <span className="font-mono text-sm font-bold text-[var(--color-app-success)]">
                              +{formatCurrency(item.totalProfit)}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs h-7 shrink-0"
                            onClick={() => {
                              handleItemSelect(item.id);
                              handleTabChange("item");
                            }}
                            title="See all sale days for this item"
                          >
                            All Days →
                          </Button>
                        </div>
                      </div>

                      {/* Buyers of this Item on this Day */}
                      <div className="flex flex-col divide-y divide-[var(--color-app-border)]">
                        {item.buyers.map((buyer, bIdx) => {
                          const initials = (buyer.customerName || "W")
                            .split(" ")
                            .map(w => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                          return (
                            <div key={bIdx} className="flex items-center justify-between px-5 py-3 gap-3 hover:bg-[var(--color-app-panel-hover)] transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-[var(--color-app-panel)] border border-[var(--color-app-border)] text-[var(--color-app-text-muted)] font-semibold text-[11px] flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {buyer.customerId ? (
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/customers/${buyer.customerId}`)}
                                        className="font-medium text-sm text-[var(--color-app-text)] hover:text-[var(--color-app-accent)] transition-colors text-left truncate"
                                      >
                                        {buyer.customerName}
                                      </button>
                                    ) : (
                                      <span className="font-medium text-sm text-[var(--color-app-text)] truncate">{buyer.customerName}</span>
                                    )}
                                    {buyer.isPrinted && (
                                      <span className="text-[9px] uppercase font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                                        Printed
                                      </span>
                                    )}
                                  </div>
                                  {buyer.customerPhone && (
                                    <span className="text-[11px] font-mono text-[var(--color-app-text-subtle)] block">
                                      {buyer.customerPhone}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-5 shrink-0">
                                <div className="flex flex-col items-end">
                                  <span className="font-mono text-sm font-bold text-[var(--color-app-accent)]">
                                    {buyer.quantity} {item.unit}
                                  </span>
                                  <span className="text-[10px] text-[var(--color-app-text-subtle)] font-mono">
                                    @{formatCurrency(buyer.salePrice)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end min-w-[70px]">
                                  <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">
                                    {formatCurrency(buyer.lineTotal)}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-[var(--color-app-success)]">
                                    +{formatCurrency(buyer.lineProfit)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              /* ── GROUP BY CUSTOMER VIEW (Day Level) ── */
              <div className="flex flex-col gap-5">
                {paginatedCustomerEntries.map(([customerId, data]) => {
                  const { customerName, orders: custOrders, printedSales: custPrinted = [] } = data;
                  const custRevenue = custOrders.reduce((s, r) => s + (r.final_total || 0), 0) +
                    custPrinted.reduce((s, r) => s + (r.line_total || 0), 0);
                  const custProfit = custOrders.reduce((s, r) => s + (r.final_profit || 0), 0) +
                    custPrinted.reduce((s, r) => s + (r.line_profit || 0), 0);
                  const initials = customerName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                  const totalTx = custOrders.length + custPrinted.length;

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
                            <p className="text-xs text-[var(--color-app-text-muted)]">{totalTx} transaction{totalTx !== 1 ? "s" : ""} placed</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(custRevenue)}</span>
                          <span className="font-mono text-xs font-bold text-[var(--color-app-success)]">+{formatCurrency(custProfit)}</span>
                        </div>
                      </div>

                      {/* Orders & Printed Items */}
                      <div className="flex flex-col divide-y divide-[var(--color-app-border)]">
                        {custOrders.map(order => {
                          const marginPct = order.final_total > 0 ? ((order.final_profit / order.final_total) * 100).toFixed(0) : 0;
                          const discountAmount = order.discount_type === "none" ? 0 : order.subtotal - order.final_total;

                          return (
                            <div key={order.id} className="flex flex-col px-5 py-3.5 gap-2 hover:bg-[var(--color-app-panel-hover)] transition-colors">
                              {(order.items || []).length === 0 ? (
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-app-accent)] shrink-0 ml-1" />
                                    <div className="min-w-0">
                                      <span className="text-sm font-medium text-[var(--color-app-text)] truncate">
                                        {order.notes || "Manual Outstanding Balance"}
                                      </span>
                                      <span className="text-xs text-[var(--color-app-text-subtle)] block">
                                        Manual Entry
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                    <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">
                                      {formatCurrency(order.final_total)}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                order.items.map((item, idx) => {
                                  const product = mockProducts.find(p => p.id === item.product_id);
                                  const categoryName = product?.categories?.name || categories?.find(c => c.id === product?.category_id)?.name;
                                  return (
                                    <div key={idx} className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-app-border)] shrink-0 ml-1" />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-[var(--color-app-text)] truncate">{product?.name || "Unknown Product"}</span>
                                            {categoryName && (
                                              <span className="text-[11px] font-semibold text-[var(--color-app-text-muted)] bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] px-1.5 py-0.5 rounded-md">
                                                {categoryName}
                                              </span>
                                            )}
                                          </div>
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
                                })
                              )}

                              {discountAmount > 0 && (
                                <div className="flex items-center justify-between gap-4 pt-2 mt-1 border-t border-dashed border-[var(--color-app-border)]">
                                  <span className="text-xs font-medium text-[var(--color-app-warning)] uppercase tracking-wider pl-6">Order Discount</span>
                                  <span className="font-mono text-xs font-semibold text-[var(--color-app-warning)]">-{formatCurrency(discountAmount)}</span>
                                </div>
                              )}

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

                        {/* Printed Sales for this customer */}
                        {custPrinted.map(sale => (
                          <div key={sale.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-app-panel-hover)] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-1" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[var(--color-app-text)]">{sale.item_name}</span>
                                  <span className="text-[10px] font-semibold uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">Printed</span>
                                </div>
                                <span className="text-xs text-[var(--color-app-text-subtle)] font-mono">
                                  {sale.quantity} × {formatCurrency(sale.sale_price)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-[var(--color-app-text)]">{formatCurrency(sale.line_total)}</span>
                                <span className="font-mono text-[10px] font-bold text-[var(--color-app-success)]">+{formatCurrency(sale.line_profit)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}

                <Pagination
                  currentPage={currentPage}
                  totalItems={customerEntries.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: ITEM SALES BY DAY (Who Bought This Item on Each Sale Day)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "item" && (
        <div className="flex flex-col gap-6 pb-12">
          {/* Top Control Card: Item Selector & Filters */}
          <Card padding="lg" className="bg-[var(--color-app-panel)] border-[var(--color-app-border)] flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              {/* Product Selector */}
              <div className="flex-1">
                <label className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider block mb-1.5">
                  Select Item to Track Buyers across Sale Days
                </label>
                <div className="relative">
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl text-sm font-medium bg-[var(--color-app-bg)] text-[var(--color-app-text)] border border-[var(--color-app-border)] hover:border-[var(--color-app-border-focus)] focus:border-[var(--color-app-border-focus)] outline-none cursor-pointer appearance-none transition-colors"
                  >
                    <option value="">-- Choose a Product or Printed Item --</option>
                    {(categories || []).map(cat => {
                      const prods = selectableItems.filter(i => i.type === "product" && i.categoryName === cat.name);
                      if (prods.length === 0) return null;
                      return (
                        <optgroup key={cat.id} label={cat.name} className="bg-[#1f2937] text-gray-300 font-semibold">
                          {prods.map(p => (
                            <option key={p.id} value={p.id} className="bg-[#1f2937] text-white">
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}

                    {selectableItems.some(i => i.type === "printed") && (
                      <optgroup label="Printed Items" className="bg-[#1f2937] text-cyan-400 font-semibold">
                        {selectableItems.filter(i => i.type === "printed").map(pi => (
                          <option key={pi.id} value={pi.id} className="bg-[#1f2937] text-white">
                            {pi.name} ({pi.unit})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[var(--color-app-text-muted)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </span>
                </div>
              </div>

              {/* Date Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">
                  Date Range
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: "all", label: "All Time" },
                    { key: "month", label: "This Month" },
                    { key: "30d", label: "Last 30 Days" },
                    { key: "custom", label: "Custom" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setItemDatePreset(opt.key)}
                      className={[
                        "px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        itemDatePreset === opt.key
                          ? "bg-[var(--color-app-accent)] border-[var(--color-app-accent)] text-white shadow-sm"
                          : "border-[var(--color-app-border)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buyer search filter */}
              <div className="lg:w-64">
                <Input
                  label="Search Buyers"
                  placeholder="Filter by customer name…"
                  value={buyerQuery}
                  onChange={(e) => setBuyerQuery(e.target.value)}
                  className="w-full"
                  inputClassName="h-11 text-xs"
                />
              </div>
            </div>

            {/* Custom Date Pickers */}
            {itemDatePreset === "custom" && (
              <div className="flex items-center gap-3 pt-3 border-t border-[var(--color-app-border)] flex-wrap">
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">From:</span>
                <DatePicker
                  value={itemCustomFrom}
                  onChange={(iso) => setItemCustomFrom(iso)}
                  placeholder="Start date"
                  maxDate={itemCustomTo || undefined}
                />
                <span className="text-xs font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider">To:</span>
                <DatePicker
                  value={itemCustomTo}
                  onChange={(iso) => setItemCustomTo(iso)}
                  placeholder="End date"
                  minDate={itemCustomFrom || undefined}
                />
              </div>
            )}
          </Card>

          {/* If no item selected yet */}
          {!selectedItemId ? (
            <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] flex items-center justify-center mb-4 text-[var(--color-app-accent)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[var(--color-app-text)] mb-2">
                Select an item to see who bought it
              </h3>
              <p className="text-sm text-[var(--color-app-text-muted)] max-w-md mb-6">
                Choose any product or printed item from the dropdown above to view each sale day it was sold and the exact customer breakdown.
              </p>

              {/* Quick Picks */}
              {selectableItems.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-app-text-subtle)] uppercase tracking-wider">Quick Suggestions:</span>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
                    {selectableItems.slice(0, 6).map(it => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => handleItemSelect(it.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] hover:border-[var(--color-app-accent)] text-[var(--color-app-text)] transition-colors cursor-pointer"
                      >
                        {it.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <>
              {/* Selected Item Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card padding="md" className="flex flex-col bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Total Sold</span>
                  <span className="font-mono text-xl font-bold text-[var(--color-app-accent)]">
                    {itemSummary.totalQuantity} {selectedItemObj?.unit || "units"}
                  </span>
                </Card>

                <Card padding="md" className="flex flex-col bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Total Revenue</span>
                  <span className="font-mono text-xl font-bold text-[var(--color-app-text)]">
                    {formatCurrency(itemSummary.totalRevenue)}
                  </span>
                </Card>

                <Card padding="md" className="flex flex-col bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Total Profit</span>
                  <span className="font-mono text-xl font-bold text-[var(--color-app-success)]">
                    +{formatCurrency(itemSummary.totalProfit)}
                  </span>
                </Card>

                <Card padding="md" className="flex flex-col bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Sale Days</span>
                  <span className="font-mono text-xl font-bold text-[var(--color-app-text)]">
                    {itemSummary.daysCount} day{itemSummary.daysCount !== 1 ? "s" : ""}
                  </span>
                </Card>

                <Card padding="md" className="flex flex-col bg-[var(--color-app-panel)] border-[var(--color-app-border)] col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">Distinct Buyers</span>
                  <span className="font-mono text-xl font-bold text-[var(--color-app-text)]">
                    {itemSummary.buyersCount} customer{itemSummary.buyersCount !== 1 ? "s" : ""}
                  </span>
                </Card>
              </div>

              {/* Feed: Grouped by Sale Day */}
              {selectedItemSalesByDay.length === 0 ? (
                <Card padding="lg" className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                  <p className="text-base font-semibold text-[var(--color-app-text)] mb-1">
                    No sales recorded for this item in this period.
                  </p>
                  <p className="text-xs text-[var(--color-app-text-muted)]">
                    Try changing your date filter to "All Time" or clearing your buyer search.
                  </p>
                </Card>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider">
                      Recorded Sale Days ({selectedItemSalesByDay.length})
                    </h3>
                    <span className="text-xs text-[var(--color-app-text-muted)]">
                      Showing newest sale days first
                    </span>
                  </div>

                  {selectedItemSalesByDay.map(day => (
                    <Card key={day.date} padding="none" className="overflow-hidden bg-[var(--color-app-panel)] border-[var(--color-app-border)]">
                      {/* Day Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)] gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[var(--color-app-panel)] border border-[var(--color-app-border)] flex items-center justify-center text-[var(--color-app-accent)] shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-[var(--color-app-text)]">{day.displayDate}</span>
                              <span className="text-[11px] font-mono text-[var(--color-app-text-muted)] bg-[var(--color-app-panel)] px-2 py-0.5 rounded border border-[var(--color-app-border)]">
                                {day.date}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-app-text-muted)] mt-0.5">
                              Sold to {day.buyers.length} buyer{day.buyers.length !== 1 ? "s" : ""} on this day
                            </p>
                          </div>
                        </div>

                        {/* Day totals for this item */}
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Total Sold</span>
                            <span className="font-mono text-base font-bold text-[var(--color-app-accent)]">
                              {day.totalQuantity} {selectedItemObj?.unit || "units"}
                            </span>
                          </div>
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Revenue</span>
                            <span className="font-mono text-base font-bold text-[var(--color-app-text)]">
                              {formatCurrency(day.totalRevenue)}
                            </span>
                          </div>
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Profit</span>
                            <span className="font-mono text-base font-bold text-[var(--color-app-success)]">
                              +{formatCurrency(day.totalProfit)}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs h-8 shrink-0"
                            onClick={() => {
                              setSelectedDate(day.date);
                              handleTabChange("daily");
                            }}
                          >
                            View Day
                          </Button>
                        </div>
                      </div>

                      {/* Buyers on this Day */}
                      <div className="flex flex-col divide-y divide-[var(--color-app-border)]">
                        {day.buyers.map((buyer, bIdx) => {
                          const initials = (buyer.customerName || "W")
                            .split(" ")
                            .map(w => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase();

                          return (
                            <div key={bIdx} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 gap-3 hover:bg-[var(--color-app-panel-hover)] transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-[var(--color-app-accent)]/20 text-[var(--color-app-accent)] font-semibold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {buyer.customerId ? (
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/customers/${buyer.customerId}`)}
                                        className="font-semibold text-sm text-[var(--color-app-text)] hover:text-[var(--color-app-accent)] transition-colors text-left truncate cursor-pointer"
                                      >
                                        {buyer.customerName}
                                      </button>
                                    ) : (
                                      <span className="font-semibold text-sm text-[var(--color-app-text)] truncate">{buyer.customerName}</span>
                                    )}
                                    {buyer.isPrinted && (
                                      <span className="text-[10px] uppercase font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                        Printed
                                      </span>
                                    )}
                                  </div>
                                  {buyer.customerPhone && (
                                    <a
                                      href={`tel:${buyer.customerPhone}`}
                                      className="text-xs font-mono text-[var(--color-app-text-muted)] hover:text-[var(--color-app-accent)] block"
                                    >
                                      {buyer.customerPhone}
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pl-11 sm:pl-0">
                                <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Quantity</span>
                                  <span className="font-mono text-sm font-bold text-[var(--color-app-accent)]">
                                    {buyer.quantity} {selectedItemObj?.unit || "units"}
                                  </span>
                                </div>
                                <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Price / Unit</span>
                                  <span className="font-mono text-sm font-medium text-[var(--color-app-text)]">
                                    {formatCurrency(buyer.salePrice)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-start sm:items-end min-w-[70px]">
                                  <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Line Total</span>
                                  <span className="font-mono text-sm font-bold text-[var(--color-app-text)]">
                                    {formatCurrency(buyer.lineTotal)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-start sm:items-end min-w-[65px]">
                                  <span className="text-[10px] uppercase font-semibold text-[var(--color-app-text-muted)] tracking-wider">Profit</span>
                                  <span className="font-mono text-sm font-bold text-[var(--color-app-success)]">
                                    +{formatCurrency(buyer.lineProfit)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reassign Modal */}
      <ReassignModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        targetDate={selectedDate}
        allOrders={orders}
        onReassign={handleReassign}
        customers={mockCustomers}
        products={mockProducts}
      />
    </PageContainer>
  );
}
