# Architecture: Receiving Manager

One sentence: **a vision model describes the photos without knowing what was ordered, deterministic code compares that description with the PO line, and the result is saved as a hashed evidence record under row-level security.**

## 1. System at a glance

```
                ┌──────────────────────── Next.js 16 app (agent/app) ─────────────────────────┐
 operator ──►   │  /login   /  (Inspect form)   /records/[id]   /records/[id]/json   /queue    │
 (browser)      │               │ server action inspectAction / retryAction / overrideAction  │
                └───────────────┼─────────────────────────────────────────────────────────────┘
                                ▼
                ┌──────────────── lib/inspect.ts: inspectUnit() ───────────────────────────┐
                │ 1 sha256 every original photo                                            │
                │ 2 compose ONE labelled contact sheet   (lib/vision/compose.ts, sharp)    │
                │ 3 ONE model call, PO NOT sent          (lib/vision/{ollama,gemini}.ts)   │
                │      └─ any error → observation = null → record status "pending"        │
                │ 4 validate output against the schema   (lib/observation.ts, zod)         │
                │ 5 decide 9 checks                      (lib/decide.ts + lib/match.ts)    │
                │ 6 overall, issues, CSV-style summary, content hash (lib/evidence.ts)     │
                └───────────────┬──────────────────────────────────────────────────────────┘
                                ▼
                ┌──────────────── Supabase (Postgres + Storage) ───────────────────────────┐
                │ orgs · org_members · po_lines · inspections · inspection_photos ·        │
                │ overrides        RLS enabled + FORCED on every table, scoped by org_id   │
                │ private bucket receiving-photos/{org_id}/{uuid}.jpg → signed URLs only   │
                └──────────────────────────────────────────────────────────────────────────┘

 Same core, no web app:  scripts/agent.ts (one unit, CLI)   scripts/eval.ts (held-out set + scoring)
```

## 2. Components

| Component | File(s) | Responsibility |
|---|---|---|
| Domain types | `lib/types.ts` | `PoLine` (expected), `OperatorCounts`, `Check` (verdict, confidence, expected, observed, source, photo refs, reason), `Overall` |
| PO loader | `lib/po.ts` | Reads the expected side from `data/receiving_sample.csv`. **Ignores the CSV's verdict columns** (dummy values, engineering rule 5). |
| Contact sheet | `lib/vision/compose.ts` | Tiles every photo of a unit into one image, labelled `#1 carton`, `#2 unit`, …, so there is one call per unit and the model can cite photos by number. EXIF rotation is respected. |
| Prompt | `lib/vision/prompt.ts` | System + user prompt, versioned (`rcv-prompt/0.2-blind`). **Never contains SKU, spec or counts.** |
| Observation schema | `lib/observation.ts` | A flat zod schema of what the model may report. It is also sent to the model as a JSON schema to constrain its output. |
| Vision providers | `lib/vision/gemini.ts`, `lib/vision/ollama.ts`, `lib/vision/index.ts` | Same interface: `observe(sheet, roles)`, with **no PO parameter**. **Gemini 3.5 Flash-Lite is the one default** (hosted, key sent in a header). Ollama (local LLaVA, streamed, 10-minute timeout) is an opt-in offline fallback. `VISION_PROVIDER` picks one. |
| Matcher | `lib/match.ts` | Deterministic comparison: product-word overlap for identity, colour families, measurements for variants (500 ml ≠ 750 ml), component words. |
| Decision layer | `lib/decide.ts` | Turns observation + operator counts + PO into 9 checks, then the overall verdict. All the uncertainty rules live here. |
| Evidence | `lib/evidence.ts` | Record assembly, derived `issues[]` and CSV-compatible `summary`, canonical JSON, sha256 content hash, verification. |
| Orchestrator | `lib/inspect.ts` | `inspectUnit()`: the only entry point used by the web app, CLI and eval. Never throws for model problems. |
| Persistence | `lib/records.ts`, `supabase/migrations/0001_schema.sql` | Insert-only records and photo rows. Overrides are applied as a view and never change the stored record. |
| Web app | `app/` | Inspect form, record page, review queue, JSON download, login. `proxy.ts` sends signed-out users to /login; the real access control is RLS. |
| Eval | `lib/eval.ts`, `scripts/eval.ts`, `../eval/` | Runs the held-out set, scores against human labels, writes `results.md` + `metrics.json`. |
| Tenancy test | `scripts/test-rls.ts` | Signs in as each org with the public anon key and tries to read, write, sign, list and fetch the other org's data. |

## 3. Data flow for one inspection

