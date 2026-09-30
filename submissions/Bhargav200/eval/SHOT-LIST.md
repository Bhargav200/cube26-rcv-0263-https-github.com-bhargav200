# Shot list: what to photograph

About **16 photo sessions → 22 eval cases**. Roughly 60–90 minutes with a phone.

## What you need
- 4–6 everyday products **you have several of** or that come in a box: water bottles, pens, soap bars, cables, cups, candles, snack packs, towels. Pick items with **readable text on the label** (a size like "500 ml", "1 kg", "10 pcs") for the variant cases.
- 3–4 plain cardboard boxes (delivery boxes are fine). You'll dent one, wet one and tear one.
- A table near a window (daylight) and a plain background.

## Rules for every photo
- **Phone camera set to JPEG** (iPhone: Settings → Camera → Formats → *Most Compatible*). HEIC doesn't work.
- Landscape, the whole object in frame, no fingers over it, in focus. (EV20 and EV21 break these rules on purpose.)
- 2–3 photos per case, named exactly as below (`EV01_carton.jpg`, `EV01_unit.jpg`, …), saved into `eval/photos/`.
  - **carton**: the closed or opened box from outside, showing all 4 sides you can.
  - **open**: looking into the opened box so every unit inside can be counted.
  - **unit**: one unit taken **out** of its packaging, with its parts (lid, cap, scoop, cable…) next to it.
  - **label**: a close-up of the label text (size / variant).
- Write down what's really in each box as you go (how many units, what's missing). That goes into `cases.csv`.

## The cases

| Case | Scenario (portal test) | What to set up | Photos |
|---|---|---|---|
| EV01 | Correct shipment | 1 box, product A, e.g. 6 units, undamaged, everything present | carton, open, unit, label |
| EV02 | Correct shipment | same as EV01 with product B | carton, open, unit |
| EV03 | Correct shipment | same with product C | carton, open, unit |
| EV04 | Wrong SKU | **Reuse EV01's photos.** In `cases.csv` the PO names a *different* product (e.g. photos show pens, PO says "Steel Water Bottle") | (reuse EV01) |
| EV05 | Wrong SKU | **Reuse EV02's photos**, PO names a different product | (reuse EV02) |
| EV06 | Wrong colour | **Reuse EV03's photos.** PO asks for a different colour than the one in the photo | (reuse EV03) |
| EV07 | Wrong variant | Product D whose label shows a size (e.g. "500 ml"). PO asks for a different size ("750ml") | carton, unit, label |
| EV08 | Right variant (control) | **Reuse EV07's photos**, PO asks for the size that *is* on the label | (reuse EV07) |
| EV09 | Crushed carton | Press in a corner / dent the top of a box, product inside | carton, open |
| EV10 | Crushed carton | A different box, dent the side | carton, open |
| EV11 | Water-damaged carton | Wet one side of a box with water; photograph while it's darkened | carton, open |
| EV12 | Water-damaged carton | Lighter water stain on another box (a harder case) | carton |
| EV13 | Torn carton | Rip a flap or the side of a box | carton, open |
| EV14 | Torn unit packaging | Tear the product's own wrapper/pack (not the carton) | unit, carton |
| EV15 | Missing component | Product that normally has a part (bottle + lid, pen + cap), shown **without** it. PO lists the part | unit, open |
| EV16 | Missing component | Another product missing a part (charger without cable, box set missing a piece) | unit, open |
| EV17 | Short shipment (photo count) | Open box with **one fewer** unit than the PO says per carton (e.g. 5 when PO says 6) | carton, open |
| EV18 | Extra units (photo count) | Open box with **one more** unit than the PO says | carton, open |
| EV19 | Short shipment (operator count) | Any box. In `cases.csv` fill `operator_upc` with the real count, which is lower than the PO | carton, open |
| EV20 | Ambiguous: bad photo | Same kind of box, photo **blurred and dark** on purpose | carton, open |
| EV21 | Ambiguous: product cut off | Product only half in frame, label not readable | unit |
| EV22 | Obvious defect | A visibly broken/cracked/stained unit (a cracked cup, a snapped pen, a stained cloth) | unit, carton |

Reused photos are fine: in real receiving the same goods get checked against whatever PO line they're booked to. `eval-report.md` says so.

## After shooting
1. Copy all photos into `submissions/Bhargav200/eval/photos/`.
2. Fill in the product columns of `cases.csv` (or just message me what's in each case and I'll fill it).
3. Label each case in `labels_a.csv` (see `README.md`: label from the **photos**, not from memory).
4. If a friend or family member can spare 15 minutes: they fill `labels_b.csv` **on their own, without seeing yours**. That gives the two-labeller agreement the brief asks for.
