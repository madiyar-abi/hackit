"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Обзор" },
  { href: "/alerts", label: "Отклонения" },
  { href: "/reps", label: "Сотрудники" },
  { href: "/notifications", label: "Уведомления" },
  { href: "/finance", label: "Финмодель" },
];

export function Nav() {
  const path = usePathname();
  return (
    <aside className="bg-ink text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4 md:block md:py-7">
        <Link href="/" className="block">
          <PulseMark />
          <span className="mt-2 block font-display text-lg font-semibold leading-tight tracking-tight">
            Пульс продаж
          </span>
          <span className="hidden text-xs text-white/60 md:block">Контроль торговой команды</span>
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3" aria-label="Разделы">
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-white text-ink font-medium" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <p className="hidden px-5 pt-6 text-xs leading-relaxed text-white/50 md:block">
        Демо-данные: 12 торговых представителей, 120 точек, Алматы.
      </p>
    </aside>
  );
}

function PulseMark() {
  return (
    <svg width="44" height="18" viewBox="0 0 44 18" fill="none" aria-hidden="true">
      <path d="M1 10h10l3-7 5 13 4-9 2 3h18" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="41" cy="10" r="2.6" fill="#d7263d" />
    </svg>
  );
}
