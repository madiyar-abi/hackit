import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { dataset } from "@/lib/app-data";
import { MobileApp } from "./MobileApp";
import type { Rep, Visit } from "@/lib/types";
import { outletHints } from "@/lib/coach";
import { periodLabel, repPlan, repSales } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "Приложение ТП",
};

export default function MobilePage() {
  const currentPeriod = dataset.currentPeriod;

  // Demo day: the rep's weekly route (10 outlets, planned 09:00–15:00) shown as one working day.
  // r03: below plan, with a problem outlet on the route — shows the bonus forecast and hints.
  const chosenRep: Rep = dataset.reps.find((r) => r.id === "r03") ?? dataset.reps[0];
  const daysVisits: Visit[] = dataset.visits
    .filter((v) => v.repId === chosenRep.id && v.period === currentPeriod && v.id.endsWith("-1"))
    .sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));
  const chosenDate = daysVisits.map((v) => v.date).sort()[0] ?? `${currentPeriod}-01`;

  const outletIds = new Set(daysVisits.map((v) => v.outletId));
  const outlets = dataset.outlets.filter((o) => outletIds.has(o.id));
  const freezers = dataset.freezers.filter((f) => outletIds.has(f.outletId));

  return (
    <>
      <PageHeader
        title="Мобильное приложение ТП"
        subtitle="Прототип экрана, данные демо"
      />
      <div className="flex justify-center pb-12">
        <MobileApp
          rep={chosenRep}
          date={chosenDate}
          visits={daysVisits}
          outlets={outlets}
          freezers={freezers}
          plan={repPlan(dataset, chosenRep.id, currentPeriod)}
          fact={repSales(dataset, chosenRep.id, currentPeriod)}
          period={periodLabel(currentPeriod)}
          hints={outletHints(dataset, [...outletIds])}
        />
      </div>
    </>
  );
}
