// Management notifications: who gets what, through which channel, with which text.
// Sending is simulated — messages are rendered and stored in the feed, no tokens/network.
import type { Alert, Channel, Dataset, Manager, NotificationMessage, Severity } from "../types";
import { getOutlet, getRep, periodLabel } from "../selectors";
import { fmtMoney } from "../format";
import { riskSummary } from "./risk";

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Критично",
  high: "Высокий",
  medium: "Средний",
};
const SEVERITY_ICON: Record<Severity, string> = { critical: "🔴", high: "🟠", medium: "🟡" };

export const TYPE_LABEL: Record<Alert["type"], string> = {
  missed_visits: "Пропущенные визиты",
  sales_drop: "Падение продаж",
  no_freezer: "Нет ларя компании",
  freezer_no_sales: "Ларь без продаж",
  plan_underperformance: "Невыполнение плана",
  gps_mismatch: "Визит вне точки (GPS)",
};

/**
 * Routing: critical → head of sales (Telegram + e-mail) and the supervisor (Telegram);
 * high → supervisor (Telegram); medium → supervisor (e-mail, daily digest).
 */
export function recipients(alert: Alert, d: Dataset): { manager: Manager; channel: Channel }[] {
  const head = d.managers.find((m) => m.role.startsWith("Руководитель"))!;
  const sup = d.managers.find((m) => m.id === getRep(d, alert.repId).supervisorId)!;
  switch (alert.severity) {
    case "critical":
      return [
        { manager: head, channel: "telegram" },
        { manager: head, channel: "email" },
        { manager: sup, channel: "telegram" },
      ];
    case "high":
      return [{ manager: sup, channel: "telegram" }];
    case "medium":
      return [{ manager: sup, channel: "email" }];
  }
}

export function renderMessage(alert: Alert, d: Dataset, channel: Channel): { subject: string; text: string } {
  const rep = getRep(d, alert.repId);
  const outlet = alert.outletId ? getOutlet(d, alert.outletId) : undefined;
  const cause = alert.causes[0];
  const subject = `[${SEVERITY_LABEL[alert.severity]}] ${TYPE_LABEL[alert.type]}: ${alert.title}`;
  const lines = [
    channel === "telegram"
      ? `${SEVERITY_ICON[alert.severity]} ${SEVERITY_LABEL[alert.severity].toUpperCase()} · ${TYPE_LABEL[alert.type]}`
      : `Уровень: ${SEVERITY_LABEL[alert.severity]} · ${TYPE_LABEL[alert.type]} · ${periodLabel(alert.period)}`,
    alert.title,
    alert.description,
    `ТП: ${rep.name}${outlet ? ` · Точка: ${outlet.name}, ${outlet.address}` : ""}`,
    `Под угрозой: ${fmtMoney(alert.impact)} в месяц`,
    cause ? `Вероятная причина: ${cause.title} (${cause.evidence[0]})` : "",
    alert.actions[0] ? `Что сделать: ${alert.actions[0]}` : "",
    `Открыть в системе: /alerts#${alert.id}`,
  ].filter(Boolean);
  return { subject, text: lines.join("\n") };
}

export function buildNotifications(alerts: Alert[], d: Dataset): NotificationMessage[] {
  return alerts.flatMap((a) =>
    recipients(a, d).map(({ manager, channel }, i) => {
      const { subject, text } = renderMessage(a, d, channel);
      const sentAt = new Date(new Date(a.detectedAt).getTime() + (i + 1) * 15_000).toISOString();
      return {
        id: `${a.id}-${manager.id}-${channel}`,
        alertId: a.id,
        channel,
        recipientId: manager.id,
        recipientName: manager.name,
        address: channel === "telegram" ? manager.telegram : manager.email,
        subject,
        text,
        severity: a.severity,
        sentAt,
      } satisfies NotificationMessage;
    }),
  );
}

/** Morning digest for the head of sales: counts and money at risk. */
export function dailyDigest(alerts: Alert[], d: Dataset): string {
  const by = (s: Severity) => alerts.filter((a) => a.severity === s).length;
  const risk = riskSummary(alerts);
  return [
    `📊 Пульс продаж — сводка за ${periodLabel(d.currentPeriod).toLowerCase()}`,
    `Отклонений: ${alerts.length} (🔴 ${by("critical")} · 🟠 ${by("high")} · 🟡 ${by("medium")})`,
    `Продажи под угрозой: ${fmtMoney(risk.lostSales)} в месяц, недобор плана: ${fmtMoney(risk.planGap)}`,
    ...alerts.slice(0, 5).map((a) => `${SEVERITY_ICON[a.severity]} ${a.title}`),
  ].join("\n");
}
