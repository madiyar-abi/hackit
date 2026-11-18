const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** 12 345 678 ₸ */
export const fmtMoney = (n: number) => `${nf.format(Math.round(n)).replace(/ | /g, " ")} ₸`;
/** 12,3 млн ₸ */
export const fmtMln = (n: number) => `${(n / 1_000_000).toFixed(1).replace(".", ",")} млн ₸`;
/** 0.345 → 35% */
export const fmtPct = (x: number) => `${Math.round(x * 100)}%`;
export const fmtNum = (n: number) => nf.format(Math.round(n)).replace(/ | /g, " ");
/** "2026-10-14" → "14.10.2026" */
export const fmtDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
