import { useState } from "react";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, PlusCircle } from "lucide-react";
import { SmtpCategory, SmtpType } from "@/lib/types";

function detectType(host: string): SmtpType {
  const h = host.toLowerCase();
  if (h.includes("gmail") || h.includes("google")) return "gmail";
  if (h.includes("yahoo")) return "yahoo";
  if (h.includes("outlook") || h.includes("office365") || h.includes("live")) return "outlook";
  if (h.includes("hotmail")) return "hotmail";
  return "custom";
}

export default function Import() {
  const { addSmtps, settings } = useStore();
  const { toast } = useToast();

  // Bulk import state
  const [bulkInput, setBulkInput] = useState("");
  const [bulkCategory, setBulkCategory] = useState<SmtpCategory>("created");
  const [parsing, setParsing] = useState(false);

  // Single add state
  const [singleHost, setSingleHost] = useState("");
  const [singlePort, setSinglePort] = useState("587");
  const [singleUser, setSingleUser] = useState("");
  const [singlePass, setSinglePass] = useState("");
  const [singleCategory, setSingleCategory] = useState<SmtpCategory>("created");
  const [singlePrice, setSinglePrice] = useState(String(settings.defaultPrice));

  const lineCount = bulkInput.split('\n').filter(l => l.trim()).length;

  const handleBulkImport = () => {
    if (!bulkInput.trim()) return;
    setParsing(true);
    setTimeout(() => {
      try {
        const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
        const smtps = lines.map(line => {
          const parts = line.split('|');
          if (parts.length < 4) throw new Error(`Invalid format: ${line}`);
          const [host, portStr, username, password] = parts;
          const port = parseInt(portStr, 10);
          if (isNaN(port)) throw new Error(`Invalid port: ${line}`);
          return {
            id: crypto.randomUUID(),
            host: host.trim(),
            port,
            username: username.trim(),
            password: password.trim(),
            type: detectType(host),
            category: bulkCategory,
            status: "available" as const,
            price: settings.defaultPrice,
            notes: "",
            addedDate: new Date().toISOString(),
          };
        });
        const { added, duplicates } = addSmtps(smtps);
        toast({
          title: "Import Complete",
          description: `Added ${added} SMTPs.${duplicates > 0 ? ` Skipped ${duplicates} duplicates.` : ''}`,
        });
        setBulkInput("");
      } catch (err) {
        toast({ variant: "destructive", title: "Import Failed", description: err instanceof Error ? err.message : "Invalid format." });
      } finally {
        setParsing(false);
      }
    }, 100);
  };

  const handleSingleAdd = () => {
    if (!singleHost.trim() || !singleUser.trim() || !singlePass.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Host, username and password are required." });
      return;
    }
    const port = parseInt(singlePort, 10);
    if (isNaN(port)) {
      toast({ variant: "destructive", title: "Error", description: "Invalid port number." });
      return;
    }
    const price = parseFloat(singlePrice) || settings.defaultPrice;
    const { added, duplicates } = addSmtps([{
      id: crypto.randomUUID(),
      host: singleHost.trim(),
      port,
      username: singleUser.trim(),
      password: singlePass.trim(),
      type: detectType(singleHost),
      category: singleCategory,
      status: "available" as const,
      price,
      notes: "",
      addedDate: new Date().toISOString(),
    }]);
    if (duplicates > 0) {
      toast({ variant: "destructive", title: "Duplicate", description: "This SMTP already exists." });
    } else if (added > 0) {
      toast({ title: "SMTP Added", description: `${singleHost} added successfully.` });
      setSingleHost(""); setSinglePort("587"); setSingleUser(""); setSinglePass("");
      setSinglePrice(String(settings.defaultPrice));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight uppercase">Import SMTPs</h1>
        <p className="text-muted-foreground text-sm mt-1">Bulk paste or add individually. Status is always <span className="text-green-400 font-mono">available</span>.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Import */}
        <Card className="rounded-none border-border bg-card">
          <CardHeader className="border-b border-border bg-muted/20 py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase tracking-wider">
              <Upload className="w-4 h-4 text-primary" />
              Bulk Import
            </CardTitle>
            <CardDescription className="font-mono text-xs">Format: host|port|username|password</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Category</Label>
              <Select value={bulkCategory} onValueChange={(v) => setBulkCategory(v as SmtpCategory)}>
                <SelectTrigger className="rounded-none border-border w-full" data-testid="select-bulk-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="cracked">Cracked</SelectItem>
                  <SelectItem value="old">Old</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`smtp.gmail.com|587|user@gmail.com|pass123\nsmtp.yahoo.com|465|user@yahoo.com|pass456`}
              className="font-mono text-xs min-h-[260px] rounded-none border-border focus-visible:ring-primary bg-background resize-y"
              data-testid="textarea-import"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{lineCount} lines</span>
              <Button
                onClick={handleBulkImport}
                disabled={!bulkInput.trim() || parsing}
                className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-xs tracking-wider"
                data-testid="btn-bulk-import"
              >
                <Upload className="w-4 h-4 mr-2" />
                {parsing ? "Processing..." : `Import${lineCount > 0 ? ` (${lineCount})` : ''}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Single Add */}
        <Card className="rounded-none border-border bg-card">
          <CardHeader className="border-b border-border bg-muted/20 py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-primary" />
              Add Single SMTP
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Category</Label>
              <Select value={singleCategory} onValueChange={(v) => setSingleCategory(v as SmtpCategory)}>
                <SelectTrigger className="rounded-none border-border w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="cracked">Cracked</SelectItem>
                  <SelectItem value="old">Old</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Host</Label>
                <Input value={singleHost} onChange={e => setSingleHost(e.target.value)} placeholder="smtp.gmail.com" className="rounded-none border-border font-mono text-xs" data-testid="input-single-host" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Port</Label>
                <Input value={singlePort} onChange={e => setSinglePort(e.target.value)} placeholder="587" className="rounded-none border-border font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Username</Label>
              <Input value={singleUser} onChange={e => setSingleUser(e.target.value)} placeholder="user@gmail.com" className="rounded-none border-border font-mono text-xs" data-testid="input-single-user" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Password</Label>
              <Input value={singlePass} onChange={e => setSinglePass(e.target.value)} placeholder="password" className="rounded-none border-border font-mono text-xs" data-testid="input-single-pass" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Price ({settings.currency})</Label>
              <Input type="number" value={singlePrice} onChange={e => setSinglePrice(e.target.value)} placeholder={String(settings.defaultPrice)} className="rounded-none border-border font-mono text-xs" />
            </div>
            <Button onClick={handleSingleAdd} className="w-full rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-xs tracking-wider" data-testid="btn-single-add">
              <PlusCircle className="w-4 h-4 mr-2" />
              Add SMTP
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
