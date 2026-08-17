import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Sidebar }       from "@/components/layout/Sidebar";
import { PageContainer } from "@/components/layout/PageContainer";

import Dashboard    from "@/pages/Dashboard";
import Products     from "@/pages/Products";
import Customers    from "@/pages/Customers";
import NewSale      from "@/pages/NewSale";
import SalesHistory from "@/pages/SalesHistory";
import ProfitReport from "@/pages/ProfitReport";

/* Page metadata — drives PageContainer titles per route */
const PAGE_META = {
  "/":        { title: "Dashboard",     subtitle: "Your business at a glance" },
  "/products":{ title: "Products",      subtitle: "Manage your inventory" },
  "/customers":{ title: "Customers",    subtitle: "View and manage customers" },
  "/new-sale":{ title: "New Sale",      subtitle: "Record a new transaction" },
  "/sales":   { title: "Sales History", subtitle: "Browse past transactions" },
  "/profit":  { title: "Profit Report", subtitle: "Earnings and margin overview" },
};

/* ── Root layout ────────────────────────────────────────────── */
function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-app-bg)]">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area — offset by sidebar width on desktop */}
      <div className="flex flex-col flex-1 lg:pl-60 transition-all duration-300">

        {/* ── Mobile top bar ─────────────────────────── */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 border-b border-[var(--color-app-border)] bg-[var(--color-app-panel)]">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-[var(--color-app-text)] text-sm tracking-tight">Stockly</span>
        </header>

        {/* ── Page routes ───────────────────────────── */}
        <Routes>
          <Route path="/"          element={<PageContainer {...PAGE_META["/"]}><Dashboard /></PageContainer>} />
          <Route path="/products"  element={<PageContainer {...PAGE_META["/products"]}><Products /></PageContainer>} />
          <Route path="/customers" element={<PageContainer {...PAGE_META["/customers"]}><Customers /></PageContainer>} />
          <Route path="/new-sale"  element={<PageContainer {...PAGE_META["/new-sale"]}><NewSale /></PageContainer>} />
          <Route path="/sales"     element={<PageContainer {...PAGE_META["/sales"]}><SalesHistory /></PageContainer>} />
          <Route path="/profit"    element={<PageContainer {...PAGE_META["/profit"]}><ProfitReport /></PageContainer>} />
        </Routes>
      </div>
    </div>
  );
}

/* ── App root ───────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
