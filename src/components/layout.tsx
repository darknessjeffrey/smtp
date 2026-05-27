import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Server, LayoutDashboard, Database, Upload,
  ShoppingCart, History, Settings as SettingsIcon, Users, Menu, X
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/smtps",     label: "Library",   icon: Database },
  { href: "/import",    label: "Import",    icon: Upload },
  { href: "/sales/new", label: "New Sale",  icon: ShoppingCart },
  { href: "/history",   label: "History",   icon: History },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings",  label: "Settings",  icon: SettingsIcon },
];

function isActive(location: string, href: string) {
  return location === href || (href !== "/" && location.startsWith(href));
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const currentLabel =
    NAV_ITEMS.find((i) => isActive(location, i.href))?.label ?? "Page";

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-mono">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-56 lg:w-64 border-r border-border bg-sidebar flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Server className="w-4 h-4 text-primary mr-2.5" />
          <span className="font-bold tracking-tight text-sidebar-foreground uppercase text-sm">SMTP PRO</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(location, item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center px-3 py-2 text-xs font-medium cursor-pointer transition-colors border-l-2 ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-transparent"
                  }`}
                >
                  <item.icon className={`w-4 h-4 mr-2.5 shrink-0 ${active ? "text-primary" : ""}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">v2.1.0</div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center px-4 bg-card/50 shrink-0 gap-3">
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 md:hidden">
            <Server className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm uppercase tracking-tight">SMTP PRO</span>
          </div>

          <span className="hidden md:block text-sm font-bold uppercase tracking-wider">{currentLabel}</span>
          <span className="md:hidden ml-auto text-xs text-muted-foreground uppercase tracking-wider">{currentLabel}</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto pb-20 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Drawer Overlay ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 h-full bg-sidebar border-r border-border flex flex-col z-10 shadow-2xl">
            <div className="h-14 flex items-center justify-between px-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm uppercase tracking-tight">SMTP PRO</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(location, item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center px-3 py-3 text-sm font-medium cursor-pointer transition-colors border-l-2 ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-transparent"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-3 shrink-0 ${active ? "text-primary" : ""}`} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border text-xs text-muted-foreground">v2.1.0</div>
          </aside>
        </div>
      )}

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-sidebar border-t border-border flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = isActive(location, item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] uppercase tracking-wide leading-none">{item.label}</span>
              </div>
            </Link>
          );
        })}
        {/* More button → opens drawer for Customers + Settings */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px] text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wide leading-none">More</span>
        </button>
      </nav>

    </div>
  );
}
