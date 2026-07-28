---
name: whether-ui-loop
description: Whether's screenshot-driven UI iteration loop — capture with bun run ui:iterate, look at the PNGs, critique against the standards, fix, recapture. Use whenever visual work needs to actually be seen rather than reasoned about: redesigning a page or component, changing layout, spacing, density, or theme, checking how something looks on mobile vs desktop, prototyping a new UI concept, or any request to make a screen look better. Reach for this instead of editing CSS blind.
---

# Whether UI iteration loop

Static reading catches semantic and accessibility problems. It does not catch the things that actually make this dashboard feel wrong — cramped density, a broken scan order, a card that dominates the posture it's supposed to support. Those only show up in a picture. This repo has a capture harness precisely so that looking is cheap; the failure mode is editing CSS blind and declaring it fixed.

## The loop

**1. Capture.** From the repo root:

```bash
bun run ui:iterate
```

This starts a dev server if needed, captures every target, and writes a gallery to `artifacts/ui/index.html` plus a manifest at `artifacts/ui/manifest.json`. Narrow it while iterating — a full pass is slower than you want in a tight loop:

```bash
bun run ui:iterate -- --only operator-brief-mobile,operator-brief-desktop
```

`bun run ui:iterate:list` shows the available targets. If you already own a running dev server and only want raw capture, `bun run ui:shots` skips the server management.

**2. Look.** Read the captured PNGs from `artifacts/ui/` with the Read tool. This is the step that gets skipped, and skipping it defeats the whole loop — you cannot critique a layout you haven't seen. Compare mobile against desktop for the same target rather than judging either alone; most density problems in this app are mobile-only.

**3. Critique.** Judge against `whether-ui-standards` — especially section XI (report shell hierarchy) and section VIII (IA boundaries), since those govern whether a screen earns its vertical space. Useful questions: what does the eye hit first, and is that the decision? How many stacked chrome layers come before the first task block? Does anything restate posture that a card above already stated?

**4. Fix, then recapture.** Re-run the same `--only` set and compare against the previous PNGs. A change that looks right in code and wrong in the screenshot is wrong.

## Prototype in /mockups, not in production routes

`app/mockups/` is the staging area for visual experiments. Starting there keeps half-formed ideas out of the live operator flow and makes comparison cheap, because the mockup routes accept URL-driven presets:

- `?viewport=mobile|tablet|desktop|full`
- `?density=compact|comfortable`

So `/mockups/operator-brief?viewport=mobile&density=compact` is a shareable, screenshot-able state. Keep each mockup focused on one strong idea, prefer shared tokens and existing primitives, keep them noindex, and only promote a concept into `/`, `/evidence`, `/planning`, `/resolve`, or `/trust` once it's visually coherent. Mockups shouldn't accumulate into a second app.

Full details on the harness — how it detects a stale dev server, port fallback, asset-coherence probing — are in `docs/ui-iteration-workflow.md`.

## When the work is aesthetic direction rather than correction

If the task is to give a surface a distinctive point of view rather than fix defects in an existing one, load the `frontend-design` skill alongside this one. It covers palette, typographic personality, and taking a defensible aesthetic risk. Note the tension worth resolving deliberately: Whether already has a committed visual identity in `tokens.css` and `theme-variants.css`, so the goal is usually sharpening that identity, not replacing it. A redesign that abandons the semantic posture colors breaks the product's visual vocabulary, since operators read `--color-semantic-tightening-*` and `--color-semantic-easing-*` as meaning, not decoration.

## Known debt

Before proposing new UI work, check whether it's already catalogued: `docs/design-debt-prioritized.md`, `docs/design-improvements-priority.md`, and `docs/ux-consistency-audit-2026-03-24.md`. Fixing something already on those lists is worth more than finding a new thing, and closing an item means updating the doc too.
