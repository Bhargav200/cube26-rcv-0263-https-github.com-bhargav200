# Development runs (not the eval)

The six real evidence records behind the failure modes in [../../build-log.md](../../build-log.md) and [../../eval-report.md](../../eval-report.md) §4. They are kept as produced, unedited. Each one still verifies against its own `content_hash`.

- They were produced on 2026-09-28 by the code at that time, so the records are contract **v0.1**, without `confidence` or `issues`.
- Every run used the same photo: one blue 750 ml bottle, checked against PO line `UNIT-0001` (Cotton Bath Towel, blue, "bath", 1 carton × 24).
- The records name that photo `runs/smoke/unit.jpg`, its path at the time. It is now [`agent/fixtures/dev-bottle-unit.jpg`](../../agent/fixtures/dev-bottle-unit.jpg), with the same sha256 (`photos[].sha256` in each record matches it).

| Record | Model · prompt | Result | What it shows |
|---|---|---|---|
| [prompt-0.1/RCV-2599A083](prompt-0.1/RCV-2599A083.json) | llava · 0.1 | `pending` after 120 s | **Fail open (F6):** the model timed out, and the record was still written with every check UNCERTAIN. |
| [prompt-0.1/RCV-F36667F3](prompt-0.1/RCV-F36667F3.json) | llava · 0.1 | `pending` after 307 s | **F6:** Node's fetch dropped the connection at about 300 s ("fetch failed"). Still a record, still UNCERTAIN. |
| [prompt-0.1/RCV-C145E479](prompt-0.1/RCV-C145E479.json) | llava · 0.1 | complete, 421 s | **F1, PO anchoring:** shown the PO, the model answered `product_matches_po: yes`, 1 carton and 24 units for a photo of one bottle. Identity, counts and quantity all came out PASS. Also **F4:** `components_missing: ["none"]` was read as a missing part (components FAIL). |
| [prompt-0.2-blind/RCV-4CD56071-llava-phi3](prompt-0.2-blind/RCV-4CD56071-llava-phi3.json) | llava-phi3 · 0.2-blind | complete, 331 s | Blind prompt: `water bottle`, blue, `750ml`, so identity is correctly FAIL. **F2:** it reported 1 carton visible when there is no carton in the photo. |
| [prompt-0.2-blind/RCV-A64AA151](prompt-0.2-blind/RCV-A64AA151.json) | llava · 0.2-blind | `pending` after 306 s | **F6** again, before the timeout fix. |
| [prompt-0.2-blind/RCV-7054AF73](prompt-0.2-blind/RCV-7054AF73.json) | llava · 0.2-blind | complete, 140 s | After the timeout fix: identity correctly FAIL, counts honestly `null`. **In hindsight also F3:** carton damage PASS with no carton in the photo. That was only noticed on 2026-09-30 and fixed then. |

To re-check one: `sha256` the fixture and compare it with `photos[0].sha256`. To check a record's hash, load it and call `verifyRecord()` from `agent/lib/evidence.ts`.
