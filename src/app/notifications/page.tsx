import type { Metadata } from "next";
import { alerts, dataset, notifications } from "@/lib/app-data";
import { dailyDigest } from "@/lib/engine/notify";
import { PageHeader } from "@/components/ui";
import { SendSimulator, type FeedItem } from "./SendSimulator";

export const metadata: Metadata = { title: "Уведомления — Пульс продаж" };

const fmtTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Almaty",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function NotificationsPage() {
  const items: FeedItem[] = notifications.map((n) => ({
    id: n.id,
    channel: n.channel,
    recipientName: n.recipientName,
    address: n.address,
    subject: n.subject,
    text: n.text,
    severity: n.severity,
    time: fmtTime.format(new Date(n.sentAt)),
  }));
  const head = dataset.managers.find((m) => m.role.startsWith("Руководитель"))!;
  const digest: FeedItem = {
    id: "digest",
    channel: "telegram",
    recipientName: head.name,
    address: head.telegram,
    subject: "Ежедневная сводка",
    text: dailyDigest(alerts, dataset),
    time: "каждое утро",
  };

  return (
    <>
      <PageHeader
        title="Уведомления руководству"
        subtitle="Критично — руководителю отдела продаж в Telegram и на e-mail, супервайзеру в Telegram. Высокий — супервайзеру в Telegram. Средний — супервайзеру на e-mail и в ежедневную сводку. Отправка симулируется: тексты формирует система, реальные токены не используются."
      />
      <SendSimulator items={items} digest={digest} />
    </>
  );
}
