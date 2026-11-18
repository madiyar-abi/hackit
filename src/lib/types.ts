// Domain model of «Пульс продаж». All amounts in ₸, periods are months "YYYY-MM".

export type OutletType = "супермаркет" | "магазин" | "минимаркет" | "киоск";

export interface Manager {
  id: string;
  name: string;
  role: string; // «Руководитель отдела продаж», «Супервайзер»
  telegram: string;
  email: string;
}

export interface Rep {
  id: string;
  name: string;
  district: string;
  supervisorId: string;
  hiredAt: string; // YYYY-MM-DD
  phone: string;
}

export interface Outlet {
  id: string;
  name: string;
  type: OutletType;
  address: string;
  district: string;
  repId: string;
  lat: number;
  lng: number;
  /** By company standard this outlet type must have a company freezer. */
  freezerRequired: boolean;
}

export interface FreezerAudit {
  date: string; // YYYY-MM-DD
  found: boolean; // freezer physically present at the outlet
  ourProductSharePct: number; // share of shelf space with our products, 0..100
  competitorProduct: boolean;
  note?: string;
}

export interface Freezer {
  id: string;
  outletId: string;
  model: string;
  installedAt: string; // YYYY-MM-DD
  lastAudit?: FreezerAudit;
}

export interface SalesRecord {
  outletId: string;
  repId: string;
  period: string;
  amount: number; // shipments (sales) of our products to the outlet, ₸
  orders: number;
}

export interface RepPlan {
  repId: string;
  period: string;
  plan: number; // ₸
}

export interface Visit {
  id: string;
  repId: string;
  outletId: string;
  period: string;
  date: string; // YYYY-MM-DD
  plannedTime: string; // HH:MM
  status: "done" | "missed";
  checkInTime?: string; // HH:MM
  gps?: { lat: number; lng: number };
  /** Distance between check-in GPS and outlet coordinates, metres. */
  distanceM?: number;
  note?: string;
}

export interface Dataset {
  company: string;
  periods: string[]; // ascending
  currentPeriod: string;
  previousPeriod: string;
  managers: Manager[];
  reps: Rep[];
  outlets: Outlet[];
  freezers: Freezer[];
  sales: SalesRecord[];
  plans: RepPlan[];
  visits: Visit[];
}

export type DeviationType =
  | "missed_visits"
  | "sales_drop"
  | "no_freezer"
  | "freezer_no_sales"
  | "plan_underperformance"
  | "gps_mismatch";

export type Severity = "critical" | "high" | "medium";

export interface Cause {
  title: string;
  evidence: string[];
  confidence: "высокая" | "средняя" | "низкая";
}

export interface Deviation {
  id: string;
  type: DeviationType;
  severity: Severity;
  period: string;
  title: string;
  description: string;
  repId: string;
  outletId?: string;
  /** Estimated sales at risk / lost per month, ₸. */
  impact: number;
  metrics: Record<string, number | string>;
  detectedAt: string; // ISO datetime (simulated)
}

export interface Alert extends Deviation {
  causes: Cause[];
  actions: string[];
}

export type Channel = "telegram" | "email";

export interface NotificationMessage {
  id: string;
  alertId: string;
  channel: Channel;
  recipientId: string;
  recipientName: string;
  address: string; // @telegram or e-mail
  subject: string;
  text: string;
  severity: Severity;
  sentAt: string; // ISO datetime (simulated)
}
