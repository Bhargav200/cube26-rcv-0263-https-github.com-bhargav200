# CLAUDE.md: Receiving Manager

Durable constraints for anyone, human or AI, working on this code.

## What this is
The Receiving Manager is step 1 of 5 in the chain, at supplier delivery. It records the **condition of goods on arrival** against the PO line, and its evidence record is consumed by Prep (step 2) and Recovery (step 5). The join key across all five pods is `unit_id`.

## Hard rules (never break)
1. **Tenancy isolation.** Every table has `org_id` with RLS **enabled and forced**. Photos live in a private bucket at `{org_id}/{uuid}.{jpg|png|webp}` (original bytes, so the recorded sha256 matches) and are served only through signed URLs. `npm run test:rls` must pass.
2. **One model call per unit.** All photos are composed into one contact sheet, and all checks go in one call. Never add a call per check.
3. **Fail open.** A model error, timeout or invalid output still saves the photos and a record with `status = pending`. Nothing blocks the operator.
4. **UNCERTAIN is a first-class verdict, not a low-confidence PASS.** It carries no `confidence`.
   - An overall ACCEPT requires every check to be PASS. Any FAIL gives EXCEPTION, and otherwise any UNCERTAIN gives REVIEW.
   - Poor photos downgrade a model PASS to UNCERTAIN.
   - Conflicting counts give UNCERTAIN.
   - "No damage" on a carton or unit that isn't in the photos gives UNCERTAIN (F3).
5. **Look authoritative rules up.** The sample CSV's verdict and flag columns are dummy examples. Never use them as rules or as ground truth.
6. **The model observes and code decides.** Verdicts come from `agent/lib/decide.ts` and `agent/lib/match.ts`, never directly from model text.
7. **The model is blind to the PO.** `VisionProvider.observe()` takes no PO line, and the prompt never contains SKU, spec or counts. When shown the PO, LLaVA echoed it back (failure mode F1 in the build log). Never add expected values to the prompt.
8. **Overrides are data.** They are append-only, and keep the original verdict, the new verdict, the reason, who made the change and when. Never update or delete them.
9. **Records are immutable.** A retry of a pending record inserts a new row with `retry_of`.
10. **No secrets in git.** Only `.env.example` is committed.
11. **Do not invent evidence.** If it isn't visible or documented, the answer is UNCERTAIN.

## Forbidden language (in docs, UI and README)
- "tamper-proof", "immutable ledger", "anchored", "blockchain-verified". We have a sha256 **content hash**, and we call it that.
- "accurate", "works well" or "reliable" without a number next to them and the method written down.
- "AI-verified" for a check that came from an operator count. Say which source each value came from.
- "guaranteed", "certified", "compliant". We don't certify anything.

## Where to look
- Decision rules: `agent/lib/decide.ts`
- Model prompt and schema: `agent/lib/vision/prompt.ts` and `agent/lib/observation.ts` (bump `PROMPT_VERSION` when the prompt changes)
- Vision providers: `agent/lib/vision/gemini.ts` (the default everywhere), `agent/lib/vision/ollama.ts` (opt-in offline fallback), chosen by `VISION_PROVIDER` in `agent/lib/vision/index.ts`. Eval numbers must come from the default model. A new provider must take no PO line and throw `VisionError` for every failure.
- Eval: `agent/lib/eval.ts` (scoring), `agent/scripts/eval.ts` (runner), `eval/` (cases, labels, photos, results). Never tune prompts or matching on the eval photos.
- Evidence record and hash: `agent/lib/evidence.ts`, with the shape published in `contract/`
- Schema and RLS: `agent/supabase/migrations/`
