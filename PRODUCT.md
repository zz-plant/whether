# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** the founder or CEO of a venture-backed company, typically one to two years of
runway, whose next raise depends on what capital costs. They read the brief on a Monday, before
the week's decisions are set, and they are the person who has to say yes or no to a hire, a
spend, or a raise.

**Secondary (confirmed, not equal):** the operator around them — a CFO checking the spend line, a
head of product pacing the roadmap — and the investor or accelerator who sends one reading to
every company they back. The portfolio path is a distribution channel and an artifact audience,
not the primary reader.

The company's stage and runway band scale the advice; the reader sets both on the site.

## Product Purpose

Whether turns public U.S. market data into weekly operating guidance for startup leaders: for
each of five areas (Hiring, Roadmap, Fundraising, Spending, New bets) it gives an action, the
pause line that holds it, and the restart line that lifts the hold.

It exists because macro conditions change slowly and startup decisions do not wait: an operator
needs a policy agreed in advance, so that changing course is a line being crossed rather than a
meeting.

**Success is weekly ritual use** — an operator opens the brief most Mondays, checks or sets their
lines, and shares the artifact. Retention on quiet weeks matters more than reach: conditions
changed seven times in 177 months, so most weeks nothing moves and the product still has to be
worth opening.

## Positioning

One public reading, honestly scored, with the lines named in advance.

A competitor could copy the layout; what it could not truthfully copy is the record: every
published brief is dated and never edited after publication, the monthly history is scored with
the same published formula, and the calibration study says plainly that the distance to a change
line is a distance and not a probability. The product also refuses to fill a gap — when no live
reading exists it says so rather than mailing a stand-in.

## Operating Context

- The weekly ritual: a Monday brief, an email the day a line is crossed, and a month-end pulse
  for board letters.
- The reader arrives with a company, a stage, a runway band, and usually a decision already in
  flight.
- The artifact leaves the product: pasted into Slack, printed for a board pack, embedded in a
  wiki, or exported as a note.
- The lines are the unit of planning: an area pauses at one score level and restarts at another,
  with a gap between them so a small move does not thrash the team.

## Capabilities and Constraints

- Guidance is derived from public U.S. rates and credit data (FRED, U.S. Treasury). The scores
  read U.S. rates only; a company raising in dollars from U.S. funds prices its round off them.
- Five decision areas, two 0–100 scores (Funding pressure, Risk appetite), four conditions
  (Sunny, Cloudy, Stormy, Freezing), one blended score (Operating latitude).
- A reader's own figures — revenue, cash — stay in their browser. The product stores a stage and
  a runway band, never a number from a company's books.
- **Solo-operated (confirmed):** one person writes, ships and supports it. No feature may require
  an ops team, a support rota, or manual moderation to keep running.
- Publication is guarded: a brief will not be mailed or frozen from a reading that is stale,
  unpublished, or a bundled fallback.
- Copy is bound by `docs/editorial-guardrails.md`: one name per thing, sentence case, no
  marketing superlatives, retired synonyms are defects.
- The site states that it collects no behavioural data; there is no tracking pixel and no
  open/click tracking in email.

## Brand Commitments

- Name: **Whether**; the artifact is the **Whether Weekly Brief** ("the brief").
- Category line: *weekly operating guidance for startup leaders* — one source, `lib/seo.ts`.
- Voice: calm, precise, non-sensational; imperative where it advises; honest about what the
  product cannot know. No fear-based copy, no deterministic forecasts, no claims that a
  framework prevents failure.
- The weather vocabulary (Sunny / Cloudy / Stormy / Freezing) is the reader-facing name for
  conditions and is glossed on first use.
- Author: Kanav Jain, named on the About page and in the publisher schema.

## Evidence on Hand

- A published archive of weekly briefs and month-end readings since January 2012, in
  `data/published_briefs.json` and the monthly regime history.
- A calibration study and a track record page (`/calibration`, `/history`) scoring past readings
  against what happened next, including where they fell short.
- A source board on `/trust` naming each input, its cadence and its last successful fetch.
- No customer testimonials, no logos, no case studies, no usage benchmarks. Future work must not
  invent them.

## Product Principles

1. **Delta first.** Lead with what changed, what it changes in decisions, and what would flip it —
   not with explanation.
2. **Bounded decisions beat generic guidance.** An action, a threshold and a reversal condition,
   over "be cautious".
3. **The artifact is the product.** If it cannot be copied, pasted, screenshotted or cited in a
   minute, it is unfinished.
4. **Trust should be compact.** Provenance, freshness and fallback live in-line or one click away,
   never as a method essay on the primary screen.
5. **Reuse before adding.** A new surface, format or vocabulary is a cost; the brief, the document
   builder and the shared labels should carry the change first.

## Accessibility & Inclusion

The app targets WCAG AA: keyboard-reachable controls, visible focus rings, one `<main>` landmark
per route, and a skip link. Charts carry text equivalents. Colour is never the only carrier of a
state — a crossed line carries a glyph and a word as well as its ink.
