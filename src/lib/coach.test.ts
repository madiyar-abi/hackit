import { describe, expect, it } from "vitest";
import { generateDataset, SCENARIO } from "./data/generate";
import { bonusEstimate, BONUS_SCHEME, optimizeRoute, outletHints, routeKm } from "./coach";

describe("bonus", () => {
  const plan = 1_000_000;
  it("follows the example scheme", () => {
    expect(bonusEstimate(700_000, plan)).toMatchObject({ bonus: 0, nextThreshold: 0.8, toNext: 100_000 });
    expect(bonusEstimate(800_000, plan).bonus).toBe(BONUS_SCHEME.base / 2);
    expect(bonusEstimate(900_000, plan)).toMatchObject({ bonus: 112_500, nextThreshold: 1, toNext: 100_000 });
    expect(bonusEstimate(1_100_000, plan)).toMatchObject({ bonus: 180_000, nextThreshold: null, toNext: 0 });
    expect(bonusEstimate(5_000_000, plan).bonus).toBe(BONUS_SCHEME.base * BONUS_SCHEME.cap);
  });
});

describe("route", () => {
  it("keeps the first stop, visits every stop once and is never longer", () => {
    // zig-zag along a line: 0, 3, 1, 4, 2 km east
    const pts = [0, 3, 1, 4, 2].map((km) => ({ lat: 43.2, lng: 76.9 + km / 81 }));
    const order = optimizeRoute(pts);
    expect(order[0]).toBe(0);
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(routeKm(order.map((i) => pts[i]))).toBeLessThan(routeKm(pts));
    expect(order).toEqual([0, 2, 4, 1, 3]);
  });
});

describe("hints", () => {
  const d = generateDataset();
  it("falling orders and competitor-filled freezer get a hint", () => {
    const h = outletHints(d, [SCENARIO.freezerNoSalesOutlet]);
    expect(h[SCENARIO.freezerNoSalesOutlet].join(" ")).toMatch(/упали на 100%/);
    expect(h[SCENARIO.freezerNoSalesOutlet].join(" ")).toMatch(/10% нашей продукции/);
  });
  it("an outlet without the freezer it should have gets a hint", () => {
    expect(outletHints(d, [SCENARIO.noFreezerOutlet])[SCENARIO.noFreezerOutlet].join(" ")).toMatch(/положен ларь/);
  });
});
