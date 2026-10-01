# Eval report: Receiving Manager

> **Status: held-out run done on 16 of 20 cases (2026-10-01), plus a second run after fixing the worst failure mode.** Held-out results in §3, before/after in §3b, named failure modes in §4. The results section below is filled from `eval/results/<run>/results.md`, which the harness generates. Nothing in this report is typed in by hand from memory.

## 1. What is being measured

Whether the agent's **per-check verdicts on photos it has never seen** match what a careful human would conclude from the same photos and the same PO line. "Works well" isn't a result, so every number below is per check, with false positives, false negatives and UNCERTAIN reported separately.

## 2. Method

**Eval set.** 16 cases built from 13 real photos the agent has never seen. The agent, prompt and matching rules were frozen before any eval photo was run (prompt `rcv-prompt/0.2-blind`, contract `receiving-evidence/0.2`, model `gemini-3.5-flash-lite`). None of these photos was used while building or tuning.

- **Real delivery photos contributed by neighbours**, published here with their permission. They were taken by different people, with different phones, light and backgrounds, which is closer to a real dock than one person's staged set. One submitted photo was a duplicate (the same picture re-saved), found by image fingerprint and removed. A few copies carry a small website watermark ("şikayetvar") from where they had been posted; the images are otherwise unedited, only converted to JPEG. These photos come with **no real purchase order**, so each case's PO line in `eval/cases.csv` was written to fit the scenario, e.g. a "Phone Charger 20W" line expecting 9 per carton for the box marked QTY 9.
- **Not covered:** the owner's own extra shots (a clean correct shipment end to end, a missing part, a blurred photo) were dropped to meet the deadline. **Missing components** and **bad photo** are therefore tested only by the unit tests, not by this eval. Details: [eval/SHOT-LIST.md](eval/SHOT-LIST.md).

| Scenario (portal list) | Cases |
|---|---|
| Correct product and size | EV02 |
| Wrong SKU | EV03 |
| Wrong variant (size) | EV04 |
| Correct count / short shipment (photo count) | EV07 / EV08 |
| Crushed carton | EV06, EV09, EV16 |
| Water-damaged carton | EV10, EV14 |
| Torn packaging (carton / unit) | EV05, EV12, EV15 / EV01 |
| Missing components | **not covered** (unit tests only) |
| Ambiguous (unclear stain, hidden units) | EV11, EV13 |

EV03, EV04 and EV08 reuse another case's photo against a different PO line. That is how those errors happen at a real dock: the right-looking goods are booked against the wrong line. It does mean those cases aren't independent photos, and the counts below should be read with that in mind. The set is **damage-heavy**: most contributed photos show a damaged carton with the product inside not visible, so `identity`, `components` and the counts are often labelled UNCERTAIN. Those cases test whether the agent declines to judge what it can't see.

**Labels.** Each case is labelled per check as PASS, FAIL or UNCERTAIN, **judged from the photos and the PO line only**, before seeing the agent's output (rules in [eval/README.md](eval/README.md)). How labeller A's labels were made is stated plainly: the AI coding assistant drafted a first pass from the photos, and the owner then checked and corrected every label before any eval run. Drafts are marked `DRAFT` in `labels_a.csv` until confirmed. Labeller B, if available, labels independently from a blank sheet without seeing labeller A's labels or the draft. With two labellers, only labels both agree on are ground truth. Disagreements are dropped from scoring and listed, and agreement is reported as Cohen's κ. With one labeller, that is stated and no agreement figure is claimed.

**Scoring** (`agent/lib/eval.ts`, unit-tested). Positive = FAIL (a problem is present):

| | Label FAIL | Label PASS | Label UNCERTAIN |
|---|---|---|---|
| Agent FAIL | TP | **FP** (false alarm) | forced |
| Agent PASS | **FN** (missed problem) | TN | forced |
| Agent UNCERTAIN | abstained | abstained | correct abstain |

UNCERTAIN is never counted as right or wrong. It is reported as **coverage**: the share of clear-cut cases where the agent committed to a verdict. At the overall level, the number that must be zero is **masked failures**: ACCEPT on a case where any label is FAIL.

**Reproduce:**

```sh
cd agent
npm run eval:shrink
npm run eval -- --run gemini-final                        # the default model: Gemini 3.5 Flash-Lite
npm run eval -- --provider ollama --run llava-final     # optional comparison: offline LLaVA, slow on CPU, resumable
```

Every evidence record the run produced is saved under `eval/results/<run>/records/`, so any number can be traced back to the record and photos behind it.

## 3. Results (run `gemini-3.5-flash-lite-1`, 2026-10-01)

Source: [eval/results/gemini-3.5-flash-lite-1/results.md](eval/results/gemini-3.5-flash-lite-1/results.md), generated by the harness. Every number below traces to an evidence record in `records/`.

