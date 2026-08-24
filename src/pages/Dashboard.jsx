import { Card, Table, StockBar } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { mockProducts } from "@/data/mockProducts";
import { mockCustomers } from "@/data/mockCustomers";
import { mockOrders } from "@/data/mockOrders";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/utils/currency";


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
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

  const totalRevenue = mockOrders.reduce((sum, o) => sum + o.final_total, 0);
  const totalProfit = mockOrders.reduce((sum, o) => sum + o.final_profit, 0);
  const productCount = mockProducts.length;
  const customerCount = mockCustomers.length;

  const profitTrend = "+12.5%";

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

  // 3. Profit Per Month Chart (AreaChart)
  const months = {};
  mockOrders.forEach(order => {
    const date = new Date(order.order_date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (!months[monthYear]) months[monthYear] = 0;
    months[monthYear] += order.final_profit;
  });
  // Add dummy data for a more interesting curve
  const dummyData = [
    { name: "Jul 23", profit: 120.00 },
    { name: "Aug 23", profit: 280.00 },
    { name: "Sep 23", profit: 195.00 }
  ];
  const actualData = Object.keys(months).map(key => ({
    name: key,
    profit: months[key]
  }));
  const profitPerMonth = [...dummyData, ...actualData];

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
                  <span className="text-sm font-mono font-medium text-[var(--color-app-success)] bg-[var(--color-app-success-muted)] px-2 py-0.5 rounded">
                    {profitTrend}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Smooth Area Chart */}
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitPerMonth} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
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

        {/* ── Lower Section: Sales & Operational Alerts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Recent Sales (Spans 2 cols) */}
          <div className="xl:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--color-app-text)] uppercase tracking-wider mb-4 px-1">Recent Transactions</h3>
            <Card padding="sm">
              <Table columns={salesColumns} rows={lastOrders} />
            </Card>
          </div>

          {/* Operational Alerts (Low Stock) */}
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
                        <p className="font-medium text-sm text-[var(--color-app-text)] leading-tight">{p.name}</p>
                        <StockBar current={p.stock_quantity} threshold={10} />
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
