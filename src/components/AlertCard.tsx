import Link from "next/link";
import type { Alert, Dataset } from "@/lib/types";
import { getOutlet, getRep } from "@/lib/selectors";
import { fmtMoney } from "@/lib/format";
import { SEVERITY_STYLE, SeverityBadge, TypeTag } from "./ui";
import { HandleButton } from "./Handled";

/** Full alert: what happened, possible causes with evidence, recommended actions. */
export function AlertCard({ alert, data, compact = false }: { alert: Alert; data: Dataset; compact?: boolean }) {
  const rep = getRep(data, alert.repId);
  const outlet = alert.outletId ? getOutlet(data, alert.outletId) : undefined;
  return (
    <article
      id={alert.id}
      className={`scroll-mt-6 rounded-xl border border-line border-l-[6px] bg-carton ${SEVERITY_STYLE[alert.severity].edge}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <TypeTag type={alert.type} />
          </div>
          <h3 className="text-base font-semibold leading-snug">{alert.title}</h3>
          <p className="mt-1 text-sm text-muted">{alert.description}</p>
          <p className="mt-2 text-sm">
            <Link href={`/reps/${rep.id}`} className="text-frost hover:underline">{rep.name}</Link>
            {outlet && (
              <>
                {", "}
                <Link href={`/outlets/${outlet.id}`} className="text-frost hover:underline">{outlet.name}</Link>
                <span className="text-muted">, {outlet.address}</span>
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="whitespace-nowrap font-display text-xl font-semibold tracking-tight">{fmtMoney(alert.impact)}</div>
          <div className="text-xs text-muted">{alert.type === "plan_underperformance" ? "недобор плана в месяц" : "под угрозой в месяц"}</div>
          <HandleButton id={alert.id} />
        </div>
      </div>

      {compact ? (
        <p className="px-5 pb-4 pt-3 text-sm">
          <span className="text-muted">Вероятная причина: </span>
          {alert.causes[0]?.title}
        </p>
      ) : (
        <div className="mt-4 grid gap-0 border-t border-line md:grid-cols-[1.4fr_1fr]">
          <div className="px-5 py-4">
            <h4 className="mb-2 text-sm font-semibold">Возможные причины</h4>
            <ul className="space-y-3">
              {alert.causes.map((c) => (
                <li key={c.title} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{c.title}</span>
                    <span className="text-xs text-muted">достоверность: {c.confidence}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-muted">
                    {c.evidence.map((e) => (
                      <li key={e} className="pl-3 -indent-3">– {e}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line bg-milk/60 px-5 py-4 md:border-l md:border-t-0">
            <h4 className="mb-2 text-sm font-semibold">Рекомендуемые действия</h4>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {alert.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </article>
  );
}
