# Shot list

## Already covered: real delivery photos from neighbours (EV01–EV16)

13 real photos of deliveries, contributed by neighbours who agreed to their publication in this repo. They're in `photos/` as `nb01_…` to `nb14_…`, keeping their original numbers. Number 8 was a duplicate of number 6 (same picture, re-saved) and was removed. Three photos are reused against a different PO line, to test wrong SKU, wrong size and short shipment; see `cases.csv`.

| Scenario (portal list) | Cases |
|---|---|
| Correct product and size | EV02 |
| Wrong SKU | EV03 |
| Wrong variant (size) | EV04 |
| Correct count / short shipment (photo count) | EV07 / EV08 |
| Crushed carton | EV06, EV09, EV16 |
| Water-damaged carton | EV10, EV14 |
| Torn packaging (carton) | EV05, EV12, EV15 |
| Torn packaging (unit) + spilled contents | EV01 |
| Ambiguous (stain of unclear origin; count with hidden units) | EV11, EV13 |

## Still to shoot (EV17–EV20)

These scenarios aren't in the neighbours' photos. Use a phone set to JPEG (iPhone: Settings → Camera → Formats → *Most Compatible*), in daylight, with the whole object in frame. Save the files into `photos/` with exactly these names.

| Case | Scenario | What to set up | Files |
|---|---|---|---|
| EV17 | Correct shipment | A clean, undamaged box. Photo of the closed box, the open box with the product inside, and one product out of its packaging with all its parts | `EV17_carton.jpg`, `EV17_open.jpg`, `EV17_unit.jpg` |
| EV18 | Missing component | A product shown **without** one of its parts (a bottle without its lid, a pen without its cap, a charger without its cable) | `EV18_unit.jpg`, `EV18_open.jpg` |
| EV19 | Right variant | A product whose label shows a size (e.g. "500 ml", "1 kg"), plus a close-up of that label | `EV19_unit.jpg`, `EV19_label.jpg` |
| EV20 | Ambiguous: bad photo | Any box, photographed **blurred and dark** on purpose | `EV20_carton.jpg` |

Then fill in the product columns for EV17–EV20 in `cases.csv` (or tell Claude what's in each photo).
