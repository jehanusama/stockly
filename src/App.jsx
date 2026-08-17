import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Sidebar }       from "@/components/layout/Sidebar";

import Dashboard       from "@/pages/Dashboard";
import Products        from "@/pages/Products";
import Customers       from "@/pages/Customers";
import CustomerDetails from "@/pages/CustomerDetails";
import NewSale         from "@/pages/NewSale";
import SalesHistory    from "@/pages/SalesHistory";
import ProfitReport    from "@/pages/ProfitReport";


function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-app-bg)]">

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      
      <div className="flex flex-col flex-1 lg:pl-60 transition-all duration-300">

        
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

        
        <Routes>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/products"       element={<Products />} />
          <Route path="/customers"      element={<Customers />} />
          <Route path="/customers/:id"  element={<CustomerDetails />} />
          <Route path="/new-sale"       element={<NewSale />} />
          <Route path="/sales"          element={<SalesHistory />} />
          <Route path="/profit"         element={<ProfitReport />} />
        </Routes>
      </div>
    </div>
  );
}


function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