1. **Input.** The operator picks a PO line (the `po_lines` table only returns lines in their org), attaches 1–8 photos with roles, and optionally types a carton count and a units-per-carton count.
2. **Photos stored first.** Each photo is uploaded, as its original bytes, to `receiving-photos/{org_id}/{random uuid}.{ext}`. From here on the capture exists even if everything after fails.
3. **Hashing.** The sha256 of each original photo goes into the record. The model sees a resized copy, and the evidence points to the originals.
4. **One model call.** The contact sheet and the photo roles go to the provider. The PO line is not sent.
5. **Validation.** The output must parse as JSON and match `ObservationSchema`. Otherwise the result is a `VisionError`, and the record goes to `pending`.
6. **Decision.** `decide()` builds 9 checks. `inspectUnit()` drops photo citations that point at photos that don't exist.
7. **Record.** `buildRecord()` adds `contract_version`, `stage`, the derived `issues[]` and the `content_hash`.
8. **Save.** One `inspections` row (the record as `jsonb`, with a DB constraint that its `org_id`, `record_id` and hash match the columns), plus one `inspection_photos` row per photo.
9. **Review.** The record page re-verifies the content hash and each photo's sha256 on every view, shows issues and checks, and accepts overrides.

## 4. Model usage

| | **Default** (local runs, eval, deployment, demo) | Offline fallback (opt-in) |
|---|---|---|
| Provider | Google Gemini API (`generateContent`) | Ollama |
| Model | `gemini-3.5-flash-lite` (set by `GEMINI_MODEL`; `gemini-3.8-flash` also works) | `llava` (7B, 4.7 GB); `llava-phi3` tried |
| Calls per unit | 1 | 1 |
| Input | 1 contact sheet, ≤1536 px, + roles | 1 contact sheet, ≤1024 px, + roles |
| Output | JSON constrained by the schema (`responseJsonSchema`); room for the model's built-in thinking (32k output tokens) | JSON constrained by the schema (`format`) |
| Temperature | 0 | 0 |
| Observed latency | median 4.3 s, p90 5.2 s, max 7.7 s per unit (held-out eval run 1, 16 cases; see eval report) | 70–420 s per unit on a CPU-only laptop |
| Failure handling | temporary overload (HTTP 429 / 503) → the same single request is re-sent up to 2 times (2 s, 5 s), within the timeout; then, or on missing key / other HTTP error / blocked / cut off / bad JSON → `pending` | timeout / unreachable / bad JSON → `pending` |
| Cost / privacy | Free tier; Google may use free-tier content to improve its products | Free; nothing leaves the machine |

**Why one default model, and why this one.** The eval has to measure the model the judges will see on the live URL and in the demo. Two defaults (LLaVA locally, Gemini live) would mean the numbers describe a different system from the one deployed. The model was looked up on Google's own pages on 2026-10-01: Google now limits the 2.5 models to earlier users and recommends **3.5 Flash-Lite or 3.8 Flash** for new projects, and both are on the free tier. 3.8 Flash answered HTTP 503 "experiencing high demand" on every attempt that day, while 3.5 Flash-Lite answered in about 20 s, so 3.5 Flash-Lite is the default; the eval was run on it. `generateContent` is still fully supported (Google recommends its newer Interactions API for new work, but nothing here needs its features).

**Why blind.** The first real run (prompt 0.1) showed LLaVA the PO: "Cotton Bath Towel, blue, bath, 1 × 24". The photo was one blue 750 ml bottle. The model reported that the product matched, the variant "bath" was seen, and 24 units were visible. It repeated the order back instead of describing the photo, so a wrong-SKU delivery would have passed. This is failure mode **F1**. Since prompt 0.2 the provider interface has no PO parameter at all, so this can't come back by accident.

**Why one contact sheet.** It enforces engineering rule 2 (one call per unit), and LLaVA is built around a single image input, so several separate images per call are not an option for it anyway. The `#N` labels let every check cite the photo it relied on.

## 5. Decision logic

Each check has a verdict (PASS, FAIL or UNCERTAIN), a confidence, an expected value, an observed value, the source of the observed value (`model`, `operator`, `derived` or `none`), the photo refs and a reason.

| Check | PASS | FAIL | UNCERTAIN |
|---|---|---|---|
| `identity` | a product word shared between what was seen and the PO title/SKU | a product was seen and nothing is shared | model can't tell what it is; only packaging seen and no label names the product (F7); no usable photos |
| `variant_colour` | colour in the same family **and** spec variant printed on the label | a different colour family, or a different measurement in the same unit | colour not determinable, or variant not printed |
| `carton_count` | count = ordered | count ≠ ordered | no count; photo count partial; operator and photo counts **disagree** |
| `units_per_carton` | same as above for the opened carton | | |
| `quantity` | cartons × units = ordered | short or extra (the reason states by how many) | either count uncertain |
| `carton_damage` / `unit_damage` | "none", **and** the carton/product is actually in the photos | damaged (type named: crushing, water, tears) | unclear; self-contradictory output; nothing to vouch for (F3) |
| `components` | a unit out of its packaging with every spec component seen | a unit shown, a component not seen | no unit shown out of its packaging |
| `defects` | model says no defect | defect present | unclear |

Rules across all checks:

