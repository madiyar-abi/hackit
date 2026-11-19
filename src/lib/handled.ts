// «Отметить обработанным»: pure logic over the list of handled alert ids (stored in localStorage).
import type { Alert, Severity } from "./types";

export const HANDLED_KEY = "puls.handledAlerts.v1";

export function parseHandled(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))] : [];
  } catch {
    return [];
  }
}

export function setHandled(ids: readonly string[], id: string, handled: boolean): string[] {
  const rest = ids.filter((x) => x !== id);
  return handled ? [...rest, id] : rest;
}

export function splitByHandled<T extends { id: string }>(alerts: readonly T[], handledIds: readonly string[]) {
  const set = new Set(handledIds);
  return { open: alerts.filter((a) => !set.has(a.id)), handled: alerts.filter((a) => set.has(a.id)) };
}

export function severityCounts(alerts: readonly { severity: Severity }[]): Record<Severity, number> {
  const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0 };
  for (const a of alerts) c[a.severity]++;
  return c;
}

/** The fields client components need (avoids sending causes/evidence twice). */
export type SlimAlert = Pick<Alert, "id" | "type" | "severity" | "repId" | "impact">;

export const slim = (a: Alert): SlimAlert => ({ id: a.id, type: a.type, severity: a.severity, repId: a.repId, impact: a.impact });
