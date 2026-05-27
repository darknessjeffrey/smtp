import { useState, useRef } from "react";
import { useStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, AlertTriangle, Save } from "lucide-react";
import { Settings as SettingsType } from "@/lib/types";
import { convertOldBackup } from "@/hooks/use-store";

export default function Settings() {
  const store = useStore();
  const { settings, updateSettings, importData, clearData } = store;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SettingsType>(settings);

  const handleSave = () => {
    updateSettings(form);
    toast({ title: "Settings Saved", description: "Your preferences have been updated." });
  };

  const handleExport = () => {
    const data = { smtps: store.smtps, sales: store.sales, settings: store.settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smtp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // New format: { smtps, sales, settings }
        if (data.smtps && data.sales && data.settings) {
          importData(data);
          setForm(data.settings);
          toast({ title: "Backup Restored", description: `Loaded ${data.smtps.length} SMTPs and ${data.sales.length} sales.` });
          return;
        }

        // Old format: { available, sold, old, sales }
        const converted = convertOldBackup(data);
        if (converted) {
          importData(converted);
          setForm(converted.settings);
          toast({
            title: "Old Backup Restored",
            description: `Converted and loaded ${converted.smtps.length} SMTPs and ${converted.sales.length} sales.`,
          });
          return;
        }

        throw new Error("Invalid format");
      } catch (err) {
        toast({ variant: "destructive", title: "Import Failed", description: "The file is not a valid backup." });
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm("Are you sure? This will delete all SMTPs and Sales. This cannot be undone.")) {
      clearData();
      toast({ title: "Data Cleared", description: "All inventory and history deleted." });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight uppercase">Settings</h1>
      </div>

      <Card className="rounded-none border-border bg-card">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm font-medium uppercase tracking-wider">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Default Price</Label>
              <Input 
                type="number"
                value={form.defaultPrice}
                onChange={e => setForm({...form, defaultPrice: parseFloat(e.target.value) || 0})}
                className="rounded-none border-border focus-visible:ring-primary font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Currency</Label>
              <Input 
                value={form.currency}
                onChange={e => setForm({...form, currency: e.target.value.toUpperCase()})}
                className="rounded-none border-border focus-visible:ring-primary font-mono uppercase"
              />
            </div>
          </div>
          <Button onClick={handleSave} className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-none border-border bg-card">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm font-medium uppercase tracking-wider">Data Management</CardTitle>
          <CardDescription className="text-xs">Export or restore your full database.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleExport} className="rounded-none border-border">
              <Download className="w-4 h-4 mr-2" />
              Download Backup JSON
            </Button>
            
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportFile}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-none border-border">
              <Upload className="w-4 h-4 mr-2" />
              Restore from JSON
            </Button>
          </div>

          <div className="pt-6 border-t border-border">
            <div className="p-4 bg-destructive/10 border border-destructive/20 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-destructive flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Danger Zone
                </h4>
                <p className="text-xs text-destructive/80 mt-1">Permanently delete all local data.</p>
              </div>
              <Button variant="destructive" onClick={handleClear} className="rounded-none text-xs h-8">
                Wipe All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
