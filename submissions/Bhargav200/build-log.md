# Build log

## 2026-09-27

- Read the brief, the rules, the GitHub guide, the data README and all 100 rows of the sample CSV.
- **Findings** (to raise as `finding` Issues):
  1. Resubmission: README, RULES and GITHUB-GUIDE say none. The organiser summary says you may resubmit before the deadline.
  2. Where to submit: GITHUB-GUIDE says no PR and no `submissions/<user>/` folder. The PR template, the submission-guard workflow and `_TEMPLATE` all assume one. **Decision:** follow the `submissions/<user>/` layout.
  3. ASIN `B0DUMMY357` is used for two different products: SKU-PROT-1KG (Whey Protein) and SKU-LAMP-LED (LED Desk Lamp).
  4. data/README says there's a 50-unit eval set labelled by two humans. README says the fixtures and eval set are ours to capture. None ships with the repo.
  5. The domain brief, the official evidence contract and the Returns Manager worked package are referenced but not present.
  6. Round 2 is an individual build, but part of the score is a cross-pod contract.
  7. Rows flagged `wrong_colour` or `wrong_variant` also have `identity_match = no`. It isn't defined whether a variant mismatch is an identity failure. **Decision:** keep identity (right product) and variant/colour (right version of it) as separate checks, so neither hides the other.
- **Stack:** Next.js + Supabase (hosted) + Ollama/LLaVA (local).
  - LLaVA handles one image better than several, so the unit's photos are composed into one labelled contact sheet. This also enforces one call per unit.
  - LLaVA is unreliable at counting and at applying rules, so the model only observes and `decide.ts` makes the call. Operator counts come first, and photo counts only corroborate them.
- **Built** in `agent/`:
  - observation schema, decision layer, evidence record with content hash, fail-open orchestrator, CLI agent
  - Supabase schema with RLS enabled and forced, private photo bucket, seed script, RLS isolation test script
- **Tests:** `npm test` passes 27 of 27. It covers the problem-statement scenarios, the uncertainty rules, fail-open, one call per unit, hash verification, and an exhaustive check that the overall verdict never masks a FAIL or UNCERTAIN.
- **Verified:** with Ollama not running, the CLI produced a `pending` record, and operator counts still flagged a short shipment (44 of 48).
- **Not yet verified:**
  - a real LLaVA run
  - the RLS test against a live Supabase project
  - any accuracy numbers; there are none yet

## 2026-09-28

- **Secrets:** the Supabase keys had been pasted into `agent/.env.example`, which is committed. They were moved to `agent/.env.local` (git-ignored) before any commit, and placeholders were restored. Nothing was ever pushed.
- **Supabase:** the keys authenticate. The schema SQL hasn't been run in the project yet, so there are no tables or bucket.
- **LLaVA on this laptop:** CPU only, no GPU, about 2.6 GB of RAM free, so the model swaps to disk.
  - First runs were `pending`: a 120 s timeout, then "fetch failed" at about 307 s from Node's 300 s header timeout on `stream:false`. Fail-open behaved correctly both times.
  - Fix: stream the response, a 10-minute timeout, the image sent to the model capped at 1024 px, and `num_predict` 900.
  - Result: **one unit took 420 s (7 min)** to return valid JSON.
- **First real model output is wrong: the model anchors on the PO line.**
  - The test image was a single blue bottle labelled "750ml", checked against UNIT-0001 (Cotton Bath Towel, blue, "bath", 1 × 24).
  - LLaVA reported: product matches the PO, variant "bath" seen, 1 carton and 24 units fully visible, no damage.
  - Only the colour was right.
  - The model repeated the purchase order back instead of describing the photo. A wrong-SKU delivery would have got identity PASS.
  - This is failure mode **F1: PO anchoring**.
- **Bug found by the same run:** the model wrote `components_missing: ["none"]`, and `decide.ts` read "none" as a missing part, giving a false FAIL. Placeholder entries are now filtered, with a test added (28 of 28 pass).
- **Blind prompt (`rcv-prompt/0.2-blind`):** the model is never shown the PO. `VisionProvider.observe()` no longer takes a PO line, so the rule is enforced by the code, not just the prompt. The model describes the product type, colour, label text, counts, damage and parts seen. The new `lib/match.ts` compares that with the PO using word, colour-family and measurement matching (e.g. 750ml vs 500ml). 49 tests pass, including a regression test for F1.
- **Same test image (blue bottle vs the towel PO line), blind prompt:**
  - **llava-phi3** (2.9 GB), 331 s:
    - product "water bottle", so **identity FAIL, which is correct**
    - colour blue: correct
    - label "750ml": correct
    - 1 unit: correct
    - claimed "1 carton visible" with no carton in the image, a hallucinated count (failure mode **F2**). That's why operator counts take priority over photo counts.
  - **llava** (4.7 GB): "fetch failed" at 306 s. Streaming didn't help, because Node's fetch also has a 300 s body/headers timeout, and a CPU run can sit silent that long while reading the image.
