import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Smtp, Sale, Settings, StoreData, SmtpCategory, SmtpType } from '@/lib/types';

const defaultSettings: Settings = {
  defaultPrice: 0.35,
  currency: 'USD',
  lowStockThreshold: 50,
};

const getInitialData = (): StoreData => {
  try {
    const data = localStorage.getItem('smtp_manager_data');
    if (data) {
      const parsed = JSON.parse(data) as Partial<StoreData>;
      return {
        smtps: parsed.smtps ?? [],
        sales: parsed.sales ?? [],
        settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
        customerNotes: parsed.customerNotes ?? {},
      };
    }
  } catch (e) {
    console.error('Failed to parse local storage', e);
  }
  return { smtps: [], sales: [], settings: defaultSettings, customerNotes: {} };
};

function detectSmtpType(host: string): SmtpType {
  const h = host.toLowerCase();
  if (h.includes('gmail') || h.includes('google')) return 'gmail';
  if (h.includes('yahoo')) return 'yahoo';
  if (h.includes('outlook') || h.includes('office365') || h.includes('live')) return 'outlook';
  if (h.includes('hotmail')) return 'hotmail';
  return 'custom';
}

export function convertOldBackup(raw: Record<string, unknown>): StoreData | null {
  if (!raw.available && !raw.sold && !raw.old && !raw.salesHistory) return null;

  const convertSmtpItem = (item: unknown, status: 'available' | 'sold', overrideCategory?: SmtpCategory): Smtp => {
    const s = item as Record<string, unknown>;
    const rawType = (s.type as string) ?? '';
    const category: SmtpCategory = overrideCategory
      ?? (rawType.toLowerCase() === 'cracked' ? 'cracked' : rawType.toLowerCase() === 'old' ? 'old' : 'created');
    const host = (s.host as string) ?? '';
    return {
      id: (s.id as string) ?? crypto.randomUUID(),
      host,
      port: parseInt(String(s.port ?? 587), 10),
      username: (s.username as string) ?? '',
      password: (s.password as string) ?? '',
      type: detectSmtpType(host),
      category,
      status,
      price: typeof s.price === 'number' ? s.price : 0.35,
      notes: (s.notes as string) ?? '',
      addedDate: (s.addedDate as string) ?? new Date().toISOString(),
    };
  };

  const convertArr = (arr: unknown[], status: 'available' | 'sold', overrideCategory?: SmtpCategory): Smtp[] =>
    Array.isArray(arr) ? arr.map(item => convertSmtpItem(item, status, overrideCategory)) : [];

  const salesHistoryRaw = Array.isArray(raw.salesHistory)
    ? (raw.salesHistory as Record<string, unknown>[])
    : [];

  const soldFromHistory: Smtp[] = [];
  const soldIdsSeen = new Set<string>();
  for (const sale of salesHistoryRaw) {
    const items = Array.isArray(sale.items) ? (sale.items as unknown[]) : [];
    for (const item of items) {
      const smtp = convertSmtpItem(item, 'sold');
      if (!soldIdsSeen.has(smtp.id)) {
        soldIdsSeen.add(smtp.id);
        soldFromHistory.push(smtp);
      }
    }
  }

  const soldFromArr = convertArr((raw.sold as unknown[]) ?? [], 'sold');
  const oldArr = convertArr((raw.old as unknown[]) ?? [], 'available', 'old');

  const availableRaw = convertArr((raw.available as unknown[]) ?? [], 'available');
  const allSoldIds = new Set([
    ...soldFromHistory.map(s => s.id),
    ...soldFromArr.map(s => s.id),
  ]);
  const availableFiltered = availableRaw.filter(s => !allSoldIds.has(s.id));

  const smtps: Smtp[] = [
    ...availableFiltered,
    ...soldFromArr,
    ...soldFromHistory,
    ...oldArr,
  ];

  const salesFromHistory: Sale[] = salesHistoryRaw.map((s) => {
    const items = Array.isArray(s.items) ? (s.items as Record<string, unknown>[]) : [];
    const smtpIds = items.map(i => (i.id as string) ?? '').filter(Boolean);
    return {
      id: crypto.randomUUID(),
      saleId: (s.saleId as string) ?? `SALE-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      buyerName: (s.buyerName as string) ?? '',
      buyerEmail: (s.buyerEmail as string) ?? '',
      smtpIds,
      totalPrice: typeof s.totalPrice === 'number' ? s.totalPrice : 0,
      date: (s.saleDate as string) ?? (s.date as string) ?? new Date().toISOString(),
      notes: (s.notes as string) ?? '',
      paymentMethod: (s.paymentMethod as string) ?? '',
    };
  });

  const salesFromArr: Sale[] = (Array.isArray(raw.sales) ? (raw.sales as Record<string, unknown>[]) : []).map((s) => ({
    id: (s.id as string) ?? crypto.randomUUID(),
    saleId: (s.saleId as string) ?? '',
    buyerName: (s.buyerName as string) ?? '',
    buyerEmail: (s.buyerEmail as string) ?? '',
    smtpIds: Array.isArray(s.smtpIds) ? (s.smtpIds as string[]) : [],
    totalPrice: typeof s.totalPrice === 'number' ? s.totalPrice : 0,
    date: (s.saleDate as string) ?? (s.date as string) ?? new Date().toISOString(),
    notes: (s.notes as string) ?? '',
    paymentMethod: (s.paymentMethod as string) ?? '',
  }));

  const sales: Sale[] = [...salesFromHistory, ...salesFromArr];

  return { smtps, sales, settings: defaultSettings, customerNotes: {} };
}

interface StoreContextValue extends StoreData {
  addSmtps: (smtps: Smtp[]) => { added: number; duplicates: number };
  updateSmtp: (id: string, updates: Partial<Smtp>) => void;
  deleteSmtp: (id: string) => void;
  addSale: (sale: Sale) => void;
  updateSettings: (settings: Settings) => void;
  updateCustomerNote: (buyerName: string, note: string) => void;
  importData: (data: StoreData) => void;
  clearData: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(getInitialData);

  useEffect(() => {
    localStorage.setItem('smtp_manager_data', JSON.stringify(data));
  }, [data]);

  const addSmtps = useCallback((newSmtps: Smtp[]) => {
    let added = 0;
    let duplicates = 0;
    setData((prev) => {
      const existing = new Set(prev.smtps.map(s => `${s.host}:${s.port}:${s.username}`));
      const toAdd = newSmtps.filter(s => {
        const key = `${s.host}:${s.port}:${s.username}`;
        if (existing.has(key)) { duplicates++; return false; }
        existing.add(key);
        added++;
        return true;
      });
      return { ...prev, smtps: [...toAdd, ...prev.smtps] };
    });
    return { added, duplicates };
  }, []);

  const updateSmtp = useCallback((id: string, updates: Partial<Smtp>) => {
    setData((prev) => ({
      ...prev,
      smtps: prev.smtps.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  }, []);

  const deleteSmtp = useCallback((id: string) => {
    setData((prev) => ({ ...prev, smtps: prev.smtps.filter(s => s.id !== id) }));
  }, []);

  const addSale = useCallback((sale: Sale) => {
    setData((prev) => ({
      ...prev,
      smtps: prev.smtps.map(s => sale.smtpIds.includes(s.id) ? { ...s, status: 'sold' as const } : s),
      sales: [sale, ...prev.sales],
    }));
  }, []);

  const updateSettings = useCallback((settings: Settings) => {
    setData((prev) => ({ ...prev, settings }));
  }, []);

  const updateCustomerNote = useCallback((buyerName: string, note: string) => {
    setData((prev) => ({
      ...prev,
      customerNotes: { ...prev.customerNotes, [buyerName.trim().toLowerCase()]: note },
    }));
  }, []);

  const importData = useCallback((newData: StoreData) => {
    setData({
      ...newData,
      settings: { ...defaultSettings, ...(newData.settings ?? {}) },
      customerNotes: newData.customerNotes ?? {},
    });
  }, []);

  const clearData = useCallback(() => {
    setData({ smtps: [], sales: [], settings: defaultSettings, customerNotes: {} });
  }, []);

  return (
    <StoreContext.Provider value={{ ...data, addSmtps, updateSmtp, deleteSmtp, addSale, updateSettings, updateCustomerNote, importData, clearData }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
