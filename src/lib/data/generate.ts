// Deterministic demo-data generator. Same seed → identical dataset (no Date.now / Math.random).
// The 5 situations from the case are planted on purpose, see SCENARIO below.
import type {
  Dataset,
  Freezer,
  Manager,
  Outlet,
  OutletType,
  Rep,
  RepPlan,
  SalesRecord,
  Visit,
} from "../types";
import { distanceM } from "../geo";

export const SEED = 20261119;

/** Which rep / outlet carries which case situation (indexes are rep ids and outlet slot j). */
export const SCENARIO = {
  missedVisitsRep: "r03", // 1. не посетил 5 плановых точек
  missedVisitSlots: [2, 4, 6, 7, 9],
  salesDropRep: "r05", // 2. продажи упали на 30%+
  noFreezerOutlet: "o062", // 3a. ларь не установлен (r07, slot 1)
  missingFreezerOutlet: "o114", // 3b. ларь числится, но не найден (r12, slot 3)
  freezerNoSalesOutlet: "o023", // 4a. ларь есть, продаж нет — продукция конкурента (r03, slot 2)
  freezerClosedOutlet: "o107", // 4b. ларь есть, продаж нет — точка закрыта (r11, slot 6)
  planRep: "r08", // 5. выполняет ~50% плана
  gpsRep: "r10", // доп.: отметки визитов далеко от точки
  // Прошлый период (сентябрь): отклонения, которые в октябре устранены — для оценки эффекта действий.
  prevMissedVisitsRep: "r01", // в сентябре пропустил 4 визита, в октябре маршрут восстановлен
  prevMissedVisitSlots: [1, 3, 5, 7],
  prevFreezerNoSalesOutlet: "o012", // в сентябре ларь стоял без продаж (сломан), в октябре починен
} as const;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PERIODS = ["2026-07", "2026-08", "2026-09", "2026-10"];
const SEASON = [1.04, 1.02, 1.0, 0.99];

const MANAGERS: Manager[] = [
  { id: "m1", name: "Руслан Ахметов", role: "Руководитель отдела продаж", telegram: "@r_akhmetov", email: "r.akhmetov@dolina-demo.kz" },
  { id: "m2", name: "Гульнара Сеитова", role: "Супервайзер, группа «Север»", telegram: "@g_seitova", email: "g.seitova@dolina-demo.kz" },
  { id: "m3", name: "Андрей Ли", role: "Супервайзер, группа «Юг»", telegram: "@a_li_sales", email: "a.li@dolina-demo.kz" },
];

const REP_NAMES = [
  "Айдар Касымов", "Мария Ким", "Ерлан Сапаров", "Динара Абенова", "Тимур Жумабеков", "Ольга Петренко",
  "Нурлан Оспанов", "Асель Мухтарова", "Даурен Искаков", "Сергей Волков", "Алия Нурпеисова", "Бауыржан Тулегенов",
];

const DISTRICTS: { name: string; lat: number; lng: number }[] = [
  { name: "Алмалинский", lat: 43.252, lng: 76.912 },
  { name: "Жетысуский", lat: 43.29, lng: 76.935 },
  { name: "Турксибский", lat: 43.335, lng: 76.95 },
  { name: "Медеуский", lat: 43.245, lng: 76.965 },
  { name: "Бостандыкский", lat: 43.215, lng: 76.905 },
  { name: "Алатауский", lat: 43.275, lng: 76.835 },
];

const STORE_NAMES = [
  "Береке", "Достар", "Жулдыз", "Арман", "Самал", "Нурлы", "Алтын", "Кулагер", "Мерей", "Асем",
  "Томирис", "Айгерим", "Шанырак", "Бастау", "Ырыс", "Сункар", "Тулпар", "Аружан", "Каусар", "Акбота",
  "Байтерек", "Мирас", "Жибек", "Нур", "Алем", "Кайнар", "Ласточка", "Радуга", "Весна", "Улыбка",
  "Семейный", "Уют", "Огонёк", "Колос", "Ромашка", "Магнолия", "Эдем", "Лидер", "Сауле", "Дария",
];
const STORE_SUFFIX = ["", " 24", " Экспресс"];

