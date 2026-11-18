import { describe, expect, it } from "vitest";
import { fmtKm, fmtMoney, plural } from "./format";

describe("format", () => {
  it("plural forms", () => {
    const f: [string, string, string] = ["визит", "визита", "визитов"];
    expect(plural(1, f)).toBe("1 визит");
    expect(plural(3, f)).toBe("3 визита");
    expect(plural(5, f)).toBe("5 визитов");
    expect(plural(11, f)).toBe("11 визитов");
    expect(plural(22, f)).toBe("22 визита");
  });
  it("money and km use non-breaking spaces", () => {
    expect(fmtMoney(1973000)).toBe("1 973 000 ₸");
    expect(fmtKm(6312)).toBe("6,3 км");
  });
});
