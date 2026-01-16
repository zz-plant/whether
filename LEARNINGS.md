# Learnings & Principles

A concise reference for **Regime Station** product intent and execution standards.
Use this as the default checklist when making product, engineering, or UI/UX decisions.

---

## North Star: What we ship and why

**Regime Station turns public macro signals into plain‑English execution constraints for product and engineering leaders.**
Every change should help users answer:

1. **What is the macro regime?**
2. **What does it mean operationally?**
3. **What should we do next (or avoid)?**

---

## Product & Engineering Principles

| Principle | What it means in practice | Why it matters |
| --- | --- | --- |
| **Clarity over cleverness** | Prefer explicit names, readable logic, and straightforward docs. | Leaders need fast comprehension, not hidden magic. |
| **Traceable data** | Every output must point to a verifiable public source (US Treasury). | Trust and auditability are non‑negotiable. |
| **Plain English first** | Translate jargon into operational consequences. | Users act on guidance, not on signal jargon. |
| **Single‑tool focus** | Consolidate the most common workflows into one dependable interface. | Reduces cognitive load and adoption friction. |
| **Speed & efficiency** | Optimize for fast startup, low memory use, minimal runtime friction. | High‑signal tools should feel immediate and reliable. |
| **Pragmatic defaults** | Ship sensible defaults and working examples. | Shortens time‑to‑value for new users. |

---

## UI/UX Standards (Serious, high‑density dashboards)

### Design system first
- Define tokens for **color, typography, spacing, radius, elevation**.
- Reuse tokens consistently across components.

### Layout & hierarchy
- Pick a **primary layout pattern** and stick to it.
- Maintain **clear CTA hierarchy** (one primary action above the fold, reinforced later).

### Accessibility by default
- Maintain **WCAG AA** contrast.
- Keep **focus states visible**.
- Respect **`prefers-reduced-motion`**.

### Interaction polish (subtle, professional)
- Use gentle motion (**150–300ms**) and soft shadows for hierarchy.
- Avoid playful or whimsical UI patterns.

---

## Decision Checklist (use before shipping)

### Product
- [ ] Does this change make the regime or its implications **clearer**?
- [ ] Is every output **traceable to US Treasury data**?
- [ ] Are we translating jargon into **operational consequences**?

### Engineering
- [ ] Is the logic **explicit and readable**?
- [ ] Are defaults sensible and documented?
- [ ] Does this preserve **fast startup and low runtime friction**?

### UI/UX
- [ ] Are design tokens defined and consistently applied?
- [ ] Is the layout pattern consistent with existing screens?
- [ ] Are contrast and focus states compliant?
- [ ] Are interactions subtle and professional?

---

## Sources of inspiration (high‑level themes)

- **oven‑sh / Bun**: single‑tool focus, speed, drop‑in compatibility, pragmatic defaults.
- **UI‑UX Pro Max**: design system consistency, accessible defaults, clear CTA hierarchy.
