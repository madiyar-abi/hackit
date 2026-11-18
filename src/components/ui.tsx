import Link from "next/link";
import type { DeviationType, Severity } from "@/lib/types";
import { SEVERITY_LABEL, TYPE_LABEL } from "@/lib/engine/notify";

export const SEVERITY_STYLE: Record<Severity, { text: string; bg: string; edge: string; dot: string }> = {
  critical: { text: "text-critical", bg: "bg-critical-soft", edge: "border-l-critical", dot: "bg-critical" },
  high: { text: "text-high", bg: "bg-high-soft", edge: "border-l-high", dot: "bg-high" },
  medium: { text: "text-medium", bg: "bg-medium-soft", edge: "border-l-medium", dot: "bg-medium" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function TypeTag({ type }: { type: DeviationType }) {
  return (
    <span className="inline-flex rounded-md border border-line bg-carton px-2 py-0.5 text-xs text-ink-soft">
      {TYPE_LABEL[type]}
    </span>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

/** Panel = white surface with a hairline; used for grouped content, not for every item. */
export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-carton ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-frost underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
