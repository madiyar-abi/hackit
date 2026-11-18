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

export interface FinanceSummary {
  currency: string;
  budget: BudgetData;
  scenarios: Scenario[];
  assumptions: Assumption[];
}
