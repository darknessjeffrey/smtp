import { useMemo, useState } from "react";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, DollarSign, Database, ShoppingCart, TrendingUp, Users, Layers, Zap, Clock, AlertTriangle } from "lucide-react";

type Range = "all" | "week" | "month" | "30d" | "90d";

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "week") { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; }
  if (r === "month") { return new Date(now.getFullYear(), now.getMonth(), 1); }
  if (r === "30d")  { const d = new Date(now); d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; }
  if (r === "90d")  { const d = new Date(now); d.setDate(d.getDate() - 89); d.setHours(0,0,0,0); return d; }
  return null;
}

export default function Dashboard() {
  const { smtps, sales, settings } = useStore();
  const [range, setRange] = useState<Range>("all");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: settings.currency }).format(n);

  const threshold = settings.lowStockThreshold ?? 50;

  const availableSmtps = useMemo(() => smtps.filter(s => s.status === "available"), [smtps]);
  const soldSmtps      = useMemo(() => smtps.filter(s => s.status === "sold"), [smtps]);
  const availableCount = availableSmtps.length;
  const soldCount      = soldSmtps.length;
  const totalSmtps     = smtps.length;
  const potentialValue = useMemo(() => availableSmtps.reduce((s, x) => s + x.price, 0), [availableSmtps]);

  const cutoff = useMemo(() => rangeStart(range), [range]);

  const filteredSales = useMemo(
    () => cutoff ? sales.filter(s => new Date(s.date) >= cutoff) : sales,
    [sales, cutoff]
  );

  const totalRevenue  = useMemo(() => filteredSales.reduce((s, x) => s + x.totalPrice, 0), [filteredSales]);
  const avgSaleValue  = filteredSales.length ? totalRevenue / filteredSales.length : 0;

  const now = new Date();
  const thisMonthSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [sales]);
  const thisMonthRevenue = useMemo(() => thisMonthSales.reduce((s, x) => s + x.totalPrice, 0), [thisMonthSales]);

  const categories = ["created", "cracked", "old"] as const;
  const catStats = useMemo(() => categories.map(cat => {
    const all   = smtps.filter(s => s.category === cat);
    const avail = all.filter(s => s.status === "available");
    const sold  = all.filter(s => s.status === "sold");
    return { cat, total: all.length, avail: avail.length, sold: sold.length, value: avail.reduce((s, x) => s + x.price, 0) };
  }), [smtps]);

  const CAT_STYLE: Record<string, string> = {
    created: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    cracked: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    old:     "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  };

  const providerStats = useMemo(() => {
    const map: Record<string, { total: number; avail: number }> = {};
    smtps.forEach(s => {
      if (!map[s.type]) map[s.type] = { total: 0, avail: 0 };
      map[s.type].total++;
      if (s.status === "available") map[s.type].avail++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [smtps]);

  const topBuyers = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.buyerName]) map[s.buyerName] = { count: 0, total: 0 };
      map[s.buyerName].count++;
      map[s.buyerName].total += s.totalPrice;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  }, [filteredSales]);

  const recentSales = useMemo(() => filteredSales.slice(0, 6), [filteredSales]);
  const sellRatio   = totalSmtps > 0 ? Math.round((soldCount / totalSmtps) * 100) : 0;
  const lowStock    = availableCount > 0 && availableCount < threshold;

  const RANGE_LABELS: Record<Range, string> = {
    all: "All Time", week: "This Week", month: "This Month", "30d": "Last 30 Days", "90d": "Last 90 Days",
  };

  return (
    <div className="space-y-4">

      {/* Low stock alert */}
      {lowStock && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-sm font-mono">
            ⚠ Low stock — only <strong>{availableCount}</strong> available SMTPs left (threshold: {threshold})
          </span>
        </div>
      )}

      {/* Range filter */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Overview</p>
        <Select value={range} onValueChange={v => setRange(v as Range)}>
          <SelectTrigger className="w-[150px] rounded-none border-border h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none border-border">
            {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
              <SelectItem key={r} value={r} className="text-xs">{RANGE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Inventory</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold font-mono">{totalSmtps.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-400">{availableCount.toLocaleString()} avail</span>
              <span className="mx-1 text-border">·</span>
              <span className="text-red-400">{soldCount.toLocaleString()} sold</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Revenue · {RANGE_LABELS[range]}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold font-mono text-primary">{fmt(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{filteredSales.length} sales · avg {fmt(avgSaleValue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold font-mono text-green-400">{fmt(thisMonthRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{thisMonthSales.length} sales this month</p>
          </CardContent>
        </Card>

        <Card className="bg-card rounded-none border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Potential Value</CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold font-mono text-yellow-400">{fmt(potentialValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">If all {availableCount} available sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card rounded-none border-border">
          <CardHeader className="border-b border-border py-3 px-4 bg-muted/10">
            <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {catStats.every(c => c.total === 0) ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
            ) : (
              <div className="divide-y divide-border">
                {catStats.map(({ cat, total, avail, sold, value }) => (
                  <div key={cat} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={`rounded-none text-[10px] uppercase border font-bold ${CAT_STYLE[cat]}`}>{cat}</Badge>
                      <span className="font-mono font-bold text-sm">{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span><span className="text-green-400 font-mono">{avail}</span> avail · <span className="text-red-400 font-mono">{sold}</span> sold</span>
                      <span className="text-primary font-mono">{fmt(value)}</span>
                    </div>
                    {total > 0 && (
                      <div className="h-1 bg-border rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.round((avail / total) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-none border-border">
          <CardHeader className="border-b border-border py-3 px-4 bg-muted/10">
            <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Provider Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {providerStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No data</div>
            ) : (
              <div className="divide-y divide-border">
                {providerStats.map(([type, { total, avail }]) => (
                  <div key={type} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono uppercase tracking-wider">{type}</span>
                      <span className="font-mono font-bold text-sm">{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span><span className="text-green-400 font-mono">{avail}</span> available</span>
                      <span>{total > 0 ? Math.round((avail / total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${total > 0 ? Math.round((avail / total) * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card rounded-none border-border">
            <CardHeader className="border-b border-border py-3 px-4 bg-muted/10">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> Sell Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-bold font-mono text-primary">{sellRatio}%</span>
                <span className="text-xs text-muted-foreground pb-1">of inventory sold</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${sellRatio}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{availableCount.toLocaleString()} available</span>
                <span>{soldCount.toLocaleString()} sold</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-none border-border">
            <CardHeader className="border-b border-border py-3 px-4 bg-muted/10">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Top Buyers · {RANGE_LABELS[range]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topBuyers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">No sales in this period</div>
              ) : (
                <div className="divide-y divide-border">
                  {topBuyers.map(([name, { count, total }]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <div className="text-xs font-mono truncate max-w-[110px]" title={name}>{name}</div>
                        <div className="text-[10px] text-muted-foreground">{count} sale{count !== 1 ? "s" : ""}</div>
                      </div>
                      <span className="text-xs font-mono text-primary font-bold">{fmt(total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Sales */}
      <Card className="bg-card rounded-none border-border">
        <CardHeader className="border-b border-border py-3 px-4 bg-muted/10">
          <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Sales · {RANGE_LABELS[range]}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentSales.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No sales in this period</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[110px]">Sale ID</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-center">SMTPs</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-primary text-xs">{sale.saleId}</TableCell>
                    <TableCell className="font-medium text-sm">{sale.buyerName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sale.paymentMethod || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="rounded-none text-[10px] font-mono border-border">{sale.smtpIds.length}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(sale.date).toLocaleDateString()}{" "}
                      {new Date(sale.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-primary">{fmt(sale.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
