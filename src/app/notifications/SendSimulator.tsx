"use client";
import { useRef, useState } from "react";
import type { Channel, Severity } from "@/lib/types";
import { Panel, SeverityBadge } from "@/components/ui";

/** Plain, serialisable notification for the client view (time is pre-formatted on the server). */
export interface FeedItem {
  id: string;
  channel: Channel;
  recipientName: string;
  address: string;
  subject: string;
  text: string;
  severity?: Severity;
  time: string;
}

const CHANNEL_LABEL: Record<Channel, string> = { telegram: "Telegram", email: "E-mail" };
const FILTERS: { value: Channel | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "E-mail" },
];

const nowHHMM = () =>
  new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit" }).format(new Date());

/** Feed of sent notifications + preview of the selected one with a simulated re-send. */
export function SendSimulator({ items, digest }: { items: FeedItem[]; digest: FeedItem }) {
  const [filter, setFilter] = useState<Channel | "all">("all");
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? digest.id);
  const [sent, setSent] = useState<Record<string, string>>({});
  const previewRef = useRef<HTMLDivElement>(null);

  const shown = filter === "all" ? items : items.filter((n) => n.channel === filter);
  const selected = selectedId === digest.id ? digest : (items.find((n) => n.id === selectedId) ?? digest);
  const count = (c: Channel | "all") => (c === "all" ? items.length : items.filter((n) => n.channel === c).length);

  function select(id: string) {
    setSelectedId(id);
    // On narrow screens the preview sits below the feed — bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) previewRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-6">
        <Panel title="Ежедневная сводка">
          <FeedRow item={digest} selected={selected.id === digest.id} onSelect={select} />
        </Panel>

        <Panel
          title={`Лента · ${shown.length}`}
          action={
            <div className="flex gap-1" role="group" aria-label="Канал">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    filter === f.value ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink-soft"
                  }`}
                >
                  {f.label} <span className={filter === f.value ? "text-white/70" : "text-muted"}>{count(f.value)}</span>
                </button>
              ))}
            </div>
          }
        >
          <ul className="divide-y divide-line">
            {shown.map((n) => (
              <li key={n.id}>
                <FeedRow item={n} selected={selected.id === n.id} onSelect={select} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div ref={previewRef} className="scroll-mt-6 lg:sticky lg:top-8">
        <Panel title="Предпросмотр сообщения" action={<span className="text-xs text-muted">{CHANNEL_LABEL[selected.channel]}</span>}>
          {selected.channel === "telegram" ? <TelegramPreview item={selected} /> : <EmailPreview item={selected} />}
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3.5">
            <button
              type="button"
              onClick={() => setSent((s) => ({ ...s, [selected.id]: nowHHMM() }))}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft"
            >
              Отправить повторно (симуляция)
            </button>
            <span className="text-sm text-ok" aria-live="polite">
              {sent[selected.id] &&
                (selected.channel === "telegram"
                  ? `Отправлено в Telegram ${selected.address} в ${sent[selected.id]}`
                  : `Отправлено на e-mail ${selected.address} в ${sent[selected.id]}`)}
            </span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FeedRow({ item, selected, onSelect }: { item: FeedItem; selected: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(item.id)}
      className={`block w-full border-l-[3px] px-5 py-3.5 text-left transition-colors ${
        selected ? "border-l-frost bg-frost-soft/50" : "border-l-transparent hover:bg-milk"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="rounded-md border border-line bg-carton px-2 py-0.5 text-ink-soft">{CHANNEL_LABEL[item.channel]}</span>
        <span className="tabular-nums">{item.time}</span>
      </div>
      <div className="mt-2 text-sm">
        <span className="font-medium">{item.recipientName}</span> <span className="text-muted">{item.address}</span>
      </div>
      <div className="mt-1.5 flex items-start gap-2 text-sm">
        {item.severity && <SeverityBadge severity={item.severity} />}
        {/* The badge already shows the level, so drop the "[Критично] " prefix here. */}
        <span className="min-w-0 flex-1 text-ink-soft">{item.subject.replace(/^\[[^\]]+\]\s*/, "")}</span>
      </div>
    </button>
  );
}

function TelegramPreview({ item }: { item: FeedItem }) {
  return (
    <div>
      <p className="border-b border-line px-5 py-2.5 text-xs text-muted">
        Чат с ботом · кому: <span className="text-ink">{item.recipientName}</span>, {item.address}
      </p>
      <div className="bg-milk px-4 py-5 md:px-5">
        <div className="flex items-start gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white"
            aria-hidden="true"
          >
            ПП
          </span>
          <div className="min-w-0 max-w-[34rem] rounded-2xl rounded-tl-sm bg-frost-soft px-4 py-3">
            <div className="text-sm font-semibold text-frost">Пульс продаж · бот</div>
            <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed">{item.text}</p>
            <div className="mt-1.5 text-right text-xs text-muted">{item.time}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ item }: { item: FeedItem }) {
  return (
    <div>
      <dl className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-line px-5 py-4 text-sm">
        <dt className="text-muted">От:</dt>
        <dd className="break-words">Пульс продаж &lt;pulse@dolina-demo.kz&gt;</dd>
        <dt className="text-muted">Кому:</dt>
        <dd className="break-words">
          {item.recipientName} &lt;{item.address}&gt;
        </dd>
        <dt className="text-muted">Тема:</dt>
        <dd className="break-words font-medium">{item.subject}</dd>
        <dt className="text-muted">Дата:</dt>
        <dd className="tabular-nums">{item.time}</dd>
      </dl>
      <p className="whitespace-pre-line break-words px-5 py-4 text-sm leading-relaxed">{item.text}</p>
    </div>
  );
}
