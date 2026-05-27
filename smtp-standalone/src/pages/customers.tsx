import { useState, useMemo } from "react";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, ChevronDown, ChevronRight, Users, DollarSign,
  ShoppingCart, Mail, Eye, EyeOff, Copy, Check,
} from "lucide-react";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="ml-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function PasswordCell({ password }: { password: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <span className={show ? "text-yellow-300" : "text-muted-foreground tracking-widest"}>
        {show ? password : "••••••••••••"}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
      >
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
      {show && <CopyBtn text={password} />}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  created: "border-cyan-500/40 text-cyan-400 bg-cyan-500/5",
  cracked: "border-purple-500/40 text-purple-400 bg-purple-500/5",
  old:     "border-yellow-500/40 text-yellow-400 bg-yellow-500/5",
};

export default function Customers() {
  const { sales, smtps, settings } = useStore();
  const [search, setSearch]             = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedSale, setExpandedSale]         = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: settings.currency }).format(n);

  // Build a fast id→smtp lookup
  const smtpMap = useMemo(() => {
    const m = new Map<string, typeof smtps[0]>();
    for (const s of smtps) m.set(s.id, s);
    return m;
  }, [smtps]);

  // Aggregate sales by buyer
  const customers = useMemo(() => {
    const map: Record<string, {
      name: string;
      email: string;
      sales: typeof sales;
      totalSpent: number;
      totalSmtps: number;
      lastPurchase: string;
    }> = {};
    for (const sale of sales) {
      const key = sale.buyerName.trim().toLowerCase();
      if (!map[key]) {
        map[key] = { name: sale.buyerName, email: sale.buyerEmail || "", sales: [], totalSpent: 0, totalSmtps: 0, lastPurchase: sale.date };
      }
      map[key].sales.push(sale);
      map[key].totalSpent += sale.totalPrice;
      map[key].totalSmtps += sale.smtpIds.length;
      if (new Date(sale.date) > new Date(map[key].lastPurchase)) map[key].lastPurchase = sale.date;
      if (sale.buyerEmail && !map[key].email) map[key].email = sale.buyerEmail;
    }
    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [customers, search]);

  const totalRevenue  = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpend      = customers.length > 0 ? totalRevenue / customers.length : 0;
  const topCustomer   = customers[0];

  const toggleCustomer = (name: string) => {
    setExpandedCustomer(p => p === name ? null : name);
    setExpandedSale(null);
  };
  const toggleSale = (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    setExpandedSale(p => p === saleId ? null : saleId);
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Customers", value: customers.length, sub: "Unique buyers",       icon: <Users className="h-4 w-4 text-primary" />,          cls: "text-foreground" },
          { label: "Total Revenue",   value: fmt(totalRevenue), sub: "From all customers",  icon: <DollarSign className="h-4 w-4 text-primary" />,      cls: "text-primary" },
          { label: "Avg Spend",       value: fmt(avgSpend),     sub: "Per customer",        icon: <ShoppingCart className="h-4 w-4 text-green-400" />,  cls: "text-green-400" },
          { label: "Top Buyer",       value: topCustomer?.name ?? "—", sub: topCustomer ? fmt(topCustomer.totalSpent) : "No sales yet", icon: <Users className="h-4 w-4 text-yellow-400" />, cls: "text-yellow-400 text-lg truncate" },
        ].map(k => (
          <Card key={k.label} className="rounded-none border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</CardTitle>
              {k.icon}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-3xl font-bold font-mono ${k.cls}`}>{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="rounded-none border-border bg-card">
        <CardHeader className="border-b border-border py-3 px-4 bg-muted/10">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Customers
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-7 rounded-none border-border text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {sales.length === 0 ? "No sales recorded yet." : "No customers match your search."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(customer => {
                const isCustOpen = expandedCustomer === customer.name;
                return (
                  <div key={customer.name}>
                    {/* ── Customer row ── */}
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => toggleCustomer(customer.name)}
                    >
                      <div className="text-muted-foreground w-4 shrink-0">
                        {isCustOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary uppercase">{customer.name.slice(0, 2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium truncate">{customer.name}</div>
                        {customer.email && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />{customer.email}
                          </div>
                        )}
                      </div>
                      <div className="text-center w-16 shrink-0">
                        <div className="font-mono font-bold text-sm">{customer.sales.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">sales</div>
                      </div>
                      <div className="text-center w-16 shrink-0">
                        <div className="font-mono font-bold text-sm">{customer.totalSmtps}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">SMTPs</div>
                      </div>
                      <div className="text-right w-28 shrink-0 hidden md:block">
                        <div className="text-xs text-muted-foreground">{new Date(customer.lastPurchase).toLocaleDateString()}</div>
                        <div className="text-[10px] text-muted-foreground/60 uppercase">last purchase</div>
                      </div>
                      <div className="text-right w-24 shrink-0">
                        <div className="font-mono font-bold text-primary">{fmt(customer.totalSpent)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">total</div>
                      </div>
                    </div>

                    {/* ── Expanded: list of sales ── */}
                    {isCustOpen && (
                      <div className="bg-muted/5 border-t border-border">
                        {customer.sales
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(sale => {
                            const isSaleOpen = expandedSale === sale.id;
                            const saleSmtps  = sale.smtpIds
                              .map(id => smtpMap.get(id))
                              .filter((s): s is typeof smtps[0] => !!s);

                            return (
                              <div key={sale.id} className="border-b border-border last:border-b-0">
                                {/* ── Sale header ── */}
                                <div
                                  className="flex items-center gap-3 px-4 py-2.5 pl-14 cursor-pointer hover:bg-muted/10 transition-colors"
                                  onClick={e => toggleSale(e, sale.id)}
                                >
                                  <div className="text-muted-foreground w-4 shrink-0">
                                    {isSaleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </div>
                                  <span className="font-mono text-xs text-primary font-bold w-32 shrink-0">{sale.saleId}</span>
                                  <span className="text-xs text-muted-foreground w-32 shrink-0">
                                    {new Date(sale.date).toLocaleDateString()}{" "}
                                    <span className="text-muted-foreground/50">
                                      {new Date(sale.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </span>
                                  <span className="text-xs text-muted-foreground flex-1">{sale.paymentMethod || "—"}</span>
                                  <Badge variant="outline" className="rounded-none text-[10px] font-mono border-border shrink-0">
                                    {sale.smtpIds.length} SMTPs
                                  </Badge>
                                  <span className="font-mono text-xs font-bold text-primary w-20 text-right shrink-0">
                                    {fmt(sale.totalPrice)}
                                  </span>
                                </div>

                                {/* ── Expanded: SMTP rows ── */}
                                {isSaleOpen && (
                                  <div className="pl-20 pr-4 pb-3">
                                    {saleSmtps.length === 0 ? (
                                      <p className="text-xs text-muted-foreground py-2">No SMTP data found for this sale.</p>
                                    ) : (
                                      <div className="border border-border rounded-none overflow-hidden">
                                        {/* Header */}
                                        <div className="grid grid-cols-[2fr_1fr_2fr_2fr_1fr_1fr] gap-2 px-3 py-1.5 bg-muted/20 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                          <span>Host : Port</span>
                                          <span>Category</span>
                                          <span>Username</span>
                                          <span>Password</span>
                                          <span className="text-right">Price</span>
                                          <span className="text-right">Copy</span>
                                        </div>
                                        {/* Rows */}
                                        {saleSmtps.map(smtp => (
                                          <div
                                            key={smtp.id}
                                            className="grid grid-cols-[2fr_1fr_2fr_2fr_1fr_1fr] gap-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors text-xs"
                                          >
                                            {/* Host:Port */}
                                            <div className="font-mono truncate flex items-center gap-1">
                                              <span className="text-foreground">{smtp.host}</span>
                                              <span className="text-muted-foreground/50">:{smtp.port}</span>
                                            </div>
                                            {/* Category */}
                                            <div>
                                              <span className={`text-[10px] px-1.5 py-0.5 border font-medium uppercase ${CATEGORY_COLORS[smtp.category]}`}>
                                                {smtp.category}
                                              </span>
                                            </div>
                                            {/* Username */}
                                            <div className="font-mono truncate flex items-center text-cyan-300">
                                              {smtp.username}
                                              <CopyBtn text={smtp.username} />
                                            </div>
                                            {/* Password */}
                                            <div>
                                              <PasswordCell password={smtp.password} />
                                            </div>
                                            {/* Price */}
                                            <div className="text-right font-mono text-primary">
                                              {fmt(smtp.price)}
                                            </div>
                                            {/* Copy full line */}
                                            <div className="text-right">
                                              <CopyBtn text={`${smtp.host}|${smtp.port}|${smtp.username}|${smtp.password}`} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {sale.notes && (
                                      <p className="text-xs text-muted-foreground mt-2 italic">Note: {sale.notes}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
