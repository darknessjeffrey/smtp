import { useState, useMemo, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/hooks/use-store";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, User, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { SmtpCategory, Smtp } from "@/lib/types";

const PAGE_SIZE = 50;

const CATEGORY_STYLES: Record<SmtpCategory, string> = {
  created: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  cracked: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  old:     "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

/* ── Memoised row — only re-renders if its own data changes ── */
const SmtpRow = memo(function SmtpRow({
  smtp, selected, onToggle, fmt,
}: {
  smtp: Smtp;
  selected: boolean;
  onToggle: (id: string) => void;
  fmt: (n: number) => string;
}) {
  return (
    <TableRow
      className={`cursor-pointer select-none ${selected ? "bg-primary/5" : ""}`}
      onClick={() => onToggle(smtp.id)}
    >
      <TableCell className="text-center w-10" onClick={e => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(smtp.id)}
          className="rounded-none border-primary data-[state=checked]:bg-primary"
        />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`rounded-none text-[10px] uppercase border ${CATEGORY_STYLES[smtp.category] ?? ""}`}>
          {smtp.category}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{smtp.host}</TableCell>
      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground truncate max-w-[140px]" title={smtp.username}>
        {smtp.username}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-primary">{fmt(smtp.price)}</TableCell>
    </TableRow>
  );
});

export default function NewSale() {
  const [, setLocation] = useLocation();
  const { smtps, addSale, settings } = useStore();
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<"all" | SmtpCategory>("all");
  const [searchRaw, setSearchRaw] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("crypto");
  const [customPrice, setCustomPrice] = useState("");
  const [quickQty, setQuickQty] = useState("");
  const [page, setPage] = useState(1);

  const search = useDebounce(searchRaw, 250);

  const fmt = useCallback(
    (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: settings.currency }).format(n),
    [settings.currency]
  );

  const availableSmtps = useMemo(() => smtps.filter(s => s.status === "available"), [smtps]);

  const filteredSmtps = useMemo(() => {
    const q = search.toLowerCase();
    return availableSmtps.filter(s => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (q && !s.host.toLowerCase().includes(q) && !s.username.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [availableSmtps, categoryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSmtps.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = useMemo(
    () => filteredSmtps.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredSmtps, safePage]
  );

  const { defaultTotal, crackedCount, createdCount, oldCount } = useMemo(() => {
    let total = 0;
    let cracked = 0, created = 0, old = 0;
    for (const s of availableSmtps) {
      if (selectedIds.has(s.id)) total += s.price;
      if (s.category === "cracked") cracked++;
      else if (s.category === "created") created++;
      else if (s.category === "old") old++;
    }
    return { defaultTotal: total, crackedCount: cracked, createdCount: created, oldCount: old };
  }, [availableSmtps, selectedIds]);

  const total = customPrice !== "" ? parseFloat(customPrice) || 0 : defaultTotal;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const quickSelect = useCallback(() => {
    const qty = parseInt(quickQty, 10);
    if (!qty || qty <= 0) return;
    setSelectedIds(new Set(filteredSmtps.slice(0, qty).map(s => s.id)));
  }, [quickQty, filteredSmtps]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectPageAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageItems.forEach(s => next.add(s.id));
      return next;
    });
  }, [pageItems]);

  const handleCreateSale = () => {
    if (selectedIds.size === 0) {
      toast({ variant: "destructive", title: "Error", description: "Select at least one SMTP." });
      return;
    }
    if (!buyerName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Buyer name is required." });
      return;
    }
    const saleId = `SALE-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    addSale({
      id: crypto.randomUUID(),
      saleId,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      smtpIds: Array.from(selectedIds),
      totalPrice: total,
      date: new Date().toISOString(),
      notes: "",
      paymentMethod,
    });
    toast({ title: "Sale Created", description: `${saleId} — ${selectedIds.size} SMTPs sold to ${buyerName}.` });
    setLocation("/history");
  };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">New Sale</h1>
          <p className="text-muted-foreground text-xs mt-0.5 font-mono">
            <span className="text-green-400">{availableSmtps.length}</span> avail ·{" "}
            <span className="text-cyan-400">{createdCount}</span> created ·{" "}
            <span className="text-purple-400">{crackedCount}</span> cracked ·{" "}
            <span className="text-yellow-400">{oldCount}</span> old
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Inventory Selector ── */}
        <div className="lg:col-span-2">
          <Card className="rounded-none border-border bg-card">
            <CardHeader className="border-b border-border py-3 px-3 space-y-2">
              {/* Filters row */}
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xs font-medium uppercase tracking-wider flex-1 min-w-[80px]">
                  Select Inventory
                </CardTitle>
                <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v as "all" | SmtpCategory); resetPage(); }}>
                  <SelectTrigger className="h-7 w-[100px] rounded-none border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="cracked">Cracked</SelectItem>
                    <SelectItem value="old">Old</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search..."
                  value={searchRaw}
                  onChange={e => { setSearchRaw(e.target.value); resetPage(); }}
                  className="h-7 w-28 rounded-none border-border text-xs"
                />
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-none" onClick={selectPageAll}>Page</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs rounded-none text-muted-foreground" onClick={clearSelection}>Clear</Button>
              </div>

              {/* Quick select row */}
              <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">Quick:</span>
                <Input
                  type="number"
                  min={1}
                  placeholder={`Max ${filteredSmtps.length}`}
                  value={quickQty}
                  onChange={e => setQuickQty(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && quickSelect()}
                  className="h-7 w-28 rounded-none border-border text-xs font-mono"
                />
                <Button
                  size="sm"
                  className="h-7 rounded-none bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase"
                  onClick={quickSelect}
                  disabled={!quickQty || parseInt(quickQty) <= 0}
                >
                  Select
                </Button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-primary font-mono ml-auto">{selectedIds.size} selected</span>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Pagination bar */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/5">
                <span className="text-xs text-muted-foreground">
                  {filteredSmtps.length.toLocaleString()} total · page {safePage}/{totalPages}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center font-mono">{safePage}/{totalPages}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_var(--border)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 text-center" />
                      <TableHead className="w-[80px]">Cat.</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead className="hidden sm:table-cell">Username</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                          No available inventory.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageItems.map(s => (
                        <SmtpRow
                          key={s.id}
                          smtp={s}
                          selected={selectedIds.has(s.id)}
                          onToggle={toggleSelect}
                          fmt={fmt}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Bottom pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                  <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(1)} disabled={safePage === 1}>First</Button>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>Last</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Buyer + Checkout ── */}
        <div className="space-y-4">
          <Card className="rounded-none border-border bg-card">
            <CardHeader className="border-b border-border py-3 px-4 bg-muted/20">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Buyer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Name / Handle *</Label>
                <Input
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="buyer_99"
                  className="rounded-none border-border font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Email (optional)</Label>
                <Input
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  className="rounded-none border-border font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">Payment Method</Label>
                <Input
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  placeholder="Crypto, PayPal…"
                  className="rounded-none border-border font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card">
            <CardHeader className="border-b border-border py-3 px-4 bg-primary/5">
              <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Checkout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Selected</span>
                <span className="font-mono font-bold text-xl">{selectedIds.size}</span>
              </div>
              <div className="space-y-1 pt-3 border-t border-border">
                <Label className="text-xs uppercase text-muted-foreground">Override Total</Label>
                <Input
                  type="number"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  placeholder={`Default: ${defaultTotal.toFixed(2)}`}
                  className="rounded-none border-border font-mono text-sm"
                />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-sm font-bold uppercase">Total</span>
                <span className="font-mono text-2xl text-primary font-bold">{fmt(total)}</span>
              </div>
              <Button
                onClick={handleCreateSale}
                className="w-full rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider uppercase"
                size="lg"
                disabled={selectedIds.size === 0 || !buyerName.trim()}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Complete Sale ({selectedIds.size})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
