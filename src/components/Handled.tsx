"use client";
// Client side of «Отметить обработанным»: localStorage-backed store shared by every component on the page.
import { useSyncExternalStore, type ReactNode } from "react";
import { HANDLED_KEY, type SlimAlert, parseHandled, setHandled, severityCounts, splitByHandled } from "@/lib/handled";
import { riskSummary } from "@/lib/engine/risk";
import { fmtMoney, plural } from "@/lib/format";

const EMPTY: string[] = [];
let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return parseHandled(window.localStorage.getItem(HANDLED_KEY));
  } catch {
    return EMPTY; // storage blocked (private mode, policy) — page works without it
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== HANDLED_KEY) return;
    cache = read();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(HANDLED_KEY, JSON.stringify(next));
  } catch {
    // keep the in-memory state for this visit
  }
  listeners.forEach((l) => l());
}

export function useHandled(): string[] {
  return useSyncExternalStore(subscribe, () => (cache ??= read()), () => EMPTY);
}

export function HandleButton({ id }: { id: string }) {
  const handled = useHandled().includes(id);
  return (
    <button
      type="button"
      onClick={() => write(setHandled(cache ?? read(), id, !handled))}
      aria-pressed={handled}
      className={`mt-2 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        handled ? "border-ok bg-ok/10 text-ok hover:bg-ok/20" : "border-line bg-carton text-ink-soft hover:border-ink-soft"
      }`}
    >
      {handled ? "✓ Обработано · Вернуть" : "Отметить обработанным"}
    </button>
  );
}

/** Open alerts first; handled ones below, dimmed, under their own heading. */
export function AlertList({ items, className = "space-y-3" }: { items: { id: string; card: ReactNode }[]; className?: string }) {
  const { open, handled } = splitByHandled(items, useHandled());
  return (
    <>
      <div className={className}>
        {open.map((i) => (
          <div key={i.id}>{i.card}</div>
        ))}
        {open.length === 0 && (
          <p className="rounded-xl border border-dashed border-line px-5 py-6 text-center text-sm text-muted">
            Все отклонения обработаны.
          </p>
        )}
      </div>
      {handled.length > 0 && (
        <section aria-label="Обработанные отклонения" className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-muted">Обработанные · {handled.length}</h3>
          <div className={`${className} opacity-60`}>
            {handled.map((i) => (
              <div key={i.id}>{i.card}</div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Severity counters of still-open alerts. */
export function OpenCounts({ alerts }: { alerts: SlimAlert[] }) {
  const { open, handled } = splitByHandled(alerts, useHandled());
  const c = severityCounts(open);
  return (
    <p className="flex flex-wrap gap-3 text-sm text-muted">
      <span><span className="font-semibold text-critical">{c.critical}</span> критично</span>
      <span><span className="font-semibold text-high">{c.high}</span> высокий</span>
      <span><span className="font-semibold text-medium">{c.medium}</span> средний</span>
      {handled.length > 0 && <span><span className="font-semibold text-ok">{handled.length}</span> обработано</span>}
    </p>
  );
}

/** «Продажи под угрозой» over open alerts, each loss counted once (see riskSummary). */
export function OpenRisk({ alerts }: { alerts: SlimAlert[] }) {
  const { open } = splitByHandled(alerts, useHandled());
  const r = riskSummary(open);
  return (
    <>
      <dd className="mt-1 whitespace-nowrap font-display text-xl font-semibold tracking-tight text-critical sm:text-2xl">
        {fmtMoney(r.lostSales)}
      </dd>
      <dd className="mt-0.5 text-xs text-muted">
        в месяц, по {plural(open.length, ["открытому отклонению", "открытым отклонениям", "открытым отклонениям"])} без двойного учёта
        {r.planGap > 0 && <>; отдельно недобор плана {fmtMoney(r.planGap)}</>}
      </dd>
    </>
  );
}

/** Summary line under the filters on /alerts. */
export function FoundSummary({ alerts }: { alerts: SlimAlert[] }) {
  const { open, handled } = splitByHandled(alerts, useHandled());
  const r = riskSummary(open);
  return (
    <span aria-live="polite">
      Найдено: <span className="font-semibold">{alerts.length}</span>
      {handled.length > 0 && <span className="text-muted"> (обработано {handled.length})</span>}
      {open.length > 0 && (
        <span className="text-muted">
          {" "}· под угрозой {fmtMoney(r.lostSales)} в месяц без двойного учёта
          {r.planGap > 0 && <>, недобор плана {fmtMoney(r.planGap)}</>}
        </span>
      )}
    </span>
  );
}
