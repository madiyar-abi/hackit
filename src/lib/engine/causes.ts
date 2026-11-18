// Cause rules: for each deviation, correlate related data and return possible causes with
// evidence (numbers from the data) and recommended actions. No ML — transparent rules.
import type { Alert, Cause, Dataset, Deviation } from "../types";
import type { EngineConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";
import {
  getOutlet,
  getRep,
  outletFreezer,
  outletSales,
  outletVisits,
  periodLabel,
  repOutlets,
  repPlan,
  repSales,
  repVisits,
  totalSales,
} from "../selectors";
import { fmtDate, fmtMoney, fmtPct } from "../format";

interface Explanation {
  causes: Cause[];
  actions: string[];
}

const doneCount = (d: Dataset, repId: string, period: string) =>
  repVisits(d, repId, period).filter((v) => v.status === "done").length;

const monthsBetween = (fromDate: string, period: string) => {
  const [y1, m1] = fromDate.split("-").map(Number);
  const [y2, m2] = period.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

/** Average sales per done visit across the whole team. */
const teamOrderPerVisit = (d: Dataset, period: string) => {
  const done = d.visits.filter((v) => v.period === period && v.status === "done").length;
  return done ? totalSales(d, period) / done : 0;
};

function explainMissedVisits(dev: Deviation, d: Dataset): Explanation {
  const p = dev.period;
  const missed = repVisits(d, dev.repId, p).filter((v) => v.status === "missed");
  const causes: Cause[] = [];

  const afternoon = missed.filter((v) => v.plannedTime >= "13:00");
  if (afternoon.length / missed.length >= 0.5) {
    causes.push({
      title: "Не успевает пройти маршрут до конца дня",
      evidence: [
        `${afternoon.length} из ${missed.length} пропусков — визиты, запланированные после 13:00`,
        `Пропущенные визиты: ${[...missed].sort((a, b) => a.date.localeCompare(b.date)).map((v) => `${v.date.slice(8)}.${v.date.slice(5, 7)} ${v.plannedTime}`).join(", ")}`,
      ],
      confidence: "средняя",
    });
  }

  const falling = missed
    .map((v) => getOutlet(d, v.outletId))
    .filter((o) => outletSales(d, o.id, p) < outletSales(d, o.id, d.previousPeriod) * 0.9);
  if (falling.length) {
    causes.push({
      title: "Непосещённые точки уже теряют продажи",
      evidence: falling.map(
        (o) => `${o.name}: ${fmtMoney(outletSales(d, o.id, d.previousPeriod))} → ${fmtMoney(outletSales(d, o.id, p))}`,
      ),
      confidence: "высокая",
    });
  }

  const prevMissed = repVisits(d, dev.repId, d.previousPeriod).filter((v) => v.status === "missed").length;
  causes.push(
    prevMissed <= 1
      ? {
          title: "Новая проблема — вероятна разовая причина (болезнь, поломка авто, личные обстоятельства)",
          evidence: [`В прошлом периоде пропусков: ${prevMissed}, сейчас: ${missed.length}`],
          confidence: "низкая",
        }
      : {
          title: "Системные пропуски визитов",
          evidence: [`Пропуски повторяются: ${prevMissed} в прошлом периоде, ${missed.length} сейчас`],
          confidence: "высокая",
        },
  );

  return {
    causes,
    actions: [
      `Перенести пропущенные визиты на ближайшую неделю: ${[...new Set(missed.map((v) => getOutlet(d, v.outletId).name))].join(", ")}`,
      "Супервайзеру провести разбор маршрута с ТП и при необходимости разгрузить вторую половину дня",
      "Включить ежедневный контроль GPS-отметок по этому ТП на 2 недели",
    ],
  };
}

function explainSalesDrop(dev: Deviation, d: Dataset, c: EngineConfig): Explanation {
  const p = dev.period;
  const pp = d.previousPeriod;
  const causes: Cause[] = [];

  const doneNow = doneCount(d, dev.repId, p);
  const donePrev = doneCount(d, dev.repId, pp);
  if (donePrev > 0 && (donePrev - doneNow) / donePrev >= c.visitDropPct) {
    causes.push({
      title: "Снизилась частота визитов",
      evidence: [
        `Выполнено ${doneNow} визитов против ${donePrev} в прошлом периоде (−${fmtPct((donePrev - doneNow) / donePrev)})`,
        `Плановых визитов в маршруте: ${repVisits(d, dev.repId, p).length} против ${repVisits(d, dev.repId, pp).length}`,
      ],
      confidence: "высокая",
    });
  }

  const lost = repOutlets(d, dev.repId).filter((o) => outletSales(d, o.id, p) === 0 && outletSales(d, o.id, pp) > 0);
  if (lost.length) {
    causes.push({
      title: `Потеряны точки: ${lost.length} без заказов в этом периоде`,
      evidence: lost.map((o) => {
        const note = outletVisits(d, o.id, p).find((v) => v.note)?.note;
        return `${o.name}: было ${fmtMoney(outletSales(d, o.id, pp))}${note ? ` — «${note}»` : ""}`;
      }),
      confidence: "высокая",
    });
  }

  const competitorNotes = repVisits(d, dev.repId, p)
    .filter((v) => v.note && /конкурент/i.test(v.note))
    .filter((v, i, xs) => xs.findIndex((x) => x.outletId === v.outletId) === i);
  if (competitorNotes.length) {
    causes.push({
      title: "Давление конкурентов",
      evidence: competitorNotes.slice(0, 3).map((v) => `${getOutlet(d, v.outletId).name}: «${v.note}»`),
      confidence: "средняя",
    });
  }

  const teamDrop = (totalSales(d, pp) - totalSales(d, p)) / totalSales(d, pp);
  causes.push({
    title: teamDrop < 0.1 ? "Падение не объясняется сезонностью" : "Общий спад рынка / сезонность",
    evidence: [`Изменение продаж по всей команде: ${teamDrop >= 0 ? "−" : "+"}${fmtPct(Math.abs(teamDrop))}, у сотрудника: −${fmtPct(Number(dev.metrics.dropPct) / 100)}`],
    confidence: teamDrop < 0.1 ? "высокая" : "средняя",
  });

  return {
    causes,
    actions: [
      "Восстановить частоту визитов: вернуть еженедельный маршрут по всем точкам",
      lost.length
        ? `Совместный выезд с супервайзером в потерянные точки: ${lost.map((o) => o.name).join(", ")}`
        : "Совместный выезд с супервайзером в точки с наибольшим падением",
      "Предложить точкам, ушедшим к конкуренту, промо-условия (бонус за возврат объёма)",
      "Еженедельный контроль продаж сотрудника до восстановления уровня",
    ],
  };
}

function explainNoFreezer(dev: Deviation, d: Dataset, c: EngineConfig): Explanation {
  const o = getOutlet(d, dev.outletId!);
  const f = outletFreezer(d, o.id);
  const p = dev.period;
  const sales = outletSales(d, o.id, p);
  if (f) {
    const trend = d.periods.slice(-3).map((x) => `${periodLabel(x)}: ${fmtMoney(outletSales(d, o.id, x))}`);
    return {
      causes: [
        {
          title: "Ларь компании вывезен или утерян",
          evidence: [
            `Ларь ${f.id} (${f.model}) числится за точкой с ${fmtDate(f.installedAt)}`,
            `Проверка ${fmtDate(f.lastAudit!.date)}: ларь не найден${f.lastAudit?.note ? ` — «${f.lastAudit.note}»` : ""}`,
          ],
          confidence: "высокая",
        },
        {
          title: "Продажи точки снижаются без ларя",
          evidence: trend,
          confidence: "средняя",
        },
      ],
      actions: [
        "Акт сверки оборудования с владельцем точки; вернуть ларь или удержать его стоимость по договору",
        `Проверить наличие ларей во всех точках ТП ${getRep(d, o.repId).name}`,
        "Установить замену ларя, если точка сохраняет объём закупок",
      ],
    };
  }
  return {
    causes: [
      {
        title: "Ларь не был установлен при подключении точки",
        evidence: [
          `Категория «${o.type}» по стандарту компании должна иметь ларь`,
          `Продажи точки без ларя: ${fmtMoney(sales)} за ${periodLabel(p)}`,
          `Ожидаемый прирост с ларём: +${fmtPct(c.freezerUpliftPct)} ≈ ${fmtMoney(dev.impact)}/мес`,
        ],
        confidence: "высокая",
      },
    ],
    actions: [
      "Включить точку в план установки ларей с высоким приоритетом (высокий оборот)",
      "Переставить ларь из точки, где он стоит без продаж (см. алерты «ларь без продаж»)",
      "Заключить договор безвозмездного пользования ларём с условием выкладки только нашей продукции",
    ],
  };
}

function explainFreezerNoSales(dev: Deviation, d: Dataset): Explanation {
  const o = getOutlet(d, dev.outletId!);
  const f = outletFreezer(d, o.id)!;
  const p = dev.period;
  const causes: Cause[] = [];
  const actions: string[] = [];
  const visits = outletVisits(d, o.id, p);
  const notes = visits.filter((v) => v.note).map((v) => v.note!);

  if (f.lastAudit?.competitorProduct) {
    causes.push({
      title: "Ларь используется под продукцию конкурента",
      evidence: [
        `Проверка ${fmtDate(f.lastAudit.date)}: доля нашей продукции в ларе ${f.lastAudit.ourProductSharePct}%`,
        ...(f.lastAudit.note ? [`«${f.lastAudit.note}»`] : []),
      ],
      confidence: "высокая",
    });
    actions.push("Потребовать освободить ларь под нашу продукцию по договору; при отказе — забрать ларь");
  }

  const closedNote = [...notes, f.lastAudit?.note ?? ""].find((n) => /закрыт/i.test(n));
  if (closedNote) {
    causes.push({
      title: "Точка закрыта / не работает",
      evidence: [`«${closedNote}»`],
      confidence: "высокая",
    });
    const waiting = d.outlets.find((x) => x.freezerRequired && !outletFreezer(d, x.id));
    actions.push(
      waiting
        ? `Забрать ларь и переставить в точку без ларя: ${waiting.name} (${waiting.address})`
        : "Забрать ларь и переставить в точку из листа ожидания",
    );
  }

  const missed = visits.filter((v) => v.status === "missed");
  if (missed.length) {
    causes.push({
      title: "Торговый представитель не посещает точку",
      evidence: [`Пропущено ${missed.length} из ${visits.length} плановых визитов в точку за период`],
      confidence: "средняя",
    });
    actions.push("Включить визит в точку в маршрут на этой неделе");
  }

  const lastSalePeriod = [...d.periods].reverse().find((x) => outletSales(d, o.id, x) > 0);
  const history = d.periods.map((x) => `${periodLabel(x)}: ${fmtMoney(outletSales(d, o.id, x))}`);
  causes.push({
    title: lastSalePeriod ? `Нет поставок: последняя — ${periodLabel(lastSalePeriod).toLowerCase()}` : "Поставок не было",
    evidence: history,
    confidence: causes.length ? "низкая" : "средняя",
  });
  if (notes.length && !closedNote && !f.lastAudit?.competitorProduct) {
    causes.push({ title: "Отказ от заказа", evidence: notes.map((n) => `«${n}»`), confidence: "средняя" });
  }

  actions.push("Супервайзеру провести аудит точки с фотофиксацией ларя в течение 3 дней");
  return { causes, actions };
}

function explainPlan(dev: Deviation, d: Dataset, c: EngineConfig): Explanation {
  const rep = getRep(d, dev.repId);
  const p = dev.period;
  const causes: Cause[] = [];

  const tenure = monthsBetween(rep.hiredAt, p);
  if (tenure <= c.newRepMonths) {
    causes.push({
      title: "Новый сотрудник — период адаптации",
      evidence: [`В компании с ${fmtDate(rep.hiredAt)} (${tenure} мес.)`],
      confidence: "высокая",
    });
  }

  const plan = repPlan(d, rep.id, p);
  const prevFact = repSales(d, rep.id, d.previousPeriod);
  if (prevFact > 0 && plan / prevFact - 1 > c.planInflationPct) {
    causes.push({
      title: "План завышен относительно фактических продаж территории",
      evidence: [`План ${fmtMoney(plan)} при факте прошлого периода ${fmtMoney(prevFact)} (+${fmtPct(plan / prevFact - 1)})`],
      confidence: "средняя",
    });
  }

  const done = doneCount(d, rep.id, p);
  const perVisit = done ? repSales(d, rep.id, p) / done : 0;
  const team = teamOrderPerVisit(d, p);
  if (team > 0 && perVisit < team * 0.75) {
    causes.push({
      title: "Низкий средний заказ на визит",
      evidence: [`${fmtMoney(perVisit)} на визит против ${fmtMoney(team)} в среднем по команде (−${fmtPct(1 - perVisit / team)})`],
      confidence: "высокая",
    });
  }

  const vs = repVisits(d, rep.id, p);
  if (vs.length && done / vs.length < 0.9) {
    causes.push({
      title: "Выполнен не весь маршрут",
      evidence: [`Выполнено ${done} из ${vs.length} плановых визитов`],
      confidence: "средняя",
    });
  }

  // mentor: best plan fulfilment in the same group among reps with a clean visit record
  const clean = (repId: string) =>
    repVisits(d, repId, p).every((v) => (v.distanceM ?? 0) <= c.gpsMaxDistanceM) &&
    repVisits(d, repId, p).filter((v) => v.status === "missed").length < c.missedVisitsMin;
  const peers = d.reps.filter((r) => r.supervisorId === rep.supervisorId && r.id !== rep.id && clean(r.id));
  const mentor = peers
    .map((r) => ({ r, ratio: repSales(d, r.id, p) / (repPlan(d, r.id, p) || 1) }))
    .sort((a, b) => b.ratio - a.ratio)[0];

  return {
    causes,
    actions: [
      mentor
        ? `Назначить наставника: ${mentor.r.name} (выполнение плана ${fmtPct(mentor.ratio)}), 2 совместных выезда в неделю`
        : "Назначить наставника из лучших ТП группы",
      "Тренинг по ассортименту и допродаже (средний заказ на визит)",
      "Пересмотреть план на следующий период с учётом фактического потенциала территории",
      "Еженедельная встреча с супервайзером по выполнению плана",
    ],
  };
}

function explainGps(dev: Deviation, d: Dataset): Explanation {
  const ids = String(dev.metrics.visitIds).split(",");
  const vs = d.visits.filter((v) => ids.includes(v.id));
  const coords = new Set(vs.map((v) => `${v.gps?.lat.toFixed(4)},${v.gps?.lng.toFixed(4)}`));
  const causes: Cause[] = [];
  if (coords.size === 1 && vs.length > 1) {
    causes.push({
      title: "Отметки о визитах сделаны из одного места — вероятна имитация визитов",
      evidence: [
        `${vs.length} отметки в разных точках сделаны с одних координат (${[...coords][0]})`,
        ...vs.map((v) => `${getOutlet(d, v.outletId).name}, ${fmtDate(v.date)} ${v.checkInTime}: ${(v.distanceM! / 1000).toFixed(1)} км от точки`),
      ],
      confidence: "высокая",
    });
  } else {
    causes.push({
      title: "Отметка сделана не в точке",
      evidence: vs.map((v) => `${getOutlet(d, v.outletId).name}, ${fmtDate(v.date)}: ${(v.distanceM! / 1000).toFixed(1)} км от точки`),
      confidence: "средняя",
    });
  }
  causes.push({
    title: "Возможна техническая ошибка GPS",
    evidence: ["Проверить настройки геолокации на телефоне ТП"],
    confidence: "низкая",
  });
  return {
    causes,
    actions: [
      "Проверить визиты звонком владельцам точек",
      "Включить обязательное фото ларя/полки при отметке визита",
      "Беседа супервайзера с ТП; при повторе — дисциплинарные меры",
    ],
  };
}

export function explain(dev: Deviation, d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Explanation {
  switch (dev.type) {
    case "missed_visits":
      return explainMissedVisits(dev, d);
    case "sales_drop":
      return explainSalesDrop(dev, d, c);
    case "no_freezer":
      return explainNoFreezer(dev, d, c);
    case "freezer_no_sales":
      return explainFreezerNoSales(dev, d);
    case "plan_underperformance":
      return explainPlan(dev, d, c);
    case "gps_mismatch":
      return explainGps(dev, d);
  }
}

export const toAlert = (dev: Deviation, d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Alert => ({
  ...dev,
  ...explain(dev, d, c),
});
