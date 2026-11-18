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

## 2026-11-19 00:31 codex
- T10 complete. Generated the five-sheet Excel workbook and the exact JSON contract for T12.
  Ran `python3 finance/build_model.py && python3 finance/verify.py`. Independent formula
  evaluation passed for the budget and all three scenarios.
- Assumptions: monthly implementation costs are editable on «Бюджет» as allowed in T10.
  Reserve remains OPEX. ROI uses 12 months of operations after deployment. Payback starts
  when benefits begin. Excel recalculates on open. The virtualenv ignore rule was already present.
- Budget 27 170 000 ₸ over six months. Base annual net effect 87 600 000 ₸,
  first-year ROI 222.4%, payback 3.72 months.
- Next: lead merges the worker branch so T12 can use finance/summary.json.
