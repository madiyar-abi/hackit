const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const NBSP = " ";

/** 12 345 678 ₸ (non-breaking spaces, never wraps mid-number) */
export const fmtMoney = (n: number) => `${fmtNum(n)}${NBSP}₸`;
/** 12,3 млн ₸ */
export const fmtMln = (n: number) => `${(n / 1_000_000).toFixed(1).replace(".", ",")}${NBSP}млн${NBSP}₸`;
/** 0.345 → 35% */
export const fmtPct = (x: number) => `${Math.round(x * 100)}%`;
export const fmtNum = (n: number) => nf.format(Math.round(n)).replace(/\s/g, NBSP);
/** 6312 → "6,3 км" */
export const fmtKm = (m: number) => `${(m / 1000).toFixed(1).replace(".", ",")}${NBSP}км`;
/** "2026-10-14" → "14.10.2026" */
export const fmtDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/** Russian plural: plural(5, ["визит", "визита", "визитов"]) → "5 визитов" */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  const f = a > 10 && a < 20 ? forms[2] : b === 1 ? forms[0] : b >= 2 && b <= 4 ? forms[1] : forms[2];
  return `${n} ${f}`;
}
