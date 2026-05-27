import { useState, useMemo } from "react";
import { useStore } from "@/hooks/use-store";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Copy, Check, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sale } from "@/lib/types";

function CopySaleBtn({ sale, smtps, currency }: { sale: Sale; smtps: ReturnType<typeof useStore>["smtps"]; currency: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const soldItems = smtps.filter(s => sale.smtpIds.includes(s.id));
    const lines = soldItems.map(s => `${s.host}|${s.port}|${s.username}|${s.password}`).join("\n");
    navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <button onClick={copy} title="Copy SMTPs (host|port|user|pass)" className="text-muted-foreground hover:text-primary transition-colors">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function History() {
  const { sales, smtps, settings } = useStore();
  const { toast } = useToast();
  const [searchRaw, setSearchRaw] = useState("");
  const search = useDebounce(searchRaw, 250);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: settings.currency }).format(n);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sales;
    return sales.filter(s =>
      s.buyerName.toLowerCase().includes(q) ||
      s.saleId.toLowerCase().includes(q) ||
      s.paymentMethod.toLowerCase().includes(q) ||
      (s.buyerEmail && s.buyerEmail.toLowerCase().includes(q))
    );
  }, [sales, search]);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Sale ID", "Date", "Buyer Name", "Buyer Email", "Payment Method", "Items", "Total Price"];
    const rows = filtered.map(s => [
      s.saleId, new Date(s.date).toISOString(), s.buyerName,
      s.buyerEmail || "", s.paymentMethod, s.smtpIds.length, s.totalPrice
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `smtp_sales_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const copyInvoice = (sale: Sale) => {
    const soldItems = smtps.filter(s => sale.smtpIds.includes(s.id));
    let text = `=================================\n`;
    text += `RECEIPT: ${sale.saleId}\n`;
    text += `DATE: ${new Date(sale.date).toLocaleString()}\n`;
    text += `BUYER: ${sale.buyerName}\n`;
    text += `=================================\n\n`;
    soldItems.forEach((item, i) => {
      text += `${i + 1}. ${item.host}|${item.port}|${item.username}|${item.password}\n`;
    });
    text += `\n=================================\n`;
    text += `TOTAL: ${fmt(sale.totalPrice)}\n`;
    text += `PAID VIA: ${sale.paymentMethod}\n`;
    text += `=================================\n`;
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: "Copied", description: "Invoice copied to clipboard." })
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Sales History</h1>
          <p className="text-xs text-muted-foreground mt-1">{sales.length} total transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search buyer, ID, method..."
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              className="pl-8 rounded-none border-border text-xs h-9"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-none border-border h-9"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="rounded-none border-border bg-card">
        <CardHeader className="py-3 px-4 border-b border-border">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {filtered.length} of {sales.length} transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[90px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {sales.length === 0 ? "No sales recorded yet." : "No results found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sale) => (
                    <TableRow key={sale.id} className="group">
                      <TableCell className="font-mono text-xs text-primary font-bold">{sale.saleId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sale.date).toLocaleDateString()}{" "}
                        <span className="text-muted-foreground/50">
                          {new Date(sale.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{sale.buyerName}</TableCell>
                      <TableCell className="text-xs uppercase">{sale.paymentMethod || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{sale.smtpIds.length}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary text-sm">{fmt(sale.totalPrice)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <CopySaleBtn sale={sale} smtps={smtps} currency={settings.currency} />
                          <button onClick={() => copyInvoice(sale)} title="Copy Invoice" className="text-muted-foreground hover:text-yellow-400 transition-colors">
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