| | |
|---|---|
| Model | `gemini-3.5-flash-lite`, prompt `rcv-prompt/0.2-blind`, contract `receiving-evidence/0.2` |
| Cases | 16 of 16 run and scored |
| Labellers | 1 (owner, from an AI-drafted first pass, see §2). No agreement figure is claimed. |
| Model failures | 0 pending; 0 retries needed |
| Latency per unit | median 4.3 s, p90 5.2 s, max 7.7 s |

**Per check.** Positive = FAIL (a problem is present). "Forced" = the label says UNCERTAIN but the agent committed to PASS or FAIL.

| Check | n | TP | FN | FP | TN | Abstained | Label UNCERTAIN: agreed / forced | Accuracy when decided | Coverage |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| identity | 16 | 1 | 0 | 0 | 3 | 0 | 6 / **6** | 100% (4/4) | 100% |
| variant_colour | 16 | 2 | 0 | 0 | 2 | 0 | 12 / 0 | 100% (4/4) | 100% |
| carton_count | 16 | 0 | 0 | 0 | 4 | 1 | 9 / 2 | 100% (4/4) | 80% |
| units_per_carton | 16 | 1 | 0 | 0 | 1 | 0 | 12 / 2 | 100% (2/2) | 100% |
| quantity | 16 | 0 | 0 | 0 | 0 | 0 | 14 / 2 | – | – |
| carton_damage | 16 | **9** | **0** | **0** | 3 | 0 | 3 / 1 | 100% (12/12) | 100% |
| unit_damage | 16 | 1 | **2** | 0 | 4 | 0 | 9 / 0 | 71% (5/7) | 100% |
| components | 16 | 0 | 0 | 0 | 0 | 0 | 16 / 0 | – | – |
| defects | 16 | 1 | 0 | 0 | 3 | 0 | 9 / 3 | 100% (4/4) | 100% |

**Overall verdict:** exact match on 15 of 16. **Masked failures (ACCEPT while a label says FAIL): 0.** The one mismatch is EV13: labelled REVIEW, but the agent said EXCEPTION because of F7 and a miscount (below).

**Accuracy by confidence:** `medium` 29 of 31 committed verdicts correct (94%), `low` 6 of 6 (100%), `high` none (no case had operator counts). With this little data, the confidence rule is **not validated**: `low` did not do worse than `medium`.

**What these numbers do and don't say.**
- Carton damage is the strongest result: all 9 damaged cartons caught, no false alarms, across photos from different people and phones.
- Identity, variant and counts are right on every clear-cut case, but there are only 2–4 such cases per check, far too few for a rate.
- The forced verdicts matter more than the accuracy column: 16 of them across checks, mostly from F7 below.

### 3b. Second run after the F7 fix (not held-out)

Run `gemini-3.5-flash-lite-2-after-f7-fix` ([results](eval/results/gemini-3.5-flash-lite-2-after-f7-fix/results.md)), code `7632029`. The fix was designed **after** seeing run 1, so these cases are no longer unseen for it. This run shows the effect of the fix and the model's run-to-run variation; it is **not** a held-out result.

| | Run 1 (held-out) | Run 2 (after fix) |
|---|--:|--:|
| identity: forced FAIL on cases labelled UNCERTAIN | 6 | **1** (EV11 "pet supplies", a product category, deliberately not special-cased) |
| Masked failures | 0 | 0 |
| carton_damage TP / FN / FP | 9 / 0 / 0 | 9 / 0 / 0 |
| unit_damage TP / FN / abstained | 1 / 2 / 0 | 0 / 2 / 1 |
| Overall exact match | 15 / 16 | 14 / 16 |
| Median latency | 4.3 s | 3.7 s |

**Why the overall match went down by one.** In run 1, EV07 (label EXCEPTION because of punctured unit boxes) got EXCEPTION only through the F7 false wrong-SKU flag: right for the wrong reason. With F7 fixed, the real miss (F8, punctures not seen) shows, and EV07 comes out REVIEW. This is still not a masked failure, because a REVIEW goes to a human.

**Run-to-run variation (F11).** The model, the photos and the temperature (0) were the same, yet two answers changed between runs:
- EV01: unit damage FAIL in run 1, UNCERTAIN in run 2.
- EV05: a colour judgement appeared in run 2 that run 1 didn't make (F10).

Single-run numbers on 16 cases therefore carry visible noise.

## 4. Failure modes found so far (during the build, before the eval)

These come from real model runs on development photos. They are **not** eval results, but each one changed the design and has a regression test. The original records are kept, unedited and hash-verified, in [eval/dev-runs/](eval/dev-runs/).

