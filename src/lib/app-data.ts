// Single place where the UI gets data: demo dataset → engine → alerts → notifications.
import { dataset } from "./data";
import { analyze, buildNotifications } from "./engine";

export { dataset };
export const alerts = analyze(dataset);
export const notifications = buildNotifications(alerts, dataset);
