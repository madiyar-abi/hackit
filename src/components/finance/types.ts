export interface BudgetItem {
  name: string;
  type: string;
  byMonth: number[];
  total: number;
}

export interface BudgetData {
  limit: number;
  months: number;
  total: number;
  capex: number;
  opex: number;
  byMonth: number[];
  items: BudgetItem[];
}

export interface Scenario {
  key: string;
  name: string;
  revenueUplift: number;
  grossProfitEffect: number;
  lossReduction: number;
  annualOpex: number;
  netAnnualEffect: number;
  roiYear1: number;
  paybackMonths: number;
}

export interface Assumption {
  name: string;
  unit: string;
  values: number[];
}

export interface RevenueBasis {
  reps: number;
  outletsPerRep: number;
  outlets: number;
  salesPerOutletMonth: number;
  monthlyRevenue: number;
  annualRevenue: number;
  revenuePerRepMonth: number;
  freezerOutletShare: number;
}

export interface Breakeven {
  horizonMonthsAfterLaunch: number;
  rampMonths: number;
  requiredGrossAnnualEffect: number;
  requiredNetAnnualEffect12m: number;
  minUpliftPct12m: number;
  minUpliftPctNoOtherEffects: number;
  netAnnualEffectNoFreezers: number;
  paybackMonthsNoFreezers: number | null;
  paybackMonthFromStartNoFreezers: number | null;
}

export interface FinanceSummary {
  currency: string;
  budget: BudgetData;
  scenarios: Scenario[];
  assumptions: Assumption[];
  revenueBasis?: RevenueBasis;
  breakeven?: Breakeven;
  cashflow: { rampMonths: number; paybackMonth: number | null; npv: number };
}