const STREETS = [
  "пр. Абая", "пр. Достык", "ул. Толе би", "пр. Райымбека", "ул. Жибек Жолы", "пр. Сейфуллина",
  "ул. Розыбакиева", "ул. Саина", "ул. Момышулы", "пр. Аль-Фараби", "ул. Байтурсынова", "ул. Гагарина",
  "ул. Жандосова", "ул. Тимирязева", "ул. Шевченко",
];

const FREEZER_MODELS = ["Frostor F400S", "Ugur UDD 300", "Снеж МЛП-400", "Italfrost CF500"];

/** Slot j inside a rep's 10 outlets → outlet type. */
const SLOT_TYPES: OutletType[] = [
  "супермаркет", "магазин", "магазин", "магазин", "магазин",
  "минимаркет", "минимаркет", "минимаркет", "киоск", "киоск",
];
const BASE_SALES: Record<OutletType, number> = {
  супермаркет: 1_600_000,
  магазин: 650_000,
  минимаркет: 350_000,
  киоск: 140_000,
};
const TYPE_PREFIX: Record<OutletType, string> = {
  супермаркет: "Супермаркет",
  магазин: "Магазин",
  минимаркет: "Минимаркет",
  киоск: "Киоск",
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const round = (n: number, step = 1000) => Math.round(n / step) * step;
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export function generateDataset(seed: number = SEED): Dataset {
  const rnd = mulberry32(seed);
  const between = (a: number, b: number) => a + (b - a) * rnd();

  const reps: Rep[] = REP_NAMES.map((name, i) => ({
    id: `r${pad(i + 1)}`,
    name,
    district: DISTRICTS[Math.floor(i / 2)].name,
    supervisorId: i < 6 ? "m2" : "m3",
    hiredAt: `${2021 + (i % 4)}-${pad(1 + ((i * 5) % 12))}-${pad(1 + ((i * 7) % 27))}`,
    phone: `+7 701 ${pad(100 + i * 37, 3)} ${pad(10 + i * 3)} ${pad(20 + i * 5)}`,
  }));
  reps.find((r) => r.id === SCENARIO.planRep)!.hiredAt = "2026-08-17";

  const outlets: Outlet[] = [];
  const baseSales = new Map<string, number>();
  reps.forEach((rep, ri) => {
    const d = DISTRICTS[Math.floor(ri / 2)];
    for (let j = 0; j < 10; j++) {
      const i = ri * 10 + j;
      const type = SLOT_TYPES[j];
      const id = `o${pad(i + 1, 3)}`;
      outlets.push({
        id,
        name: `${TYPE_PREFIX[type]} «${STORE_NAMES[i % 40]}${STORE_SUFFIX[Math.floor(i / 40)]}»`,
        type,
        address: `г. Алматы, ${STREETS[(i * 7) % STREETS.length]}, ${10 + ((i * 13) % 180)}`,
        district: d.name,
        repId: rep.id,
        lat: +(d.lat + between(-0.018, 0.018)).toFixed(5),
        lng: +(d.lng + between(-0.025, 0.025)).toFixed(5),
        freezerRequired: type !== "киоск",
      });
      let base = BASE_SALES[type] * between(0.8, 1.25);
      if (id === SCENARIO.noFreezerOutlet) base *= 1.3; // high-turnover shop without our freezer
      baseSales.set(id, base);
    }
  });
  const slotOf = (o: Outlet) => (Number(o.id.slice(1)) - 1) % 10;

  // --- Freezers -------------------------------------------------------------
  const freezers: Freezer[] = [];
  outlets.forEach((o, i) => {
    if (!o.freezerRequired || o.id === SCENARIO.noFreezerOutlet) return;
    const f: Freezer = {
      id: `f${pad(i + 1, 3)}`,
      outletId: o.id,
      model: FREEZER_MODELS[i % FREEZER_MODELS.length],
      installedAt: `${2023 + (i % 3)}-${pad(1 + (i % 12))}-${pad(1 + ((i * 3) % 27))}`,
      lastAudit: {
        date: `2026-10-${pad(3 + (i % 24))}`,
        found: true,
        ourProductSharePct: Math.round(between(70, 100)),
        competitorProduct: false,
      },
    };
    if (o.id === SCENARIO.missingFreezerOutlet) {
      f.lastAudit = {
        date: "2026-10-14",
        found: false,
        ourProductSharePct: 0,
        competitorProduct: false,
        note: "Ларь не обнаружен при визите. Со слов продавца — вывезен владельцем точки в сентябре.",
      };
    }
    if (o.id === SCENARIO.freezerNoSalesOutlet) {
      f.lastAudit = {
        date: "2026-10-20",
        found: true,
        ourProductSharePct: 10,
        competitorProduct: true,
        note: "Ларь заполнен мороженым конкурента, нашей продукции почти нет.",
      };
    }
    if (o.id === SCENARIO.freezerClosedOutlet) {
      f.lastAudit = {
        date: "2026-10-08",
        found: true,
        ourProductSharePct: 0,
        competitorProduct: false,
        note: "Точка закрыта на ремонт, ларь отключён.",
      };
    }
    freezers.push(f);
  });

  // --- Visits ---------------------------------------------------------------
  const visits: Visit[] = [];
  for (const period of PERIODS.slice(-2)) {
    const isCurrent = period === PERIODS[PERIODS.length - 1];
    const isPrevious = period === PERIODS[PERIODS.length - 2];
    for (const rep of reps) {
      const repOutlets = outlets.filter((o) => o.repId === rep.id);
      const repVisits: Visit[] = [];
      for (const o of repOutlets) {
        const j = slotOf(o);
        // Sales-drop rep cut his route in the current period: half the outlets visited twice, not 4 times.
        const weeks = isCurrent && rep.id === SCENARIO.salesDropRep && j >= 4 ? [0, 2] : [0, 1, 2, 3];
        for (const w of weeks) {
          const planned = 9 * 60 + j * 40;
          const off = Math.round(between(-25, 25));
          const gps = {
            lat: +(o.lat + between(-0.0006, 0.0006)).toFixed(6),
            lng: +(o.lng + between(-0.0008, 0.0008)).toFixed(6),
          };
          repVisits.push({
            id: `v-${period}-${o.id}-${w + 1}`,
            repId: rep.id,
            outletId: o.id,
            period,
            date: `${period}-${pad(1 + w * 7 + (j % 5))}`,
            plannedTime: hhmm(planned),
            status: "done",
            checkInTime: hhmm(planned + off),
            gps,
            distanceM: Math.round(distanceM(o.lat, o.lng, gps.lat, gps.lng)),
          });
        }
      }

      const miss = (v: Visit, note?: string) => {
        v.status = "missed";
        delete v.checkInTime;
        delete v.gps;
        delete v.distanceM;
        if (note) v.note = note;
      };

      if (isCurrent && rep.id === SCENARIO.missedVisitsRep) {
        // exactly 5 missed visits at 5 distinct outlets
        SCENARIO.missedVisitSlots.forEach((slot, k) => {
          const v = repVisits.find((x) => slotOf(outlets.find((o) => o.id === x.outletId)!) === slot && x.id.endsWith(`-${(k % 4) + 1}`));
          miss(v!);
        });
      } else {
        // background noise: 0–2 missed visits per rep and period
        const n = Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const v = repVisits[Math.floor(rnd() * repVisits.length)];
          if (v.outletId === SCENARIO.freezerNoSalesOutlet || v.outletId === SCENARIO.freezerClosedOutlet) continue;
          miss(v);
        }
      }
      if (isPrevious && rep.id === SCENARIO.prevMissedVisitsRep) {
        // planted after the noise so that the random sequence (and every other number) stays the same
        SCENARIO.prevMissedVisitSlots.forEach((slot, k) => {
          const v = repVisits.find((x) => slotOf(outlets.find((o) => o.id === x.outletId)!) === slot && x.id.endsWith(`-${(k % 4) + 1}`));
          miss(v!, "Визит перенесён: служебная машина в ремонте");
        });
      }

      if (isCurrent && rep.id === SCENARIO.gpsRep) {
        // three check-ins in week 3 made from one and the same place, kilometres away from the outlets
        const d = DISTRICTS[Math.floor(reps.indexOf(rep) / 2)];
        const home = { lat: +(d.lat + 0.045).toFixed(6), lng: +(d.lng + 0.01).toFixed(6) };
        repVisits
          .filter((v) => v.status === "done" && v.id.endsWith("-3"))
          .slice(0, 3)
          .forEach((v) => {
            const o = outlets.find((x) => x.id === v.outletId)!;
            v.gps = { ...home };
            v.distanceM = Math.round(distanceM(o.lat, o.lng, home.lat, home.lng));
          });
      }

      // Visit notes that explain zero sales
      for (const v of repVisits) {
        if (v.status !== "done") continue;
        if (v.outletId === SCENARIO.freezerClosedOutlet && isCurrent) v.note = "Точка закрыта на ремонт, заказ не оформлен.";
        if (v.outletId === SCENARIO.freezerNoSalesOutlet && isCurrent) v.note = "Заказ не оформлен: владелец закупает мороженое у конкурента.";
        if (v.outletId === SCENARIO.prevFreezerNoSalesOutlet && isPrevious) v.note = "Ларь не работает (компрессор), заказ мороженого не оформлен.";
        if (isCurrent && rep.id === SCENARIO.salesDropRep) {
          const j = slotOf(outlets.find((o) => o.id === v.outletId)!);
          if (j === 8) v.note = "Заказ не оформлен: точка перешла к конкуренту (скидка 7%).";
          if (j === 9) v.note = "Заказ не оформлен: остатки не продаются.";
        }
      }
      visits.push(...repVisits);
    }
  }

  // --- Sales ----------------------------------------------------------------
  const sales: SalesRecord[] = [];
  PERIODS.forEach((period, pi) => {
    const isCurrent = pi === PERIODS.length - 1;
    for (const o of outlets) {
      const j = slotOf(o);
      let amount = baseSales.get(o.id)! * SEASON[pi] * between(0.95, 1.05);
      if (o.repId === SCENARIO.planRep) amount *= pi >= 1 ? 0.46 : 0.55; // weak new rep (took over territory in Aug)
      if (isCurrent && o.repId === SCENARIO.salesDropRep) amount *= j >= 8 ? 0 : 0.68;
      if (o.id === SCENARIO.freezerNoSalesOutlet) amount *= [0.9, 0.6, 0.25, 0][pi];
      if (o.id === SCENARIO.freezerClosedOutlet) amount *= [1, 1, 0.8, 0][pi];
      if (o.id === SCENARIO.missingFreezerOutlet) amount *= [1, 1, 0.85, 0.8][pi];
      if (pi === PERIODS.length - 2 && o.repId === SCENARIO.prevMissedVisitsRep && (SCENARIO.prevMissedVisitSlots as readonly number[]).includes(j)) amount *= 0.6;
      if (pi === PERIODS.length - 2 && o.id === SCENARIO.prevFreezerNoSalesOutlet) amount = 0;
      amount = round(amount);
      const periodVisits = visits.filter((v) => v.period === period && v.outletId === o.id && v.status === "done").length;
      sales.push({
        outletId: o.id,
        repId: o.repId,
        period,
        amount,
        orders: amount === 0 ? 0 : periodVisits || 4,
      });
    }
  });

  // --- Plans ----------------------------------------------------------------
  const plans: RepPlan[] = [];
  const repFact = (repId: string, period: string) =>
    sales.filter((s) => s.repId === repId && s.period === period).reduce((a, s) => a + s.amount, 0);
  PERIODS.forEach((period, pi) => {
    for (const rep of reps) {
      const potential = outlets
        .filter((o) => o.repId === rep.id)
        .reduce((a, o) => a + baseSales.get(o.id)! * SEASON[pi], 0);
      const plan =
        pi === 0 || rep.id === SCENARIO.planRep ? potential : repFact(rep.id, PERIODS[pi - 1]) * 1.05;
      plans.push({ repId: rep.id, period, plan: round(plan, 10_000) });
    }
  });

  return {
    company: "Молочный завод «Долина» (демо-данные)",
    periods: PERIODS,
    currentPeriod: PERIODS[PERIODS.length - 1],
    previousPeriod: PERIODS[PERIODS.length - 2],
    managers: MANAGERS,
    reps,
    outlets,
    freezers,
    sales,
    plans,
    visits,
  };
}
