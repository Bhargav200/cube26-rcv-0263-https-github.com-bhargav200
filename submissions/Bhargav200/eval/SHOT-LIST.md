# Eval photo set

## Real delivery photos from neighbours (EV01–EV16)

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

## Not covered by this set

The owner's own extra shots (a clean end-to-end correct shipment, a missing part, a blurred photo) were dropped to meet the deadline. The **missing components** and **bad photo** scenarios are therefore covered only by the unit tests, not by the eval; `eval-report.md` says so.
