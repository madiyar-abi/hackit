# Пульс продаж

Веб-система контроля торговых представителей молочного завода: автоматически фиксирует
отклонения (пропущенные визиты, падение продаж, лари без продаж и т.д.), определяет
возможные причины по данным и уведомляет руководство. Hack.IT 2026, направление Business.

## Как запустить локально

Нужен Node.js ≥ 20. Интернет во время работы не нужен — демо-данные внутри репозитория.

```bash
git clone https://github.com/madiyar-abi/hackit.git
cd hackit
npm install
npm run dev        # http://localhost:3000
```

Проверки: `npm test` (unit-тесты движка отклонений), `npm run build` (продакшн-сборка).

## Contributing

0. **Read [`HANDOFF.md`](./HANDOFF.md) first** — what's done, what's left, how to continue.
1. Create a branch: `git checkout -b feature/<name>`
2. Commit small, focused changes.
3. Open a pull request into `main`.

AI agent rules for this repo: see [`CLAUDE.md`](./CLAUDE.md).
