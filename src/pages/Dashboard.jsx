import { useMemo } from "react";
import { Card, Table } from "@/components/ui";
import { mockProducts } from "@/data/mockProducts";
import { mockCustomers } from "@/data/mockCustomers";
import { mockSales } from "@/data/mockSales";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Custom StockBar Component
function StockBar({ current, threshold = 10 }) {
  const percent = Math.min(100, Math.max(0, (current / threshold) * 100));
  // Use a softer accent color if it's very low
  const barColor = current <= 2 ? "var(--color-app-danger)" : "var(--color-app-accent)";

  return (
    <div className="flex flex-col gap-1.5 w-28">
      <div className="flex justify-between items-end leading-none">
        <span className="text-[10px] font-medium text-[var(--color-app-text-muted)] uppercase tracking-wider">Remaining</span>
        <span className="text-xs font-mono text-[var(--color-app-text)]">{current}<span className="text-[var(--color-app-text-subtle)]">/{threshold}</span></span>
      </div>
      <div className="h-1.5 w-full bg-[var(--color-app-panel)] rounded-full overflow-hidden border border-[var(--color-app-border)]">
        <div 
          className="h-full rounded-full transition-all duration-500" 
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// Custom Tooltip for Chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] p-3 rounded-lg shadow-xl">
        <p className="text-xs text-[var(--color-app-text-muted)] uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm font-mono text-[var(--color-app-text)] font-semibold">
          Profit: <span className="text-[var(--color-app-accent)]">${payload[0].value.toFixed(2)}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  // 1. Summary Metrics
  const totalRevenue = mockSales.reduce((sum, sale) => sum + sale.total_price, 0);
  const totalProfit = mockSales.reduce((sum, sale) => sum + sale.profit, 0);
  const productCount = mockProducts.length;
  const customerCount = mockCustomers.length;

  // Trend Indicator (Mocked for demonstration)
  const profitTrend = "+12.5%";

  // 2. Last 5 Sales
  const lastSales = [...mockSales]
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, 5)
    .map(sale => {
      const customer = mockCustomers.find(c => c.id === sale.customer_id);
      const product = mockProducts.find(p => p.id === sale.product_id);
      return {
        ...sale,
        customerName: customer ? customer.name : "Unknown",
        productName: product ? product.name : "Unknown"
      };
    });

  const salesColumns = [
    { key: "sale_date", label: "Date", render: (val) => <span className="font-mono text-xs text-[var(--color-app-text-muted)]">{new Date(val).toLocaleDateString()}</span> },
    { key: "customerName", label: "Customer", render: (val) => <span className="font-medium text-[var(--color-app-text)]">{val}</span> },
    { key: "productName", label: "Product", render: (val) => <span className="text-[var(--color-app-text-subtle)]">{val}</span> },
    { key: "quantity", label: "Qty", align: "right", render: (val) => <span className="font-mono text-[var(--color-app-text)]">{val}</span> },
    { key: "total_price", label: "Total", align: "right", render: (val) => <span className="font-mono font-medium text-[var(--color-app-text)]">${val.toFixed(2)}</span> }
  ];

  // 3. Profit Per Month Chart (AreaChart)
  const profitPerMonth = useMemo(() => {
    const months = {};
    mockSales.forEach(sale => {
      const date = new Date(sale.sale_date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!months[monthYear]) months[monthYear] = 0;
      months[monthYear] += sale.profit;
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
    return [...dummyData, ...actualData];
  }, []);

  // 4. Low Stock Products
  const lowStockProducts = mockProducts.filter(p => p.stock_quantity < 10);

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* ── Top Hero Section (Profit) & Secondary Metrics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Hero: Total Profit & Chart */}
        <div className="lg:col-span-8 flex flex-col gap-4 bg-[var(--color-app-panel)] rounded-2xl border border-[var(--color-app-border)] p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-app-text-muted)] uppercase tracking-wider mb-2">Net Profit</h2>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-mono font-semibold text-[var(--color-app-text)] tracking-tight">
                  ${totalProfit.toFixed(2)}
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
            <p className="text-2xl font-mono font-medium text-[var(--color-app-text)]">${totalRevenue.toFixed(2)}</p>
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
            <Table columns={salesColumns} rows={lastSales} />
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
  );
}
