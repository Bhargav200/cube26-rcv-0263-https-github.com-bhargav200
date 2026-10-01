# PR/FAQ

> Working-backwards document. The press release describes the intended product; the FAQ is honest about where it stands on 2026-09-30.

## Press release

**Receiving Manager records the condition of every supplier delivery at the dock, while a claim is still winnable**

*For sellers and 3PLs taking supplier deliveries.*

Shortages, wrong variants and damage in supplier deliveries usually surface weeks later, in prep or as customer returns. By then there's no proof of what arrived, and the claim against the supplier is lost. Receiving Manager changes the moment of receipt. The operator photographs the delivery and optionally types the carton count. In one step the agent checks the goods against the purchase-order line: right product, right colour and variant, carton count, units per carton, total quantity, carton damage, unit damage, missing parts and obvious defects.

Each check comes back PASS, FAIL or **UNCERTAIN**, with the expected value, what was seen, which photo shows it and why. When the photos aren't good enough to judge, the agent says so instead of guessing, and the delivery goes to a review queue rather than being accepted. Every inspection is saved as an evidence record that the prep and recovery teams can pull up by unit, with supervisor overrides kept alongside the original verdict.

"The dock doesn't wait for it," says the team. "If the model is slow or offline, the photos and the record are saved anyway, and the check runs later."

## FAQ

**Who is the customer?**
The receiving lead at a seller's warehouse or a 3PL. The people who read the records afterwards are Prep (step 2) and Recovery (step 5), who file the supplier claims.

**What exactly does it check?**
Nine checks: identity, variant/colour, carton count, units per carton, quantity, carton damage (crushing, water, tears), unit damage, components, and defects. The overall result is ACCEPT only when all nine PASS.

**How accurate is it?**
See [eval-report.md](eval-report.md) for per-check numbers on a held-out photo set, with false positives, false negatives and UNCERTAIN counted separately. The set is small and self-captured, so it shows the size of the failure modes, not production accuracy.

**Why does it say UNCERTAIN so often?**
Because a confident wrong answer is worse than "can't tell". An operator who sees the agent wave through a bad photo stops trusting it. UNCERTAIN routes the delivery to a human, and it never counts as a PASS.

**Why doesn't the model get to see the purchase order?**
In our first real run, a model that was shown the PO described the PO instead of the photo. It "saw" 24 bath towels in a picture of one bottle. Now the model only describes, and plain code compares. That also makes every verdict explainable in one sentence.

**Can the vision model count units?**
Not well enough to trust alone. In one run it reported a carton that wasn't there. Operator counts take priority, and photo-only counts are marked low confidence.

### Questions we'd rather not answer

**Has any customer asked for this?**
No. Nobody on this build has spoken to a receiving team yet. The customer letter is imagined. The first real step would be asking a prep centre to rank the five problems in the chain by urgency.

**Would a supplier actually accept these records as proof?**
Unknown. The record has photos, times, the operator, the model's raw output and a sha256 content hash. It is not a signed or tamper-proof document, and we don't claim it is.

**Does this work on a real long-tail catalogue?**
Not shown. The eval uses household products. Identity matching is word overlap between what the model saw and the PO title, so it will miss synonyms and struggle with look-alike SKUs.

**What does it cost per unit?**
The default model is Gemini 3.5 Flash-Lite, on Google's free tier for this build. For paid use, Google's pricing page (checked 2026-10-01) lists it per million input and output tokens, and one unit is one call: a single contact-sheet image plus a short prompt. Look the current price up there rather than trusting a number copied here. The offline fallback (Ollama/LLaVA) costs nothing per call but took 1–7 minutes per unit on a laptop CPU, which is too slow for a live dock.

**Why not just a checklist app with a camera?**
That's the honest fallback, and it's also our kill condition (see [03-one-pager.md](03-one-pager.md)). The agent earns its place only if it catches problems a rushed spot check misses without passing wrong goods.
