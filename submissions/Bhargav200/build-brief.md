# Build brief

What was decided before and during the build, and what was deliberately left out.

## Scope (in)
- Nine checks covering everything the portal lists for Receiving: identity, variant/colour, carton count, units per carton, quantity, carton damage, unit damage, components, defects.
- PASS / FAIL / UNCERTAIN per check; ACCEPT / REVIEW / EXCEPTION overall; the overall result never masks a check.
- An evidence record per unit (contract v0.2), with a content hash, photo hashes, raw model output and reasons.
- A web app (inspect, record, review queue, overrides) and a headless CLI on the same core.
- Tenancy isolation (RLS forced, private photos, isolation test) before any feature.
- Fail open to `pending`; one model call per unit.
- An eval harness with human labels, per-check FP / FN / UNCERTAIN.

## Scope (out, on purpose)
- Barcode / label OCR as a separate pipeline. The model reads label text in the same single call.
- Per-SKU reference images or fine-tuning. The brief asks whether vision works **without** them.
- Supplier claim filing. That is Recovery's job; we hand it the record.
- Pallet-level counting of large pallets. Operator counts cover it.
- Real Amazon rules or fees. None are needed at receiving, and the sample values are dummies.

## Stack
- Next.js 16 + TypeScript, Supabase (Postgres, RLS, Storage, Auth), sharp for image handling, zod for output validation, vitest for tests.
- Vision: **Gemini `gemini-3.5-flash-lite` as the single default** (local runs, eval, deployment), with Ollama `llava` kept as an opt-in offline fallback (free, private, slow on CPU), behind one `VisionProvider` interface.

## Order of work
1. Schema + RLS + isolation test → 2. decision layer + tests → 3. fail-open orchestrator + CLI → 4. real model runs (found F1, F2) → 5. blind prompt + matcher → 6. web app → 7. hosted provider, confidence, issues → 8. eval harness → 9. held-out eval → 10. docs, deploy, demo.
