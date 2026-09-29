# SEO editorial priorities

Status: Working prioritization; route and content ownership below describe current implementation.
Updated: 2026-09-25.

## Audience and promise

Prioritize founders and finance partners at venture-backed companies making hiring and spending
commitments between funding rounds. Fractional CFOs and VC operating partners can apply the same
questions across companies, while keeping company inputs separate. Product, engineering and growth
leaders enter through the decisions they own. Bootstrapped operators can use the spending and growth
answers without assuming a future raise.

The opportunity is market condition × operating decision × decision owner. Whether supplies weekly
operating guidance from public macro signals. Its forecast concerns movement between operating
conditions, not company revenue, investment returns or an exact recession date.

## Delivery order and canonical surfaces

Deepen these existing surfaces before creating additional routes. The answer directory's
`featuredOrder` in `content/answers/pages.json` leads with runway, engineering hiring and fundraising.

| Priority | Search intent to validate | Existing surface | Evidence the reader must supply |
| --- | --- | --- | --- |
| 1 | Cut burn; extend runway; budget under uncertainty | `/answers/when-should-startups-cut-burn`, runway resource guide, `/operate/financial` | Downside cash plan, milestone cost, exit costs and protected commitments |
| 2 | Engineering hiring; hiring freeze and reopening | Engineering and selective-hiring answers | Full role cost, bottleneck, funded ramp and capacity |
| 3 | Start fundraising; raise now or extend runway | `/answers/should-startups-raise-capital-now` | Cash deadline, milestone, process time and investor evidence |
| 4 | Scale growth spending; CAC payback; sales capacity | GTM and sales-headcount answers | Cohort conversion, retention, gross margin, ramp and collections |
| 5 | Roadmap scope; defer a new product line | Roadmap and new-product answers | Customer commitments, demand proof, capacity and ongoing support |
| 6 | Board market update; executive briefing template | Executive-briefing answer, `/share`, published briefs | Decision owner, internal evidence, requested approval and review trigger |
| 7 | Rate cuts or tighter credit and startup decisions | Funding-climate and risk-appetite answers, `/signals` | Actual borrowing terms, investor response and customer evidence |
| 8 | Public SaaS multiples; compare funding environments | `/comps`, `/history`, `/history/compare` | Comparable selection, revenue basis, period and publication status |

These are product-fit priorities, not measured keyword volume or ranking forecasts. Do not describe
a query as a proven opportunity until Search Console or another named source supports that claim.

## Answer-page contract

`content/answers/pages.json`, validated by `lib/answerContentSource.ts`, owns the enduring answer,
audience, topic explanation, company-input checklist, decision-note template and supporting links.
`app/answers/decisionAnswerPageContent.tsx` renders those alongside the canonical dated report,
area rules, pause/resume criteria and source status. Editorial content must not assert a live state.

- Keep the enduring answer visible even when multiple pages share the same weekly rule.
- Keep company inputs and placeholders in the copied brief so it cannot read as a completed approval.
- State the report date and fallback status with the market guidance.
- Keep visible answers, FAQ structured data, stable metadata and `/llms-full.txt` consistent.
- Use the existing answer directory, related links and site search for discovery.
- Link explanation and reference pages back to an actionable answer and the weekly brief.
- Preserve existing quality/freshness indexation gates. More prose does not make stale data fresh.

Public multiples are comparison context, not a formula for private valuation. Historical model
readings and published weekly briefs remain distinct. The current answer corpus covers the event
translation intent without publishing a new URL for every announcement or role/stage permutation.

## Expansion gate

Review the first three clusters after a complete measurement window, then work down the table.
Use the process in `measurement-model.md` and `refresh-loop.md`. Improve an existing page when a
query has the same decision and evidence needs; propose a new page only when it requires a distinct
answer, substantive evidence and a useful artifact.

Defer broad economic/recession prediction pages, country-specific forecasts without local evidence,
and generic investing or job-search content. Annual whitepapers, portfolio maturity benchmarks and
case studies require a documented cohort or actual cases before publication; they are not scheduled
outputs. The previous calendar-led roadmap is superseded by these evidence gates.
