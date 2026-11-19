import { describe, expect, it } from "vitest";
import { parseHandled, setHandled, severityCounts, splitByHandled } from "./handled";

describe("handled alerts", () => {
  it("parses stored ids and ignores garbage", () => {
    expect(parseHandled('["a","b"]')).toEqual(["a", "b"]);
    expect(parseHandled(null)).toEqual([]);
    expect(parseHandled("not json")).toEqual([]);
    expect(parseHandled('{"a":1}')).toEqual([]);
    expect(parseHandled('["a",1,null,"b","a"]')).toEqual(["a", "b"]);
  });

  it("marks and returns an alert without duplicates or mutation", () => {
    const ids = ["a"];
    expect(setHandled(ids, "b", true)).toEqual(["a", "b"]);
    expect(setHandled(ids, "a", true)).toEqual(["a"]);
    expect(setHandled(ids, "a", false)).toEqual([]);
    expect(ids).toEqual(["a"]);
  });

  it("splits alerts into open and handled keeping order", () => {
    const alerts = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(splitByHandled(alerts, ["b", "zzz"])).toEqual({ open: [{ id: "a" }, { id: "c" }], handled: [{ id: "b" }] });
  });

  it("counts by severity", () => {
    expect(severityCounts([{ severity: "critical" }, { severity: "medium" }, { severity: "critical" }])).toEqual({
      critical: 2,
      high: 0,
      medium: 1,
    });
  });
});