- Photo quality `unusable`, or no observation at all: every visual check is UNCERTAIN.
- Photo quality `poor`: a model PASS is downgraded to UNCERTAIN. A FAIL is kept, because a visible problem is still a problem, and EXCEPTIONs go to a human anyway.
- **Overall:** any FAIL → `EXCEPTION`, otherwise any UNCERTAIN → `REVIEW`, and only nine PASSes → `ACCEPT`. An exhaustive test checks that the overall result never hides a FAIL or UNCERTAIN.
- **Confidence** (fixed rule, see `lib/types.ts`):
  - `high`: the operator count is confirmed by the photo count
  - `medium`: one direct source (an operator count, or a model check on a good photo)
  - `low`: a model-only count, or a FAIL kept from a poor photo
  - the quantity check takes the weaker confidence of its two counts
  - UNCERTAIN has no confidence

## 6. Evidence trace

The brief's chain of questions maps to fields of the record:

| Question | Field |
|---|---|
| What was received? | `photos[]` (index, role, storage ref, sha256), `operator_counts` |
| What was expected? | `expected` (the full PO line and spec) |
| What checks were performed? | `checks[].name`, `model` (provider, model, prompt version, latency, raw output, error) |
| What did the agent find? | `checks[].observed`, `checks[].source`, `checks[].photo_refs`, `issues[]` |
| What verdict was produced? | `checks[].verdict`, `checks[].confidence`, `overall`, `status` |
| Why? | `checks[].reason`; `model.raw_output` for the model's exact words |
| Who changed it afterwards? | the `overrides` table: original verdict, new verdict, reason, operator, time (insert-only) |

Integrity: `content_hash` is sha256 over the canonical JSON (keys sorted at every level) of every other field. The record page recomputes it and each photo's sha256 on every view. This is a **content hash**: it shows whether stored content still matches what was written. It is not tamper-proof, since someone with database admin rights could rewrite both. It is not a signature, and it is not anchored anywhere external.

Immutability in practice: RLS grants no UPDATE or DELETE on `inspections` or `overrides`. A retry of a pending record inserts a new row with `retry_of`, and the old one stays.

**Cross-pod contract:** `contract/receiving-evidence.schema.json` (v0.2). `summary` repeats the organisers' CSV vocabulary (`identity_match`, `carton_damage`, `quality_flags`, …) so Prep and Recovery can read it without learning a new shape. The join key is `unit_id`. Validate a record with any JSON Schema validator (e.g. `python -c "import json,jsonschema; jsonschema.validate(json.load(open('record.json')), json.load(open('contract/receiving-evidence.schema.json')))"`).

## 7. Tenancy isolation

- Every table has `org_id`, with RLS **enabled and forced**. `is_member(org)` is a `security definer` function that checks `org_members` for `auth.uid()`.
- Inserts into `inspections` and `overrides` require `is_member(org_id)` and `created_by = auth.uid()`. Inserts into `inspection_photos` and the photo bucket require `is_member(org_id)`. There are no update or delete policies at all.
- The photo bucket is private. Read and insert policies check that the first folder of the object path is an org the user belongs to, and a DB constraint ties `inspection_photos.path` to its `org_id`. Photo names are random UUIDs, not unit IDs, so they can't be guessed.
- `npm run test:rls` result (2026-09-28, live project): **12 of 12 passed.** Checked: alpha sees only its own rows; bravo sees 0 alpha PO lines and 0 alpha inspections; bravo's insert into alpha is rejected; bravo can't download, sign, list, upload into or publicly fetch an alpha photo even with its exact path; control: alpha can download its own photo.

## 8. Important engineering decisions

| Decision | Why | Cost |
|---|---|---|
| Model is blind to the PO | F1: shown the PO, the model echoed it | Identity relies on word matching, and synonyms are missed |
| Code decides, model describes | Verdicts are explainable and testable without a model | The matcher is simple on purpose; its misses are measured |
| Operator counts beat photo counts | F2: llava-phi3 invented a carton | Operators still type counts for high confidence |
| One contact sheet per unit | Rule 2; small models handle one image better | Lower resolution per photo |
| Fail open to `pending` | Rule 3: the dock never waits | Pending records need a retry |
| Poor photo: PASS → UNCERTAIN, FAIL kept | Don't vouch for what you couldn't see; don't hide a visible problem | More REVIEWs |
| No PASS for an unseen carton/unit | F3: "no damage" on a carton that isn't there | More UNCERTAINs on unit-only photos |
| Confidence as a rule | Small models give no calibrated probabilities | Coarse, 3 levels; checked in the eval |
| Records append-only, overrides as rows | Honesty rule: overrides are data | Views have to apply overrides |
| One default model (Gemini), Ollama as opt-in fallback | Eval, demo and deployment must be the same system; CPU LLaVA is too slow for a live dock but useful offline | Depends on Google's free-tier quota and network; the fallback path is kept tested |

## 9. Tests

`npm test` runs 87 tests in about 3 s, with no model and no database:

- every portal test scenario, plus the portal's worked example (22 of 24, blue, damaged carton → EXCEPTION)
- the uncertainty rules, and regressions for F1 and F3
- an exhaustive check that the overall result never masks a component check
- one model call per unit
- fail-open on timeouts, errors, zero photos, and every Gemini failure mode (mocked `fetch`)
- the Gemini key is never in the URL, and no PO data is in the request
- the content hash detects edits
- eval scoring (TP/FP/FN/TN, abstentions, masked failures, labeller agreement)
