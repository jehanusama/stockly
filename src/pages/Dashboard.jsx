import { Card, Table, StockBar, LoadingState, ErrorState } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppData } from "@/context/AppContext";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/utils/currency";


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length && label && label.trim()) {
    return (
      <div className="bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] p-3 rounded-lg shadow-xl shadow-black/20 backdrop-blur-sm">
        <p className="text-[var(--color-app-text-muted)] text-xs mb-1 font-medium">{label}</p>
        <p className="text-[var(--color-app-accent)] font-mono font-semibold text-sm">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { products: mockProducts, customers: mockCustomers, orders: mockOrders, categories, isLoading, error, refreshData } = useAppData();

  if (isLoading) {
    return (
      <PageContainer title="Dashboard" subtitle="Your business at a glance">
        <LoadingState message="Loading dashboard metrics..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard" subtitle="Your business at a glance">
        <ErrorState error={error} onRetry={refreshData} />
      </PageContainer>
    );
  }

  const totalRevenue = mockOrders.reduce((sum, o) => sum + o.final_total, 0);
  const totalProfit = mockOrders.reduce((sum, o) => sum + o.final_profit, 0);
  const productCount = mockProducts.length;
  const customerCount = mockCustomers.length;

  // 3. Profit Per Month Chart & Trend (AreaChart)
  const monthlyProfitMap = {};
  mockOrders.forEach(order => {
    const date = new Date(order.order_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyProfitMap[key]) {
      monthlyProfitMap[key] = { name: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), profit: 0 };
    }
    monthlyProfitMap[key].profit += order.final_profit;
  });

  const sortedMonthKeys = Object.keys(monthlyProfitMap).sort();
  
  let profitTrendNode;
  if (sortedMonthKeys.length >= 2) {
    const currentMonthProfit = monthlyProfitMap[sortedMonthKeys[sortedMonthKeys.length - 1]].profit;
    const previousMonthProfit = monthlyProfitMap[sortedMonthKeys[sortedMonthKeys.length - 2]].profit;
    
    if (previousMonthProfit === 0) {
      profitTrendNode = <span className="text-sm font-mono font-medium text-[var(--color-app-text-muted)] bg-[var(--color-app-elevated)] px-2 py-0.5 rounded">N/A</span>;
    } else {
      const pctChange = ((currentMonthProfit - previousMonthProfit) / previousMonthProfit) * 100;
      const isPositive = pctChange >= 0;
      profitTrendNode = (
        <span className={`text-sm font-mono font-medium px-2 py-0.5 rounded ${isPositive ? "text-[var(--color-app-success)] bg-[var(--color-app-success-muted)]" : "text-[var(--color-app-danger)] bg-[var(--color-app-danger-muted)]"}`}>
          {isPositive ? "+" : ""}{pctChange.toFixed(1)}%
        </span>
      );
    }
  } else {
    profitTrendNode = <span className="text-sm font-mono font-medium text-[var(--color-app-text-muted)] bg-[var(--color-app-elevated)] px-2 py-0.5 rounded">New</span>;
  }

  const profitPerMonth = sortedMonthKeys.map(key => monthlyProfitMap[key]);

  const lastOrders = [...mockOrders]
    .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
    .slice(0, 5)
    .map(order => {
      const customer = mockCustomers.find(c => c.id === order.customer_id);
      const firstProduct = mockProducts.find(p => p.id === order.items[0]?.product_id);
      const itemsSummary = order.items.length === 1
        ? `${firstProduct?.name ?? "Product"} ×${order.items[0].quantity}`
        : `${order.items.length} products`;
      return {
        ...order,
        customerName: customer ? customer.name : "Unknown",
        itemsSummary
      };
    });

  const salesColumns = [
    { key: "order_date", label: "Date", render: (val) => <span className="font-mono text-xs text-[var(--color-app-text-muted)]">{new Date(val).toLocaleDateString()}</span> },
    { key: "customerName", label: "Customer", render: (val) => <span className="font-medium text-[var(--color-app-text)]">{val}</span> },
    { key: "itemsSummary", label: "Items", render: (val) => <span className="text-[var(--color-app-text-subtle)]">{val}</span> },
    { key: "final_total", label: "Total", align: "right", render: (val) => <span className="font-mono font-medium text-[var(--color-app-text)]">{formatCurrency(val)}</span> },
    { key: "final_profit", label: "Profit", align: "right", render: (val) => <span className="font-mono font-semibold text-[var(--color-app-success)]">+{formatCurrency(val)}</span> }
  ];



  // 4. Low Stock Products
  const lowStockProducts = mockProducts.filter(p => p.stock_quantity < 10);

  return (
    <PageContainer title="Dashboard" subtitle="Your business at a glance">
      <div className="flex flex-col gap-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Hero: Total Profit & Chart */}
          <div className="lg:col-span-8 flex flex-col gap-4 bg-[var(--color-app-panel)] rounded-2xl border border-[var(--color-app-border)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
              <div>
                <h2 className="text-sm font-medium text-[var(--color-app-text-muted)] uppercase tracking-wider mb-2">Net Profit</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-mono font-semibold text-[var(--color-app-text)] tracking-tight">
                    {formatCurrency(totalProfit)}
                  </span>
                  {profitTrendNode}
                </div>
              </div>
            </div>
            
            {/* Smooth Area Chart */}
            <div className="h-48 w-full mt-4 flex flex-col justify-end">
              {profitPerMonth.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-[var(--color-app-text-muted)] italic">
                  No monthly profit data recorded yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={profitPerMonth.length === 1 ? 140 : 160}>
                    <AreaChart data={profitPerMonth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-app-accent)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--color-app-accent)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="name" 
                        stroke="transparent" 
                        tick={{fill: 'var(--color-app-text-subtle)', fontSize: 11, fontFamily: 'var(--font-mono)'}} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="var(--color-app-accent)" 
                        strokeWidth={3}
                        dot={profitPerMonth.length === 1 ? { r: 5, fill: "var(--color-app-accent)", stroke: "var(--color-app-panel)", strokeWidth: 2 } : false}
                        activeDot={{ r: 6, fill: "var(--color-app-accent)" }}
                        fillOpacity={1} 
                        fill="url(#colorProfit)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  {profitPerMonth.length === 1 && (
                    <p className="text-[11px] text-[var(--color-app-text-muted)] text-center mt-2 italic">
                      More data points will appear here as you record sales over time.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Secondary Metrics Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card padding="lg" className="flex-1 flex flex-col justify-center">
              <p className="text-xs text-[var(--color-app-text-muted)] uppercase tracking-wider mb-2">Gross Revenue</p>
              <p className="text-2xl font-mono font-medium text-[var(--color-app-text)]">{formatCurrency(totalRevenue)}</p>
            </Card>
            <div className="flex gap-4 flex-1">
              <Card padding="lg" className="flex-1 flex flex-col justify-center">
                <p className="text-xs text-[var(--color-app-text-muted)] uppercase tracking-wider mb-2">Products</p>
                <p className="text-2xl font-mono font-medium text-[var(--color-app-text)]">{productCount}</p>
              </Card>
              <Card padding="lg" className="flex-1 flex flex-col justify-center">
                <p className="text-xs text-[var(--color-app-text-muted)] uppercase tracking-wider mb-2">Customers</p>
                <p className="text-2xl font-mono font-medium text-[var(--color-app-text)]">{customerCount}</p>
              </Card>
            </div>
          </div>
        </div>

        {/*  Sales & Operational Alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Recent Sales */}
          <div className="xl:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider mb-4 px-1">Recent Transactions</h3>
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Card padding="sm">
                <Table columns={salesColumns} rows={lastOrders} />
              </Card>
            </div>
            {/* Mobile Stacked Card View */}
            <div className="sm:hidden flex flex-col gap-3">
              {lastOrders.map(order => (
                <div key={order.id} className="bg-[var(--color-app-panel)] border border-[var(--color-app-border)] rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm text-[var(--color-app-text)]">{order.customerName}</span>
                    <span className="font-mono font-bold text-sm text-[var(--color-app-text)]">{formatCurrency(order.final_total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[var(--color-app-text-muted)]">
                    <span>{order.itemsSummary}</span>
                    <span className="font-mono text-[var(--color-app-success)] font-semibold">+{formatCurrency(order.final_profit)}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--color-app-text-subtle)] pt-1 border-t border-[var(--color-app-border)]">
                    {new Date(order.order_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Alerts  */}
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider mb-4 px-1">Operational Alerts</h3>
            <Card padding="lg" className="flex-1 bg-[var(--color-app-bg)] border-dashed border-[var(--color-app-border)]">
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-[var(--color-app-text-muted)] text-center py-8">Inventory levels are healthy.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {lowStockProducts.map(p => (
                    <li key={p.id} className="flex flex-col gap-3 pb-4 border-b border-[var(--color-app-border)] last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="font-medium text-sm text-[var(--color-app-text)] leading-tight truncate">{p.name}</p>
                          {(() => { const cat = categories.find(c => c.id === p.category_id); return cat ? <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-app-text-muted)]">{cat.name}</span> : null; })()}
                        </div>
                        <StockBar current={p.stock_quantity} unit={p.unit} threshold={10} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

        </div>
      </div>
    </PageContainer>
  );
}
