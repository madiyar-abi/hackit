import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { dataset } from "@/lib/app-data";
import { MobileApp } from "./MobileApp";
import type { Rep, Visit } from "@/lib/types";

export const metadata: Metadata = {
  title: "Приложение ТП",
};

export default function MobilePage() {
  const currentPeriod = dataset.currentPeriod;

  // Picks rep r01 (or the first rep that has ≥ 5 visits on one date in dataset.currentPeriod; take that date)
  let chosenRep: Rep = dataset.reps.find((r) => r.id === "r01") ?? dataset.reps[0];
  let chosenDate = "";

  for (const rep of dataset.reps) {
    const visitsByDate = new Map<string, Visit[]>();
    for (const v of dataset.visits) {
      if (v.repId === rep.id && v.period === currentPeriod) {
        const list = visitsByDate.get(v.date) || [];
        list.push(v);
        visitsByDate.set(v.date, list);
      }
    }
    for (const [date, vList] of visitsByDate.entries()) {
      if (vList.length >= 5) {
        chosenRep = rep;
        chosenDate = date;
        break;
      }
    }
    if (chosenDate) break;
  }

  // If no date has >= 5 visits, pick r01 and a date with both freezer and no-freezer outlets
  if (!chosenDate) {
    const r01Visits = dataset.visits.filter(
      (v) => v.repId === chosenRep.id && v.period === currentPeriod
    );
    const dates = Array.from(new Set(r01Visits.map((v) => v.date))).sort();
    // Prefer date with -03 (contains o003 with freezer and o008 kiosk without freezer)
    chosenDate = dates.find((d) => d.endsWith("-03")) ?? dates[0] ?? `${currentPeriod}-01`;
  }

  // That day's visits sorted by plannedTime
  const daysVisits = dataset.visits
    .filter((v) => v.repId === chosenRep.id && v.date === chosenDate)
    .sort((a, b) => a.plannedTime.localeCompare(b.plannedTime));

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
        />
      </div>
    </>
  );
}
