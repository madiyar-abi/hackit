// Second, independent example dataset («другой регион») for the /import page: different city, size,
// periods and problems than the demo data. Shows the engine is not tuned to one dataset.
import { distanceM } from "../geo";
import type { Dataset, Freezer, Outlet, OutletType, Rep, RepPlan, SalesRecord, Visit } from "../types";

const CITY = { name: "Караганда", lat: 49.8047, lng: 73.1094 };
const PERIODS = ["2026-08", "2026-09", "2026-10"];
const SLOTS: OutletType[] = ["супермаркет", "магазин", "магазин", "минимаркет", "минимаркет", "киоск", "магазин", "минимаркет"];
const BASE: Record<OutletType, number> = { супермаркет: 900_000, магазин: 450_000, минимаркет: 250_000, киоск: 120_000 };
const PREFIX: Record<OutletType, string> = { супермаркет: "Супермаркет", магазин: "Магазин", минимаркет: "Минимаркет", киоск: "Киоск" };
const NAMES = [
  "Арман", "Шахтёр", "Достар", "Береке", "Мерей", "Нұр", "Сауле", "Ақжол", "Тулпар", "Сарыарка", "Жұлдыз", "Алтын",
  "Байтерек", "Самал", "Әсем", "Орда", "Камила", "Дала", "Көктем", "Айгерим", "Бота", "Ерке", "Сұңқар", "Шапағат",
];
const STREETS = ["пр. Бухар-Жырау", "ул. Ерубаева", "пр. Нуркена Абдирова", "ул. Гоголя", "ул. Алиханова", "пр. Строителей"];
const REPS: [string, string][] = [
  ["k01", "Арман Тлеубаев"], ["k02", "Жанна Есенова"], ["k03", "Виктор Ким"],
  ["k04", "Айгуль Сарсенова"], ["k05", "Максат Омаров"], ["k06", "Ирина Шевченко"],
];