| ID | Failure | Seen | What changed |
|---|---|---|---|
| **F1** | **PO anchoring.** When shown the PO, LLaVA repeated it back: on a photo of one blue 750 ml bottle checked against "Cotton Bath Towel ×24" it reported a towel, variant "bath" and 24 units. | 2026-09-28, prompt 0.1 | The model is blind to the PO (prompt 0.2). The provider interface has no PO parameter. Test: "F1 regression". |
| **F2** | **Invented count.** llava-phi3 reported "1 carton visible" on a photo with no carton. | 2026-09-28 | Operator counts take priority; model-only counts are `low` confidence; partial counts are never used. |
| **F3** | **Vouching for the unseen.** On a unit-only photo LLaVA answered carton damage "none", which became a carton PASS. | 2026-09-30, smoke run | "No damage" needs the carton/unit to be in the photos, otherwise UNCERTAIN. Tests: "F3". |
| F4 | **Placeholder parsed as data.** `components_missing: ["none"]` read as a missing part, giving a false FAIL. | 2026-09-28 | Placeholder entries are filtered. |
| F5 | **Citing a photo that doesn't exist** (#2 with one photo). | 2026-09-28 | Out-of-range citations are dropped. |
| F6 | **CPU timeouts.** LLaVA on a CPU-only laptop took up to 420 s per unit; Node's fetch dropped the connection at 300 s. | 2026-09-28 | Streamed responses; timeouts raised to our own limit; fail-open to `pending` either way. |

| **F7** | **Packaging described as the product.** On 6 closed or unclear cartons (EV07, EV08, EV09, EV11, EV13, EV14) the model answered `product_type` with the packaging ("cardboard carton", "small boxes", "boxed items") instead of "unclear". The matcher found no shared word with the PO title and gave identity FAIL where the label is UNCERTAIN. At a real dock this would flag every closed box as the wrong SKU. | eval run 1, 2026-10-01 | **Fixed after run 1** (commit `7632029`): a packaging-only description gives identity UNCERTAIN, unless a printed label names the product. Run 2: 6 → 1 (§3b). Tests: "F7". |
| **F10** | **Carton colour read as product colour.** EV05 (run 2): `colour_seen` "brown" was the shipping carton, giving variant_colour FAIL ("spec is black") on a sealed parcel. | eval run 2, 2026-10-01 | Not fixed. Same family as F7/F9: the prompt should ask for the colour of the product only *when the product is visible*. |
| **F11** | **Run-to-run variation.** Same photos, same model, temperature 0: EV01 and EV05 changed between runs. | eval runs 1 and 2 | Measured, not fixed. Report numbers from more than one run before trusting a rate. |
| **F8** | **Small punctures missed.** Several unit boxes in the QTY 9 carton have punctures; the model reported no unit damage (EV07, EV08: 2 FN, one photo). | eval run, 2026-10-01 | Not fixed. Subtle damage needs a closer photo per unit, not a wider one. |
| **F9** | **Product box read as the carton.** In EV01 the torn cereal box (the product's own packaging) was reported as carton damage, while the shipping carton around it is only seen from inside. | eval run, 2026-10-01 | Not fixed. The prompt doesn't distinguish the shipper from retail packaging clearly enough. |
| **F2b** | **Partial count claimed as complete.** EV13: 16 boxes counted on a top layer of about 19, with more possibly hidden, and `open_carton_fully_visible` true, giving units FAIL "short by 4". | eval run, 2026-10-01 | Same root cause as F2. Mitigated only by operator counts, which this set doesn't have. |

Smoke check on 2026-09-30 (the dev bottle photo, 2 cases, local `llava`, **not** part of the eval): identity was PASS against the matching "Steel Water Bottle" line and FAIL against "Cotton Bath Towel". Latency was 178 s and 76 s. This run is what surfaced F3. After the F3 fix, the same two cases were rerun (71 s each): carton damage is now UNCERTAIN on both, and nothing in the smoke labels was missed.

## 5. Known limits of this eval

- It is small (16 cases from 13 photos), and 3 cases reuse another case's photo. It can show large failure modes, but it can't give a production accuracy figure.
- The contributed photos have no real purchase order: the PO lines were written to fit each scenario. So identity results test the matcher against a plausible order, not against a real supplier's catalogue. The brief's open question, whether vision works on long-tail catalogues without per-SKU training, is only touched here, not answered.
- The contributed set is damage-heavy and mostly shows closed or damaged cartons, so identity, components and counts are often labelled UNCERTAIN. Those cases measure whether the agent declines to judge, more than whether it identifies products.
- The labellers didn't stage the contributed damage, so borderline cases (EV11's stain, EV13's hidden units) are labelled from the photo alone, like an operator would see them. Labeller A's labels started from an AI-drafted first pass, disclosed in §2.

## 6. Kill condition and next step

**Kill condition** (from [03-one-pager.md](03-one-pager.md)): stop the vision-first approach if any delivery labelled FAIL gets ACCEPT, or wrong SKUs pass in more than 1 case in 10.
- Masked failures: **0 of 16**.
- Wrong SKU passed: **0 of 1** wrong-SKU case. One case can't establish a rate.
- **Not triggered on this run**, but the sample is far too small to call the approach proven.

**The fix this eval pointed to was F7.** It was **not** made before the scored run, so §3 is a true held-out result for the frozen agent. It was then made (commit `7632029`) and measured in a separate run (§3b), reported as not held-out because the fix was designed after seeing these cases. The next fixes in line are F10 and F9 (telling the shipping carton apart from the product's own packaging) and F8 (asking for a close-up per unit for small damage). None of them is attempted here.

