/** Format number as "12 345 678 ₸" */
export function fmtTenge(n: number): string {
  const str = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${str} ₸`;
}

/** Format number as "12 345" (no currency) */
export function fmtNum(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Format as "12,3 млн ₸" */
export function fmtMln(n: number): string {
  return `${(n / 1_000_000).toFixed(1).replace(".", ",")} млн ₸`;
}

/** Format ROI as percentage, e.g. 2.22 → "222%" */
export function fmtRoi(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** Format payback as "3,7 мес." */
export function fmtPayback(months: number): string {
  return `${months.toFixed(1).replace(".", ",")} мес.`;
}
