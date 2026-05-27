import { useState, useMemo, useCallback } from "react";
import { useStore } from "@/hooks/use-store";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit2, Trash2, Check, X, Eye, EyeOff, Copy, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Smtp, SmtpCategory, SmtpStatus } from "@/lib/types";

const PAGE_SIZE = 50;

const STATUS_STYLES: Record<SmtpStatus, string> = {
  available: "bg-green-500/10 text-green-500 border-green-500/20",
  sold:      "bg-red-500/10 text-red-500 border-red-500/20",
};
const CATEGORY_STYLES: Record<SmtpCategory, string> = {
  created: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  cracked: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  old:     "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button onClick={copy} className="ml-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function PasswordCell({ password }: { password: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1 font-mono text-xs min-w-[120px]">
      <span className={show ? "text-yellow-300" : "text-muted-foreground tracking-widest select-none"}>
        {show ? password : "••••••••••"}
      </span>
      <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-primary shrink-0">
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
      {show && <CopyBtn text={password} />}
    </div>
  );
}

export default function Smtps() {
  const { smtps, deleteSmtp, updateSmtp, settings } = useStore();
  const [searchRaw, setSearchRaw]     = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editPrice, setEditPrice]     = useState("");
  const [page, setPage]               = useState(1);

  const search = useDebounce(searchRaw, 250);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return smtps.filter(s => {
      if (q && !s.host.toLowerCase().includes(q) && !s.username.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      return true;
    });
  }, [smtps, search, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const resetPage = useCallback(() => setPage(1), []);

  const startEdit = (s: Smtp) => { setEditingId(s.id); setEditPrice(s.price.toString()); };
  const saveEdit  = (id: string) => {
    const p = parseFloat(editPrice);
    if (!isNaN(p)) updateSmtp(id, { price: p });
    setEditingId(null);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: settings.currency }).format(n);

  const exportTxt = () => {
    if (filtered.length === 0) return;
    const lines = filtered.map(s => `${s.host}|${s.port}|${s.username}|${s.password}`).join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `smtps_${statusFilter}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight uppercase">SMTP Library</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search host or user..."
              className="pl-9 rounded-none border-border text-sm"
              value={searchRaw}
              onChange={e => { setSearchRaw(e.target.value); resetPage(); }}
            />
          </div>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[120px] rounded-none border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-border">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="cracked">Cracked</SelectItem>
              <SelectItem value="old">Old</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[110px] rounded-none border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-border h-9"
            onClick={exportTxt}
            disabled={filtered.length === 0}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export TXT ({filtered.length})
          </Button>
        </div>
      </div>

      <Card className="rounded-none border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {filtered.length.toLocaleString()} SMTPs · Page {safePage}/{totalPages}
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">{safePage} / {totalPages}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Cat</TableHead>
                  <TableHead>Host:Port</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="hidden lg:table-cell">Added</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[50px] text-center">Copy</TableHead>
                  <TableHead className="w-[70px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                      No SMTPs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((s) => (
                    <TableRow key={s.id} className="group">
                      <TableCell>
                        <Badge variant="outline" className={`rounded-none text-[10px] uppercase border ${STATUS_STYLES[s.status]}`}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-none text-[10px] uppercase border ${CATEGORY_STYLES[s.category]}`}>
                          {s.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{s.host}:{s.port}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[160px] truncate text-cyan-300" title={s.username}>
                        {s.username}
                      </TableCell>
                      <TableCell><PasswordCell password={s.password} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(s.addedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === s.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={e => setEditPrice(e.target.value)}
                              className="w-16 h-7 text-xs rounded-none text-right px-1"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => saveEdit(s.id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="font-mono text-xs font-bold text-primary">{fmt(s.price)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <CopyBtn text={`${s.host}|${s.port}|${s.username}|${s.password}`} />
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId !== s.id && (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {s.status !== "sold" && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary" onClick={() => startEdit(s)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => deleteSmtp(s.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Showing {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(1)} disabled={safePage === 1}>First</Button>
                <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-none h-7 text-xs" onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>Last</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
