import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

/* ── Nav items ──────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "Products",
    to: "/products",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: "Customers",
    to: "/customers",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Sales History",
    to: "/sales",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: "Sales by Day",
    to: "/sales-by-day",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <line x1="9" y1="16" x2="9" y2="16" /><line x1="15" y1="16" x2="15" y2="16" />
      </svg>
    ),
  },
  {
    label: "Profit Report",
    to: "/profit",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

/* ── Single nav link ────────────────────────────────────────── */
function NavItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
          "transition-all duration-150 relative overflow-hidden",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]",
          isActive
            ? "text-[var(--color-app-accent)] bg-gradient-to-r from-[var(--color-app-accent)]/10 to-transparent"
            : "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
        ].join(" ")
      }
    >
      {/* Active indicator bar */}
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[var(--color-app-accent)] shadow-[0_0_8px_var(--color-app-accent)]" />
          )}
          <span className="flex-shrink-0 relative z-10">{item.icon}</span>
          <span
            className={[
              "whitespace-nowrap overflow-hidden transition-all duration-300 relative z-10",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
            ].join(" ")}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* ── Sidebar component ──────────────────────────────────────── */
export function Sidebar({ mobileOpen, onMobileClose, collapsed: controlledCollapsed, onToggleCollapse }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const handleToggle = onToggleCollapse ?? (() => setInternalCollapsed(c => !c));

  const location = useLocation();
  const { user, signOut } = useAuth();

  // Close mobile drawer ONLY when route actually changes
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      onMobileClose?.();
    }
  }, [location.pathname, onMobileClose]);

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "A";
  const userDisplayName = user?.email ? user.email.split("@")[0] : "Admin";

  const sidebarContent = (
    <aside
      className={[
        "flex flex-col h-full relative z-20",
        "bg-[var(--color-app-panel)] border-r border-[var(--color-app-border)]",
        "transition-all duration-300",
        sidebarWidth,
      ].join(" ")}
    >
      {/* Desktop collapse toggle (Floating on border) */}
      <button
        onClick={handleToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={[
          "hidden lg:flex items-center justify-center w-6 h-6 rounded-full",
          "absolute -right-3 top-6 z-30",
          "bg-[var(--color-app-panel)] border border-[var(--color-app-border)] shadow-sm",
          "text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
          "transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]",
        ].join(" ")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={[
            "transition-transform duration-300",
            collapsed ? "rotate-180" : "",
          ].join(" ")}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Header */}
      <div className={["flex items-center h-20 flex-shrink-0 pt-2", collapsed ? "justify-center px-0" : "px-5"].join(" ")}>
        <Logo size={32} showText={!collapsed} />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 flex flex-col gap-6">
        
        {/* Primary Action */}
        <div className="px-1">
          <NavLink
            to="/new-sale"
            title={collapsed ? "New Sale" : undefined}
            className={({ isActive }) => [
              "flex items-center justify-center gap-2 w-full h-10 rounded-lg text-sm font-bold shadow-sm transition-all duration-200",
              collapsed ? "px-0" : "px-4",
              isActive 
                ? "bg-[var(--color-app-accent)] text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] ring-2 ring-[var(--color-app-accent)]/30 ring-offset-2 ring-offset-[var(--color-app-panel)]" 
                : "bg-[var(--color-app-accent)] hover:bg-[var(--color-app-accent)]/90 text-white hover:-translate-y-0.5 hover:shadow-md",
            ].join(" ")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {!collapsed && <span>New Sale</span>}
          </NavLink>
        </div>

        {/* List items */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className={["border-t border-[var(--color-app-border)] px-3 py-3 flex-shrink-0 flex items-center justify-between gap-2", collapsed ? "flex-col gap-2" : ""].join(" ")}>
        <div
          className={[
            "flex items-center gap-2.5 overflow-hidden min-w-0 flex-1",
            collapsed ? "justify-center" : "",
          ].join(" ")}
        >
          <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] text-xs font-semibold select-none">
            {userInitial}
          </span>
          <div
            className={[
              "min-w-0 transition-all duration-300 overflow-hidden",
              collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100",
            ].join(" ")}
          >
            <p className="text-xs font-medium text-[var(--color-app-text)] truncate capitalize">{userDisplayName}</p>
            <p className="text-[11px] text-[var(--color-app-text-subtle)] truncate">{user?.email || "admin@stockly.app"}</p>
          </div>
        </div>

        <button
          onClick={signOut}
          title="Sign Out"
          aria-label="Sign Out"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)] shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop sidebar (fixed) ────────────────── */}
      <div className={["hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300", sidebarWidth].join(" ")}>
        {sidebarContent}
      </div>

      {/* ── Mobile drawer ─────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onMobileClose?.();
            }}
          />
          {/* Drawer panel — always expanded on mobile */}
          <div className="relative flex flex-col h-full w-[280px] max-w-[85vw] bg-[var(--color-app-panel)] border-r border-[var(--color-app-border)] z-10 animate-[slideInLeft_220ms_ease-out]">
            {/* Mobile header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-app-border)]">
              <Logo size={30} showText={true} />
              <button
                onClick={onMobileClose}
                aria-label="Close menu"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.to} item={item} collapsed={false} />
              ))}
            </nav>
            {/* Footer */}
            <div className="border-t border-[var(--color-app-border)] px-3 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] text-xs font-semibold">{userInitial}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-app-text)] truncate capitalize">{userDisplayName}</p>
                  <p className="text-[11px] text-[var(--color-app-text-subtle)] truncate">{user?.email || "admin@stockly.app"}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                aria-label="Sign Out"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] hover:bg-[var(--color-app-elevated)] transition-colors shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;