/** Which rep / outlet carries which problem in this example (used by tests and the page hint). */
export const EXAMPLE = {
  missedVisitsRep: "k02", // 4 пропущенных визита
  planRep: "k04", // новичок, ~45% плана
  salesDropRep: "k05", // 3 точки ушли к конкуренту → падение ≈35%
  freezerNoSalesOutlet: "t003", // ларь занят продукцией конкурента
  noFreezerOutlet: "t023", // ларь положен по стандарту, но не установлен
  gpsRep: "k06", // 3 отметки за 1,5–2 км от точки
} as const;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export function generateExampleDataset(): Dataset {
  const rnd = rng(7_2026);
  const between = (a: number, b: number) => a + (b - a) * rnd();

  const reps: Rep[] = REPS.map(([id, name], i) => ({
    id,
    name,
    district: `${CITY.name}, район ${i < 3 ? "Казыбек би" : "Алихана Бокейханова"}`,
    supervisorId: i < 3 ? "s1" : "s2",
    hiredAt: id === EXAMPLE.planRep ? "2026-09-01" : `${2020 + i}-0${1 + i}-15`,
    phone: `+7 702 ${300 + i * 11} ${pad(40 + i)} ${pad(60 + i)}`,
  }));

  const outlets: Outlet[] = [];
  const base = new Map<string, number>();
  reps.forEach((rep, ri) => {
    const cLat = CITY.lat + (ri % 3) * 0.02 - 0.02;
    const cLng = CITY.lng + Math.floor(ri / 3) * 0.03 - 0.015;
    SLOTS.forEach((type, j) => {
      const i = ri * SLOTS.length + j;
      const id = `t${pad(i + 1, 3)}`;
      outlets.push({
        id,
        name: `${PREFIX[type]} «${NAMES[i % NAMES.length]}${i >= NAMES.length ? "-2" : ""}»`,
        type,
        address: `г. ${CITY.name}, ${STREETS[i % STREETS.length]}, ${5 + ((i * 11) % 120)}`,
        district: rep.district,
        repId: rep.id,
        lat: +(cLat + between(-0.008, 0.008)).toFixed(6),
        lng: +(cLng + between(-0.012, 0.012)).toFixed(6),
        freezerRequired: type === "супермаркет" || type === "магазин",
      });
      base.set(id, Math.round(BASE[type] * between(0.85, 1.15)));
    });
  });

  const freezers: Freezer[] = outlets
    .filter((o) => o.freezerRequired && o.id !== EXAMPLE.noFreezerOutlet)
    .map((o, k) => {
      const competitor = o.id === EXAMPLE.freezerNoSalesOutlet;
      return {
        id: `KF-${pad(k + 1, 3)}`,
        outletId: o.id,
        model: k % 2 ? "Frostor F400" : "Italfrost ЛВН 300",
        installedAt: `2025-${pad(3 + (k % 9))}-10`,
        lastAudit: {
          date: "2026-10-14",
          found: true,
          ourProductSharePct: competitor ? 0 : Math.round(between(70, 95)),
          competitorProduct: competitor,
          ...(competitor ? { note: "В ларе только мороженое конкурента, нашей продукции нет" } : {}),
        },
      };
    });

  const sales: SalesRecord[] = [];
  const plans: RepPlan[] = [];
  const visits: Visit[] = [];
  const lostToCompetitor = new Set(outlets.filter((o) => o.repId === EXAMPLE.salesDropRep).filter((_, j) => [3, 4, 7].includes(j)).map((o) => o.id));

  PERIODS.forEach((period, pi) => {
    const current = pi === PERIODS.length - 1;
    for (const rep of reps) {
      const mine = outlets.filter((o) => o.repId === rep.id);
      let planBase = 0;
      for (const o of mine) {
        const b = base.get(o.id)!;
        planBase += b;
        let amount = b * between(0.96, 1.04);
        if (rep.id === EXAMPLE.planRep) amount *= [0.4, 0.43, 0.45][pi]; // new rep is still ramping up
        if (current && rep.id === EXAMPLE.salesDropRep) amount = lostToCompetitor.has(o.id) ? 0 : amount * 0.85;
        if (current && o.id === EXAMPLE.freezerNoSalesOutlet) amount = 0;
        amount = Math.round(amount / 100) * 100;
        sales.push({ outletId: o.id, repId: rep.id, period, amount, orders: amount ? 4 + Math.floor(rnd() * 4) : 0 });
      }
      plans.push({ repId: rep.id, period, plan: Math.round((planBase * 1.03) / 1000) * 1000 });

      mine.forEach((o, j) => {
        for (let w = 0; w < 4; w++) {
          const planned = 9 * 60 + j * 45;
          const gps = { lat: +(o.lat + between(-0.0004, 0.0004)).toFixed(6), lng: +(o.lng + between(-0.0005, 0.0005)).toFixed(6) };
          const v: Visit = {
            id: `kv-${period}-${o.id}-${w + 1}`,
            repId: rep.id,
            outletId: o.id,
            period,
            date: `${period}-${pad(2 + w * 7 + (j % 4))}`,
            plannedTime: hhmm(planned),
            status: "done",
            checkInTime: hhmm(planned + Math.round(between(-20, 20))),
            gps,
            distanceM: Math.round(distanceM(o.lat, o.lng, gps.lat, gps.lng)),
          };
          if (current && lostToCompetitor.has(o.id) && w === 1) v.note = "Перешли на продукцию конкурента, заказ не оформлен";
          if (current && rep.id === EXAMPLE.missedVisitsRep && [2, 4, 5, 7].includes(j) && w === (j % 4)) {
            v.status = "missed";
            delete v.checkInTime;
            delete v.gps;
            delete v.distanceM;
          }
          if (current && rep.id === EXAMPLE.gpsRep && w === 2 && j < 3) {
            const far = { lat: +(o.lat + 0.015).toFixed(6), lng: +(o.lng + 0.008).toFixed(6) };
            v.gps = far;
            v.distanceM = Math.round(distanceM(o.lat, o.lng, far.lat, far.lng));
          }
          visits.push(v);
        }
      });
    }
  });

  return {
    company: `ТОО «Сары-Арка Сүт», ${CITY.name} (пример для загрузки)`,
    periods: PERIODS,
    currentPeriod: PERIODS[PERIODS.length - 1],
    previousPeriod: PERIODS[PERIODS.length - 2],
    managers: [
      { id: "head", name: "Ержан Баймуханов", role: "Руководитель отдела продаж", telegram: "@e_baimukhanov", email: "e.baimukhanov@saryarka-demo.kz" },
      { id: "s1", name: "Лаура Жакупова", role: "Супервайзер, группа «Центр»", telegram: "@l_zhakupova", email: "l.zhakupova@saryarka-demo.kz" },
      { id: "s2", name: "Павел Ткаченко", role: "Супервайзер, группа «Майкудук»", telegram: "@p_tkachenko", email: "p.tkachenko@saryarka-demo.kz" },
    ],
    reps,
    outlets,
    freezers,
    sales,
    plans,
    visits,
  };
}
