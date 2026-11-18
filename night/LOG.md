# LOG — night/2026-11-19 (append-only)

## 2026-11-19 00:25 lead
- Read SPEC/NIGHT/HANDOFF. Wrote night/TASKS.md (T1–T17). Workers: codex → T10 finance model;
  gemini → T11 docs skeleton, then T12 /finance page (after T1 + T10 land on the night branch).
- Assumptions: product name «Пульс продаж»; Next.js 15 + Tailwind + vitest; demo data generated
  deterministically in TypeScript (seeded PRNG) at build time; budget line items and effect
  assumptions defined by lead in TASKS.md "Notes for T10" (total ≈ 27.17 млн ₸ ≤ 30 млн).
- No LibreOffice on this Mac → formula evaluation for verification via pycel/formulas in a venv.
- Next: T1 scaffold, T2 data, T3–T5 engine.

## 2026-11-19 00:28 lead
- T1 done: Next.js 15.5 (App Router, TS, Tailwind 4) + vitest 3 scaffolded at repo root.
  Removed next/font/google (needs internet at build) → system font stack. build + test pass.
- Assumption: package name `puls-prodazh`; .gitignore kept ours + Next/Vercel entries + finance/.venv/.

## 2026-11-19 00:31 gemini
- T11 done: docs/DOCUMENTATION.md created with all 16 Hack.IT template sections in correct order.
  Filled: Название («Пульс продаж»), Направление и кейс (verbatim case text from SPEC.md),
  Команда (placeholder names [Участник 1..4] with role descriptions),
  Риски и ограничения (10 realistic risks with mitigations: staff resistance, GPS accuracy,
  internet coverage, 1C integration, budget overrun, scaling, cloud vendor lock-in,
  false alerts, personal data privacy, tight timeline),
  Источники (3 case PDFs in docs/case/).
  Remaining sections marked as lead-owned placeholders.
- Next: T12 (finance page) — waiting for finance/summary.json from codex (T10).
