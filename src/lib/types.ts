export type SmtpType = "gmail" | "yahoo" | "outlook" | "hotmail" | "custom";
export type SmtpStatus = "available" | "sold";
export type SmtpCategory = "cracked" | "created" | "old";

export interface Smtp {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  type: SmtpType;
  category: SmtpCategory;
  status: SmtpStatus;
  price: number;
  notes: string;
  addedDate: string;
}

export interface Sale {
  id: string;
  saleId: string;
  buyerName: string;
  buyerEmail: string;
  smtpIds: string[];
  totalPrice: number;
  date: string;
  notes: string;
  paymentMethod: string;
}

export interface Settings {
  defaultPrice: number;
  currency: string;
  lowStockThreshold: number;
}

export interface StoreData {
  smtps: Smtp[];
  sales: Sale[];
  settings: Settings;
  customerNotes: Record<string, string>;
}
