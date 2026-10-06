# Quarterly Capital Posture Memo (Example)

> **This is a worked example, not a live reading.** The figures below are from an
> illustrative quarter and were never a published call. For the current posture,
> confidence and reversal conditions, see https://whether.work — and for the
> blank version of this document, /downloads/capital-posture-template.md.

**Quarter:** Q3 (Jul–Sep) · **Prepared for:** Board meeting, 8 Oct
**Posture at quarter end:** Defensive · **Confidence:** MED
**Source reading:** funding pressure 62/100 (line: 52) · risk appetite 41/100 (line: 50)

## Executive summary

- **Posture this quarter:** Defensive, and it held all thirteen weeks. We entered
  the quarter one week after the call moved off Expansion and we have not been
  back.
- **Why now:** Funding pressure sat 10 points above the line that changes the
  call for the whole quarter, driven by the front end rather than by spreads.
  Risk appetite stayed below its line on a flat-to-inverted curve. Neither axis
  came close to reversing, so nothing in the plan below was re-opened mid-quarter.
- **Key risks:** Two of our three largest commitments are annual and renew in
  Q4, so the cost of being wrong about the posture rises in November, not now.

## SAFE / RISKY / DANGEROUS decisions

| Decision | Class | Owner | Reversal path | Status at quarter end |
| --- | --- | --- | --- | --- |
| Backfill two departures in Support | SAFE | VP Ops | Hiring freeze, 30-day notice | Done, both filled |
| Renew the data vendor at current seats | SAFE | CFO | Month-to-month at +12% | Done |
| Open the Series B process | RISKY | CEO | Withdraw before term sheet | **Deferred to Q4** |
| Hire 4 engineers against the FY plan | RISKY | CTO | Offers rescinded pre-start | Cut to 2, both senior |
| Two-year compute reservation | DANGEROUS | CTO | None — prepaid, non-refundable | **Not taken** |

The classification is the decision's reversibility, not its size. The compute
reservation was the cheapest line on this list per unit and the only one with no
way back, so it is the one we did not do.

## Reversal trigger logic

Each trigger is a number, a duration, an owner, and what happens on breach. A
trigger without all four is a note, not a trigger.

1. **Re-open the Series B process** — funding pressure closes below 52 for two
   consecutive weekly reads. Owner: CEO. On breach: re-open the process at the
   next Monday call, no board vote required.
2. **Release the two held engineering reqs** — risk appetite closes above 50 for
   two consecutive weekly reads *and* the posture is not Scarcity. Owner: CTO.
   On breach: reqs go live within five working days.
3. **Pause all discretionary spend above $25k** — funding pressure closes above
   75, or the posture prints Scarcity in any single week. Owner: CFO. On breach:
   spend authority drops to the CFO for the rest of the quarter, and this memo
   is re-issued inside a week.

Triggers 1 and 2 did not fire this quarter. Trigger 3 did not come within 13
points of firing.

## Board asks

- **Approvals requested:** Carry the two unfilled engineering reqs into Q4 at the
  same level rather than re-scoping them. Authorise the Series B process to open
  on trigger 1 without a further board vote.
- **Guardrails requested:** Keep the $25k discretionary ceiling in trigger 3 for
  Q4 even if the posture improves, because the annual renewals land inside it.
- **Next review:** Weekly against the triggers above; full re-issue of this memo
  at quarter end, or within a week of trigger 3 firing.
