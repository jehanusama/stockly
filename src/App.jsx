import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";


import { Sidebar }       from "@/components/layout/Sidebar";

import Login             from "@/pages/Login";
import Dashboard         from "@/pages/Dashboard";
import Products          from "@/pages/Products";
import Customers         from "@/pages/Customers";
import CustomerDetails   from "@/pages/CustomerDetails";
import NewSale           from "@/pages/NewSale";
import SalesHistory      from "@/pages/SalesHistory";
import SalesByDay        from "@/pages/SalesByDay";
import ProfitReport      from "@/pages/ProfitReport";

function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)] text-[var(--color-app-text-muted)]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-[var(--color-app-accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--color-app-bg)]">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      <div className={["flex flex-col flex-1 transition-all duration-300", collapsed ? "lg:pl-16" : "lg:pl-64"].join(" ")}>
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-14 px-4 border-b border-[var(--color-app-border)] bg-[var(--color-app-panel)]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen(true);
            }}
            aria-label="Open navigation menu"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-[var(--color-app-text)] text-sm tracking-tight">Stockly</span>
        </header>

        <Routes>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/products"       element={<Products />} />
          <Route path="/customers"      element={<Customers />} />
          <Route path="/customers/:id"  element={<CustomerDetails />} />
          <Route path="/new-sale"       element={<NewSale />} />
          <Route path="/sales"          element={<SalesHistory />} />
          <Route path="/sales-by-day"   element={<SalesByDay />} />
          <Route path="/profit"         element={<ProfitReport />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AppLayout />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
