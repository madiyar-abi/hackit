# Пульс продаж

Веб-система контроля торговых представителей молочного завода: автоматически фиксирует
отклонения (пропущенные визиты, падение продаж, лари без продаж и т.д.), определяет
возможные причины по данным и уведомляет руководство, эскалирует необработанное и через месяц
проверяет результат действий. Работает и на загруженных данных (CSV из 1С). Hack.IT 2026, направление Business.

**Демо онлайн:** https://puls-prodazh-nine.vercel.app

| Что | Где |
|---|---|
| Обзор руководителя (с результатом действий за прошлый месяц), отклонения (отметка «обработано», эскалация), карточки ТП и точек, уведомления, финмодель, пороги, свои данные (`/import`), приложение ТП (`/mobile`) | веб-приложение (`src/app/`) |
| Движок отклонений, причины, уведомления, эскалация и проверка результата (+ unit-тесты) | `src/lib/engine/` |
| Импорт CSV и второй пример данных («другой регион») | `src/lib/import/` |
| Демо-данные (генератор с фиксированным seed, 5 ситуаций кейса) | `src/lib/data/generate.ts` |
| Финансовая модель (Excel с формулами) | [`finance/financial-model.xlsx`](finance/financial-model.xlsx), см. [`finance/README.md`](finance/README.md) |
| Документация по шаблону Hack.IT | [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) |
| Презентация и сценарий видео | [`docs/PITCH.md`](docs/PITCH.md), [`docs/DEMO.md`](docs/DEMO.md) |

## Как запустить локально

Нужен Node.js ≥ 20. Интернет во время работы не нужен — демо-данные внутри репозитория.

```bash
git clone https://github.com/madiyar-abi/hackit.git
cd hackit
npm install
npm run dev        # http://localhost:3000
```

Проверки: `npm test` (unit-тесты движка отклонений), `npm run build` (продакшн-сборка),
`bash scripts/smoke.sh` (сборка + запуск + проверка всех страниц).
Пороги срабатывания — `src/lib/engine/config.ts`.

Деплой: `vercel deploy --prod` (проект `puls-prodazh` в Vercel).

## Contributing

1. Create a branch: `git checkout -b feature/<name>`
2. Commit small, focused changes.
3. Open a pull request into `main`.