- **Timeout fix:** the Ollama provider now uses undici `fetch` with an `Agent` whose headers and body timeouts equal `OLLAMA_TIMEOUT_MS`. llava is being rerun with the fix so the comparison is fair.
- **llava rerun with the timeout fix:** 140 s, valid JSON.
  - product "water bottle", so identity FAIL (correct); colour blue and label "750ml", both correct.
  - Carton and unit counts were `null` (honest: none visible), and opened unit false.
  - It cited photo #2 when only one photo existed. Out-of-range citations are now dropped in `inspect.ts`, with a test (50 of 50 pass).
  - **Decision:** keep `llava` as the default. On this single image it was faster (140 s vs 331 s) and didn't invent a carton the way llava-phi3 did. That is one image, not an eval; order and RAM (llava-phi3 ran first, from a cold start) may explain part of the speed gap.
- **Supabase live:** the schema was run in the hosted project. `npm run seed` loaded 2 orgs, 100 PO lines and 2 demo operators.
- **`npm run test:rls`: 12 of 12 isolation checks pass**, run as real signed-in users with the public anon key:
  - alpha sees its 67 rows and nothing else
  - bravo sees 0 alpha PO lines, 0 alpha inspections and only its own org
  - bravo's insert into alpha is rejected by RLS
  - bravo can't download, sign a URL for, list, upload into, or publicly fetch (HTTP 400) an alpha photo, even with its exact path
  - control: alpha can download its own photo

## 2026-09-30

- **Read the whole portal** (Dashboard, My Track, problem page, Submit, Rules, Timeline, FAQ) and the Google submission form.
  - Track: Receiving Manager, seat 34, ticket CUBE-2026-0263.
  - The form requires a deployment URL, the demo video, the LinkedIn post (tagging CodeQuesters and Sydon.AI), and confirmation that README.md and ARCHITECTURE.md exist.
  - New contradictions are in [FINDINGS.md](FINDINGS.md) (1–11): resubmission, fork name, 7 vs 5 criteria, whether a deployment is required.
- **Checked the build against every item on the portal's problem page.** Two gaps: no "confidence where applicable" and no explicit "detected issues".
  - Added `checks[].confidence`, a fixed rule (high = operator count confirmed by photo; medium = one direct source; low = model-only count or FAIL from a poor photo; null for UNCERTAIN).
  - Added a derived `issues[]` list.
  - Contract bumped to **v0.2**; the example record was regenerated from a real CLI run and validates against the schema. The record page shows a "Detected issues" panel and a confidence column. It still reads 0.1 records.
- Added the **portal's worked example** as a test (22 of 24, blue, damaged carton → quantity FAIL, variant PASS, damage FAIL, EXCEPTION). It passes.
- **Hosted provider for the deployment:** `GeminiProvider`, behind the same `VisionProvider` interface, chosen by `VISION_PROVIDER`.
  - The key goes in a header, never the URL.
  - It is blind to the PO like Ollama.
  - Missing key, HTTP errors (incl. 429), a blocked request, a cut-off response and bad JSON all fail open to `pending`. Tested with a mocked `fetch`.
- **Eval harness:**
  - `lib/eval.ts`: TP/FN/FP/TN per check; UNCERTAIN is scored separately (abstained / correct abstain / forced); coverage; masked failures; accuracy by confidence level; Cohen's κ for two labellers, with consensus truth.
  - `scripts/eval.ts`: resumable runs, `--score-only`, `--dir`.
  - `eval/`: shot list for 22 cases covering every portal scenario, case sheet, label sheets.
- **Smoke-tested the harness with the real model** (local `llava`, the dev bottle photo, 2 cases; not the eval): 178 s and 76 s per unit.
  - **New failure mode F3:** on a unit-only photo, the model said carton damage "none", which became a carton PASS for a carton nobody saw.
  - Fix: "no damage" needs the carton (a carton/pallet photo, or a counted carton) or the product to be in the photos, otherwise UNCERTAIN.
  - Rerun (71 s each): carton damage is now UNCERTAIN on both cases, with no misses.
- **Tests: 73 of 73 pass.** Typecheck is clean.
- **Wrote** README (complete), ARCHITECTURE.md, eval-report.md (method; numbers pending the photo set), FINDINGS.md, customer letter, PR/FAQ, one-pager with kill condition, and build brief.
- **Not done yet:** the held-out photo set and eval numbers, deployment, demo video, LinkedIn post. Nothing is committed yet.

## 2026-10-01

- **Where the code lives.** Checked the portal, the organisers' main site and the git history of the starter repo.
  - On 25 Sep, at the start of the build phase, the organisers replaced the "branch + `submissions/<user>/` + PR" model with "build in your own fork, free structure".
  - The project stays in `submissions/Bhargav200/`, which the free structure allows. The fork root keeps a pointer README and ARCHITECTURE.
  - Added as finding 12, alongside the main site's "merged into the starter repo" wording.
