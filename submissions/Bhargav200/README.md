# Bhargav200 · Receiving Manager

**Cube Buildathon Round 2 · Track 01 · Receiving Manager (RCV) · Seat 34 · Ticket CUBE-2026-0263**

A receiving-inspection agent for supplier deliveries. At the dock an operator photographs the delivery. The agent checks the photos against the purchase-order line and gives **PASS, FAIL or UNCERTAIN on each of nine checks**. It then saves an **evidence record** that the next stages (Prep, Recovery) can read by `unit_id`.

| | |
|---|---|
| Deployment | _add URL after deploying (see [Deploy](#deploy))_ |
| Demo video | _add link_ |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Eval | [eval-report.md](eval-report.md) · harness and photo set in [eval/](eval/) |
| Evidence contract | [contract/receiving-evidence.schema.json](contract/receiving-evidence.schema.json) (v0.2) · [example record](contract/example-pending-record.json) |
| Findings (contradictions in the brief) | [FINDINGS.md](FINDINGS.md) |
| Working-backwards docs | [customer letter](01-customer-letter.md) · [PR/FAQ](02-prfaq.md) · [one-pager](03-one-pager.md) · [build brief](build-brief.md) |
| Rules this code keeps | [CLAUDE.md](CLAUDE.md) · [build log](build-log.md) |

## 1. Problem understanding

A pallet arrives from a supplier. Someone has to decide, quickly, whether it is what was ordered: the right product, the right count, undamaged, and to the agreed spec. Usually that's a spot check, and nothing gets written down. Weeks later a shortage or defect shows up in prep or as a customer return. By then nobody can prove the goods arrived that way, so the claim against the supplier is lost.

Receiving is **step 1 of 5** in the chain (Receiving → Prep → Pack → Returns → Recovery). It is the **only point where a supplier claim is still winnable**, and only if the condition on arrival was recorded. So the product is not only the verdict. It is the **record**: what was expected, what was seen, which photo shows it, what the agent decided, and why. Recovery (step 5) can take that record straight into a claim.

What the portal asks the agent to identify, and where each one lives:

| Portal requirement | Check(s) in this agent |
|---|---|
| Product/SKU identity against the PO | `identity` |
| Expected vs observed quantity | `quantity` (cartons × units per carton, with the shortfall or excess) |
| Carton count and units per carton | `carton_count`, `units_per_carton` |
| Crushing, water damage, tears | `carton_damage`, `unit_damage` (the damage type is named) |
| Wrong colour or variant | `variant_colour` (colour family + size/variant read from the label) |
| Missing components | `components` |
| Other obvious quality issues | `defects` |
| Structured decision backed by evidence | overall `ACCEPT` / `REVIEW` / `EXCEPTION`, plus the evidence record |
| Confidence where applicable | `confidence` on each check (a fixed rule; see below) |
| Detected issues | `issues[]` on the record, and the "Detected issues" panel on the record page |
| UNCERTAIN is a valid outcome | a first-class verdict: never folded into PASS, and it blocks ACCEPT |

## 2. Solution overview

```
photos + PO line (+ optional operator counts)
   │
   ├─► contact sheet: every photo labelled "#1 carton", "#2 unit", … in ONE image
   │
   ├─► vision model, ONE call per unit, BLIND to the PO (it only describes what it sees)
   │        Gemini 3.5 Flash-Lite (one default everywhere) · Ollama/LLaVA optional offline · any failure → `pending`
   │
   ├─► deterministic code compares the description with the PO → 9 checks, each with
   │        verdict · expected · observed · source · photo refs · reason · confidence
   │
   └─► evidence record (JSON, sha256 content hash) → Supabase (row-level security per org)
            → record page: expected vs observed, photos, issues, append-only overrides
```

Design choices that matter:

1. **The model observes, the code decides.** On the first real run LLaVA was shown the PO line (a bath towel ×24) and a photo of a single blue bottle. It "saw" a towel and 24 units. So the model is now never shown the PO; the interface doesn't even accept one. It describes the photo, and `lib/match.ts` + `lib/decide.ts` compare. Every verdict can be explained in one sentence and reproduced by hand.
2. **UNCERTAIN is a real answer.** Unusable photos, "unclear" answers, contradictory output, counts that disagree, and components that can't be seen all give UNCERTAIN. Poor photos downgrade a model PASS to UNCERTAIN. The overall result is `ACCEPT` only when all nine checks PASS. Any FAIL gives `EXCEPTION`, and otherwise any UNCERTAIN gives `REVIEW`.
3. **Operator counts come first, photos corroborate.** Vision models miscount: llava-phi3 reported a carton that wasn't in the image. If the operator types counts, those decide. A photo count that disagrees makes the check UNCERTAIN.
4. **Fail open.** A model timeout, outage or invalid JSON never blocks the dock. Photos are saved, and the record is written as `pending` with every visual check UNCERTAIN. It can be retried later, and the retry creates a new record linked to the old one.
5. **Confidence is a rule, not a model score.** `high` = the operator count is confirmed by the photo count. `medium` = one direct source (an operator count, or the model on a good photo). `low` = a model-only count, or a FAIL kept from a poor photo. UNCERTAIN has no confidence. The eval reports accuracy per level, to check that the rule earns its place.
6. **Overrides are data.** A supervisor can override any check with a reason. The original verdict, the new one, who changed it and when are appended. Nothing is updated or deleted.
7. **Tenancy isolation first.** Every table has row-level security, enabled and forced, scoped by `org_id`. Photos sit in a private bucket under `{org_id}/{random uuid}` and are served only through short-lived signed URLs. `npm run test:rls` proves a second org sees zero rows and can't fetch another org's photo, even with its exact path.

## 3. Setup

Requirements: Node 20+, a Supabase project (free tier works) and a **Gemini API key** (free from Google AI Studio). Optional: Ollama with `llava`, for offline runs.

```sh
cd submissions/Bhargav200/agent
npm install
cp .env.example .env.local        # then fill it in (see below)
```

`.env.local`:

| Variable | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; used by the seed and RLS-test scripts |
| `VISION_PROVIDER` | `gemini` (default) or `ollama` (offline fallback) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Free key from Google AI Studio; model `gemini-3.5-flash-lite` (default) or `gemini-3.8-flash` |
| `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS` | Only for `ollama`: run `ollama pull llava` first |
| `DEMO_PASSWORD` | Password for the two demo operators the seed creates |

Database: in the Supabase SQL editor run [`agent/supabase/migrations/0001_schema.sql`](agent/supabase/migrations/0001_schema.sql). Then:

```sh
npm run seed        # 2 orgs, 100 PO lines from data/receiving_sample.csv, 2 demo operators
npm run test:rls    # tenancy isolation: must print 12/12 passed
npm test            # 87 unit tests: decision rules, fail-open, one call per unit, hashing, eval scoring
```

## 4. Usage

**Web app** (`npm run dev`, then http://localhost:3000). Sign in as `alpha.operator@demo.test` or `bravo.operator@demo.test` with `DEMO_PASSWORD`.

- **Inspect** (`/`): pick the PO line, add 1–8 photos with a role each (pallet, carton, unit, label), and optionally type the counts. Submit.
- **Record** (`/records/RCV-…`) shows:
  - the overall verdict and the detected issues
  - a table of the nine checks: verdict, confidence, expected vs observed, the source of each value, the photos cited, and the reason
  - the photos, each with its sha256 re-checked, and the content-hash check
  - an override form and the override history
  - retry for pending records, and a JSON download
- **Review queue** (`/queue`): pending, REVIEW and EXCEPTION records.

**Headless agent** (no database needed):

```sh
npm run agent -- --unit UNIT-0001 --photo carton=path/carton.jpg --photo unit=path/unit.jpg --cartons 1 --upc 24
```

It prints the evidence record as JSON, then one line per check.

### Test inputs

Everything needed to try the agent without the eval photos is in the repo:

| Input | Where | Use |
|---|---|---|
| PO lines and spec (100 units, 2 orgs) | `data/receiving_sample.csv` (organisers' dummy data) | The "expected" side. `npm run seed` loads it into Supabase; the CLI reads it directly. Its verdict columns are ignored (they are dummy values). |
| A real photo | [`agent/fixtures/dev-bottle-unit.jpg`](agent/fixtures/dev-bottle-unit.jpg): one blue 750 ml bottle | Development fixture. It is also the photo behind every record in [`eval/dev-runs/`](eval/dev-runs/). |
| Operator counts | CLI flags `--cartons`, `--upc` or the web form | Optional; they decide the counts when present. |
| Held-out eval set | [`eval/`](eval/): cases, labels, photos | Scored by `npm run eval`. |

Try these three cases on the fixture (from `agent/`):

```sh
# Wrong SKU: a bottle against a towel PO line → identity FAIL → EXCEPTION
npm run agent -- --unit UNIT-0001 --photo unit=fixtures/dev-bottle-unit.jpg
# Right product, wrong colour: PO line asks for a black bottle → variant_colour FAIL
npm run agent -- --unit UNIT-0008 --photo unit=fixtures/dev-bottle-unit.jpg --cartons 2 --upc 12
# Model unavailable (e.g. before GEMINI_API_KEY is set): record still written, status pending, visual checks UNCERTAIN
npm run agent -- --unit UNIT-0008 --photo unit=fixtures/dev-bottle-unit.jpg
```

In each case, carton damage comes back UNCERTAIN, not PASS: there is no carton in that photo (failure mode F3).

**Eval** (see [eval/README.md](eval/README.md)):

```sh
npm run eval
```

## 5. Assumptions

- The PO line (product title, SKU, colour, variant, components, ordered counts) is the "expected" side. It is loaded from the organisers' sample CSV. **The CSV's verdict columns (`identity_match`, `carton_damage`, `quality_flags`…) are dummy values and are never used as rules or ground truth** (engineering rule 5).
- The variant can only be confirmed from printed text (e.g. "750 ml"). Variants like "bath" or "standard", which are rarely printed, come out UNCERTAIN, not PASS.
- Every carton holds the same count as the one that was opened. The `quantity` reason says so every time.
- One record = one PO line = one `unit_id`, matching the sample data and the other four tracks' join key.

## 6. Limitations (honest list)

- **Accuracy is measured on a small, self-captured set.** See [eval-report.md](eval-report.md) for the numbers, the method, and whether there were one or two labellers. Don't read it as a production accuracy figure.
- **Identity matching is word overlap.** A synonym the matcher doesn't know ("tumbler" for "bottle") becomes a FAIL. The eval counts these.
- **Vision counting is weak.** Counts from photos alone are marked `low` confidence. For real use, operator counts should be typed.
- **One model, hosted.** Everything (local runs, eval, deployment, demo) uses Gemini 3.5 Flash-Lite, so the eval numbers describe the deployed system. Brief overloads (HTTP 429/503) are retried twice, then the record goes to `pending`. It needs internet. On Google's free tier, Google may use submitted content to improve its products (per their pricing page), so don't send confidential goods through a free key.
- **The offline fallback is slow.** Ollama/LLaVA (`VISION_PROVIDER=ollama`) runs locally and privately but took 70–420 s per unit on the development laptop's CPU. It is kept for offline use and is where failure modes F1–F3 were found; it is not what the eval measures.
- **The content hash is a content hash.** It detects an edited record when re-checked. It is not tamper-proof, not anchored, and not a signature.
- **The contract (v0.2) hasn't been agreed with other pods.** Round 2 is individual. It mirrors the organisers' CSV vocabulary so it is easy to adopt.
- **No customer has been interviewed.** The customer letter and PR/FAQ are working-backwards documents, labelled as such.

## Deploy

The web app is a standard Next.js 16 app. On Vercel:

1. Import the GitHub repo and set **Root Directory** to `submissions/Bhargav200/agent`.
2. Add the environment variables from `.env.local`, with `VISION_PROVIDER=gemini` and your `GEMINI_API_KEY`. **Leave out `SUPABASE_SERVICE_ROLE_KEY`**: the web app never uses it (only the seed and RLS-test scripts do), so it shouldn't sit on a public server.
3. Deploy, then add the URL at the top of this README.

## Layout

```
submissions/Bhargav200/
├── README.md               ← this file
├── ARCHITECTURE.md         ← components, data flow, model usage, decision logic, evidence trace
├── eval-report.md          ← method, per-check FP / FN / UNCERTAIN, failure modes
├── FINDINGS.md             ← contradictions found in the brief, portal and repo
├── 01-customer-letter.md · 02-prfaq.md · 03-one-pager.md · build-brief.md
├── CLAUDE.md               ← hard rules and forbidden language
├── build-log.md            ← what happened, day by day
├── contract/               ← evidence-record JSON Schema v0.2 + a real example record
├── eval/                   ← shot list, cases, labels, photos, results
│   └── dev-runs/           ← 6 real development records behind failure modes F1–F6
└── agent/                  ← Next.js app, headless agent, eval runner, Supabase schema, tests
    └── fixtures/           ← test photo for the CLI
```

## Status

| Face | Deliverable | Status |
|---|---|---|
| 1 | Customer letter, PR/FAQ, one-pager | ☑ written (working-backwards; no customer interviewed) |
| 2 | [CLAUDE.md](CLAUDE.md) | ☑ |
| 3 | Headless agent on fixtures ([agent/](agent/), [fixtures](agent/fixtures/)) | ☑ runs headless on the fixture, fails open; Gemini by default, Ollama offline |
| 4 | [Eval report](eval-report.md) | ☑ held-out run on 16 real photos (per-check FP/FN/UNCERTAIN) + before/after run for the F7 fix; failure modes F1–F11 |
| 5 | Evidence record page | ☑ |
| 6 | Cross-pod contract ([contract/](contract/)) | ◐ v0.2 published; not yet agreed with other pods |

## Progress (1 Oct 2026)

| Done | Pending |
|---|---|
| Agent: 9 checks, blind model, code decides, fail-open, one call per unit; Gemini 3.5 Flash-Lite as the one default | EV17–EV20 (owner's own photos) to add to the eval |
| Web app: inspect, record page (issues, confidence, hashes), review queue, overrides | Fixes for F8–F10 (small damage, carton vs product packaging, carton colour) |
| Supabase with forced RLS; isolation test 12 / 12 on the live project | Deployment (Vercel + Gemini) and its URL above |
| 87 unit tests; production build passes | Demo video; LinkedIn post (tag CodeQuesters and Sydon.AI) |
| **Held-out eval, 16 real photos: 0 masked failures, carton damage 9/9 with 0 false alarms, overall 15/16. Worst failure mode (F7) fixed and re-measured: false wrong-SKU flags 6 → 1** | Contract v0.2 agreed with other pods (Round 3) |
| All docs: README, ARCHITECTURE, eval report, findings, face-1 docs, build log | |

## Kill condition

**Stop the vision-first approach if, on the held-out set, the agent passes a wrong SKU (identity FN) in more than 1 case in 10, or ever gives ACCEPT to a delivery a human labelled FAIL.** At that point, fall back to operator counts plus photo capture, with no automated visual verdict.
