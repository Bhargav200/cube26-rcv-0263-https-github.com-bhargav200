# One-pager: Receiving Manager

**Problem.** Supplier shortages, wrong variants and damage are discovered weeks after receipt, when the supplier claim can no longer be proven. Receiving is the only point in the five-step chain where that claim is still winnable, and today it is a spot check that leaves no record.

**Customer.** A receiving lead at a seller or 3PL. The records are consumed by Prep (step 2) and Recovery (step 5), joined on `unit_id`.

**Solution.** Photos plus the PO line go in, and nine PASS / FAIL / UNCERTAIN checks with reasons come out, plus an evidence record. The model describes the photos without seeing the PO, and code decides. It fails open: the dock never waits.

**Why now.** Vision models can describe product photos well enough to try this cheaply, without training on each SKU. Whether that holds is exactly what the eval tests.

## Metrics

| Metric | Why it matters | Target to keep going | Measured |
|---|---|---|---|
| Masked failures (ACCEPT while a label says FAIL) | The one error that loses a claim silently | **0** | **0 of 16** ([eval-report.md](eval-report.md) §3) |
| Identity false negatives (wrong SKU passed) | Wrong goods booked as right | ≤ 1 in 10 wrong-SKU cases | 0 of 1 (too few to be a rate) |
| Damage recall (carton + unit) | Damage is the most common claim | ≥ 70% of labelled damage caught or sent to review | carton 9 of 9; unit 1 of 3 (punctures missed, F8) |
| False alarms per check (FP) | Too many and operators stop reading | ≤ 1 in 5 committed FAILs | 0 FP on clear-cut labels; but 6 identity FAILs on cases labelled UNCERTAIN (F7) |
| Coverage (committed verdicts on clear-cut cases) | Everything UNCERTAIN is useless | ≥ 50% | 80–100% per check |
| Fail-open rate | Model down must never block the dock | 100% of failures saved as `pending` | 100% in tests (timeout, error, bad JSON, missing key, HTTP 429, cut-off) |
| Calls per unit | Engineering rule 2, the margin | 1 | 1 (tested) |
| Tenancy isolation | Rule 1 | 0 cross-org rows or photos | 12 / 12 checks passed on the live project |

## Kill condition

**If the held-out eval shows any masked failure, or wrong SKUs passed in more than 1 case in 10, stop the vision-first approach and ship the fallback:** operator counts, guided photo capture and the evidence record, with no automated visual verdict.

## Biggest risks

1. Vision identity on look-alike or long-tail SKUs. Word matching is simple, and synonyms fail.
2. Counting from photos. That's why operator counts come first.
3. No customer validation yet.