- **Test inputs and evidence.**
  - The development photo is now a committed fixture (`agent/fixtures/dev-bottle-unit.jpg`), and the README has a "Test inputs" section with three runnable cases.
  - The six real development records from 28 Sep are now in `eval/dev-runs/`, with an index linking each to F1, F2, F4 and F6. All six verify against their content hash, and all used the fixture photo (same sha256).
  - Re-reading them showed F3 already in the 28 Sep blind LLaVA run (carton PASS with no carton), two days before it was noticed.
- Removed local-only clutter: the old `runs/` folder (copied first), the `.next` build cache and the TypeScript build info.
- **One vision model: Gemini 3.8 Flash, the default everywhere.**
  - Why: the eval has to measure the system that's deployed and demoed. Having LLaVA locally and Gemini live would have produced numbers for the wrong model.
  - Looked the model up on Google's docs (rule 5) instead of trusting the earlier default, `gemini-2.5-flash`. Google now limits the 2.5 models to earlier users and recommends 3.8 Flash for new projects, so a fresh free key would likely have been refused.
  - 3.8 Flash is on the free tier. It always thinks (medium by default), and thinking tokens count toward the output limit, so the limit was raised to 32k. Thought parts, if any, are ignored.
  - `generateContent` is still "fully supported" per Google's migration page, so no rewrite to the new Interactions API.
  - On the free tier Google may use content to improve its products. Noted in the README.
  - Ollama/LLaVA stays as an opt-in offline fallback (`VISION_PROVIDER=ollama`).
  - Tests: 75 of 75, including the default choice and ignoring thought parts.
- **Eval photo set.** Received 14 real delivery photos contributed by neighbours, who agreed to their publication.
  - Image fingerprints showed one duplicate (photo 8 is photo 6 re-saved), so it was removed, leaving 13 unique photos.
  - Converted to JPEG, unedited otherwise; a few carry a small website watermark from where they had been posted.
  - They became EV01–EV16. EV03, EV04 and EV08 reuse a photo against a different PO line (wrong SKU, wrong size, short shipment).
  - EV17–EV20 are left for the owner's own shots: correct shipment, missing part, size on a label, blurred photo.
  - The photos have no real PO, so the PO lines were written per scenario. The eval report says so.
  - Labels: the assistant drafted a first pass from the photos (marked `DRAFT`), and the owner confirms every row before the run. Labeller B, if available, starts from a blank sheet.
  - The set is damage-heavy, so many identity, count and component labels are UNCERTAIN. Stated in the report's limits.
- **Model switched to Gemini 3.5 Flash-Lite (still one default).**
  - With the owner's key, `gemini-3.8-flash` answered HTTP 503 "experiencing high demand" twice in a row. Both times the agent failed open correctly: `pending`, every visual check UNCERTAIN.
  - `gemini-3.5-flash-lite`, the other model Google recommends for new projects and also on the free tier, answered in 23 s. On EV02 its 9 verdicts matched all 9 of the owner's labels. That's one case, not a result.
  - The default is now 3.5 Flash-Lite; `GEMINI_MODEL=gemini-3.8-flash` switches back.
  - The Gemini provider now re-sends the same single request up to twice on 429/503 (2 s, then 5 s, inside the timeout budget), and never on other errors.
  - The eval runner re-tries `pending` cases on resume and moves the failed attempt to `records/attempts/` as evidence, never deleting it.
  - Tests: 78 of 78.
- **First held-out eval run** (`gemini-3.5-flash-lite-1`): 16 cases, 0 model failures, median 4.3 s per unit.
  - 0 masked failures.
  - Carton damage: 9 of 9 caught, 0 false alarms.
  - Wrong SKU (EV03) and wrong size (EV04) caught; QTY 9 counted right, and the short shipment caught.
  - Overall verdict matches the labels on 15 of 16.
  - New failure modes: **F7**, packaging described as the product, giving identity FAIL on 6 closed cartons. **F8**, unit punctures missed. **F9**, product box read as the carton. **F2b**, partial count claimed complete.
  - F7 is deliberately **not** fixed before reporting, so the run stays a held-out result. Any fix gets its own run, reported as not held-out.
- **F7 fixed, then re-measured** (commit `7632029`).
  - A packaging-only description ("cardboard carton", "small boxes") now gives identity UNCERTAIN, unless a printed label names the product. It can never give a wrong-SKU FAIL.
  - "pet supplies" was deliberately not special-cased: it names a product category, and tuning it away would be fitting the code to the eval photos.
  - 9 new tests; 87 of 87 pass.
- **Second run** (`gemini-3.5-flash-lite-2-after-f7-fix`, not held-out):
  - Forced identity FAILs went from 6 to 1. Masked failures still 0; carton damage still 9 of 9 with 0 false alarms.
  - Overall exact match went from 15 to 14 of 16, because run 1 got EV07 right only through the F7 false flag. The real miss underneath (F8, punctures) now shows.
  - New: **F10**, the carton's colour read as the product's colour (EV05). **F11**, run-to-run variation (EV01, EV05 changed between identical runs).
- **Dropped the optional extra cases EV17–EV20** (the owner's own shots) to meet the deadline. The eval is 16 cases from 13 photos. Missing components and bad photo are covered only by unit tests, and the report says so.

