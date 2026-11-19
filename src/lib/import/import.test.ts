import { describe, expect, it } from "vitest";
import { generateDataset } from "../data/generate";
import { analyze } from "../engine";
import { parseCsv, toCsv } from "./csv";
import { buildDataset, matchFiles, toCsvFiles } from "./dataset";
import { EXAMPLE, generateExampleDataset } from "./example";

const roundTrip = (d: ReturnType<typeof generateDataset>) => buildDataset(toCsvFiles(d), d.company);
const summary = (alerts: ReturnType<typeof analyze>) => alerts.map((a) => `${a.id}|${a.severity}|${a.impact}`).sort();

describe("csv", () => {
  it("reads «;» and «,» files with quotes, BOM and CRLF", () => {
    expect(parseCsv('﻿id;name\r\n1;"Магазин «А»; угол"\r\n')).toEqual([{ id: "1", name: "Магазин «А»; угол" }]);
    expect(parseCsv('ID,Note\n2,"он сказал ""нет"""\n\n')).toEqual([{ id: "2", note: 'он сказал "нет"' }]);
  });
  it("writes what it reads", () => {
    const text = toCsv(["a", "b"], [["x;y", 'q"q'], [1, undefined]]);
    expect(parseCsv(text)).toEqual([{ a: "x;y", b: 'q"q' }, { a: "1", b: "" }]);
  });
});

describe("import", () => {
  it("demo data → CSV → import gives exactly the same alerts", () => {
    const d = generateDataset();
    const r = roundTrip(d);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.dataset!.currentPeriod).toBe(d.currentPeriod);
    expect(summary(analyze(r.dataset!))).toEqual(summary(analyze(d)));
  });

  it("the second region example finds its own, different problems", () => {
    const d = generateExampleDataset();
    const alerts = analyze(roundTrip(d).dataset!);
    const of = (t: string) => alerts.filter((a) => a.type === t);
    expect(of("missed_visits").map((a) => [a.repId, a.metrics.missed])).toEqual([[EXAMPLE.missedVisitsRep, 4]]);
    expect(of("plan_underperformance").map((a) => a.repId)).toEqual([EXAMPLE.planRep]);
    expect(of("sales_drop").map((a) => a.repId)).toEqual([EXAMPLE.salesDropRep]);
    expect(of("freezer_no_sales").map((a) => a.outletId)).toEqual([EXAMPLE.freezerNoSalesOutlet]);
    expect(of("no_freezer").map((a) => a.outletId)).toEqual([EXAMPLE.noFreezerOutlet]);
    expect(of("gps_mismatch").map((a) => a.repId)).toEqual([EXAMPLE.gpsRep]);
    // causes are found from this data too
    expect(of("sales_drop")[0].causes.map((c) => c.title).join(" ")).toMatch(/Потеряны точки|конкурент/i);
    expect(of("plan_underperformance")[0].causes.map((c) => c.title).join(" ")).toMatch(/Новый сотрудник/);
  });

  it("reports missing files, missing columns and too few months", () => {
    expect(buildDataset({}).errors.join(" ")).toMatch(/reps\.csv.*outlets\.csv.*sales\.csv/);
    const files = toCsvFiles(generateDataset());
    expect(buildDataset({ ...files, sales: "outlet_id;period\no001;2026-10\n" }).errors.join(" ")).toMatch(/нет колонок amount/);
    const oneMonth = "outlet_id;period;amount\no001;2026-10;1000\n";
    expect(buildDataset({ reps: files.reps, outlets: files.outlets, sales: oneMonth }).errors.join(" ")).toMatch(/2 месяца/);
  });

  it("skips bad rows with a warning instead of failing", () => {
    const files = toCsvFiles(generateDataset());
    const r = buildDataset({ ...files, sales: files.sales + "o999;r01;2026-10;5000;1\n" });
    expect(r.dataset).toBeDefined();
    expect(r.warnings.join(" ")).toMatch(/неизвестная точка «o999»/);
  });

  it("accepts RU-style dates, periods and numbers", () => {
    const files = toCsvFiles(generateDataset());
    const sales = "outlet_id;period;amount\no001;09.2026;1 200,5\no001;10.2026;900\n";
    const r = buildDataset({ reps: files.reps, outlets: files.outlets, sales });
    expect(r.dataset!.periods).toEqual(["2026-09", "2026-10"]);
    expect(r.dataset!.sales[0].amount).toBe(1200.5);
  });

  it("matches file names like «Выгрузка_sales.csv»", () => {
    expect(Object.keys(matchFiles([{ name: "Выгрузка_sales.CSV", text: "" }, { name: "reps.csv", text: "" }, { name: "x.csv", text: "" }]))).toEqual(["sales", "reps"]);
  });
});
