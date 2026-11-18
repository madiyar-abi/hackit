import type { Alert, Dataset } from "../types";
import { DEFAULT_CONFIG, type EngineConfig } from "./config";
import { detectDeviations } from "./detect";
import { toAlert } from "./causes";

export { DEFAULT_CONFIG } from "./config";
export type { EngineConfig } from "./config";
export { detectDeviations } from "./detect";
export { buildNotifications, dailyDigest, SEVERITY_LABEL, TYPE_LABEL } from "./notify";

/** Full pipeline: detect deviations → explain causes → recommended actions. */
export function analyze(d: Dataset, c: EngineConfig = DEFAULT_CONFIG): Alert[] {
  return detectDeviations(d, c).map((dev) => toAlert(dev, d, c));
}
