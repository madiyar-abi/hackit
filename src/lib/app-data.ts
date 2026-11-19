// Single place where the UI gets data: demo dataset → engine → alerts → notifications.
import { dataset } from "./data";
import { analyze, buildNotifications } from "./engine";
import { actionOutcomes, outcomeSummary, recurringIds } from "./engine/loop";

export { dataset };
export const alerts = analyze(dataset);
export const notifications = buildNotifications(alerts, dataset);
/** Last month's deviations and what happened to them this month (closed loop). */
export const outcomes = actionOutcomes(dataset, alerts);
export const outcomesTotal = outcomeSummary(outcomes);
/** Current alerts that repeat last month's deviation → escalated at once. */
export const recurring = recurringIds(outcomes);
