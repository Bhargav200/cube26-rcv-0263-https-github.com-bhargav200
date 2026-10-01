# Eval set

Held-out photos the agent has never seen, with human labels, used to measure it per check.
Shooting instructions: [SHOT-LIST.md](SHOT-LIST.md). Results write-up: [../eval-report.md](../eval-report.md).

## Files

| File | What it is |
|---|---|
| `photos/` | The photos. `nb…` files are real delivery photos contributed by neighbours (published with permission; one duplicate removed). `EV17_…` to `EV20_…` are the owner's own shots. Run `npm run eval:shrink` (in `agent/`) once after adding phone photos, before the first eval run. |
| `cases.csv` | One row per case: which photos, and the PO line it's checked against. |
| `labels_a.csv` | Labeller A's verdict for each check of each case. |
| `labels_b.csv` | Labeller B, done independently. Optional. Copy `labels_b.template.csv` to create it. |
| `results/<run>/` | Written by `npm run eval`: one evidence record per case, `metrics.json` and `results.md`. |

## cases.csv columns

| Column | Meaning |
|---|---|
| `case_id` | EV01 … EV20 |
| `scenario` | Which portal test scenario it covers |
| `photos` | `role=file;role=file`, roles: pallet, carton, unit, label, other. Files in `photos/`. |
| `product_title`, `sku` | What the PO says should arrive. `FILL` = not shot yet, and the case is skipped. |
| `spec_colour` | Expected colour, or `n/a` |
| `spec_variant` | Expected variant/size as printed on the label (e.g. `500ml`, `10 pcs`) |
| `spec_components` | Parts that should be present, `;`-separated (e.g. `bottle;lid`) |
| `cartons_ordered`, `units_per_carton_ordered` | Ordered counts |
| `operator_cartons`, `operator_upc` | What an operator counted at the dock. **Left blank** in this set, so the counts are tested from the photos. |

## How to label (labels_a.csv / labels_b.csv)

For each check write `PASS`, `FAIL` or `UNCERTAIN`, judged **from the photos in that case plus the PO line**, the way a careful receiving lead would judge them without touching the box:

- **PASS**: the photos show the condition is met.
- **FAIL**: the photos show it is not met.
- **UNCERTAIN**: the photos don't show enough to say. Example: the units inside aren't visible, so `units_per_carton` is UNCERTAIN even if you know there are 6.

| Check | PASS when the photos show… |
|---|---|
| `identity` | the product is the one the PO names |
| `variant_colour` | colour and size/variant match the PO |
| `carton_count` | the number of cartons equals `cartons_ordered` |
| `units_per_carton` | the units in the open carton equal `units_per_carton_ordered` |
| `quantity` | cartons × units = ordered total (UNCERTAIN if either count is) |
| `carton_damage` | no crushing, water or tears on the carton |
| `unit_damage` | no crushing, water or tears on the product or its own packaging |
| `components` | a unit out of its packaging with every part in `spec_components` |
| `defects` | no other obvious defect (broken, cracked, stained, misprinted) |

Label before looking at the agent's output. Don't change a label after seeing a result, unless you find a genuine labelling mistake, and then note it in `notes`.

## Running it (from `agent/`)

```sh
npm run eval:shrink                              # once, after copying photos in
npm run eval -- --run gemini-1                   # default model (Gemini 3.5 Flash-Lite), 20 cases, ~10 min on the free tier
npm run eval -- --provider ollama --run llava-1  # optional: offline LLaVA, 1–7 min per case on CPU; resumable
npm run eval -- --score-only --run gemini-1      # rescore without calling the model
```
