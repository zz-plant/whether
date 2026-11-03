---
name: hire-raise-spend
description: This week's call on whether a startup should hire or freeze hiring, raise now or wait, cut burn or keep spending, from Whether's reading of U.S. interest-rate and credit-market data (whether.work, published every Monday). Use when someone asks about the timing of hiring, fundraising, burn, runway, sales headcount or go-to-market expansion against today's market; asks what the funding climate, interest rates or a possible recession mean for their company; or is drafting a board update, investor update or planning memo that needs this week's market context.
---

# Hire, raise, spend: this week's call

Whether scores two things from public U.S. market data, funding pressure and risk appetite, and
publishes each Monday which operating areas are paused and the lines that would resume them. Every
company reads the same conditions. What they mean for one company depends on its runway and stage.

Use this for market context in startup operating decisions. Do not use it for stock picks, personal
investing, candidate evaluation or employment rules. For a recession question, give the preparation
rules; Whether does not predict when a recession will happen.

## Get the reading

1. With the Whether connector, call `get_state`. For one named decision ("should we freeze
   hiring", "how much runway before we raise"), call `get_answer` with the question as the user
   asked it: it returns the answer, this week's standing, the rules in force and a line to cite.
2. Without the connector, fetch `https://whether.work/api/agent?view=state` (JSON, about 3KB, no
   key). For one decision, fetch
   `https://whether.work/api/mcp?tool=get_answer&question=<the question, URL-encoded>`.
3. If `automation.ready` is false, explain `automation.refusal` before using the reading. It may be
   a saved copy, more than 10 days old, or unavailable. Do not present it as current or act on it
   without human review.

## Answer

- Lead with the call for the area asked about: the action now, the line that pauses it and the
  line that resumes it, with today's score against each (`scores.tightness`, `scores.riskAppetite`,
  each with `pause`, `resume` and `change`).
- Apply it to the company. When the answer turns on runway or stage and the user has not said,
  ask. The published call is a starting point; do not infer the company's cash or stage from it.
- Say what would change the call (`guidance.flipConditions`) and when the next one is published
  (`freshness.nextCallDue`).
- Quote the reading's date (`recordDate`) and link the page: https://whether.work for this week,
  the answer's `permalink`, or https://whether.work/brief/<week> for a published week.
- Whether reads public market data and knows nothing about the company's own numbers. Keep its
  runway, revenue and investor conversations in the decision. It is not investment, legal, tax or
  employment advice.

## Check one plan

For a specific plan ("hire three engineers next quarter", "sign a three-year lease"), call
`stress_test_plan` with the plan in plain words, or fetch
`https://whether.work/api/mcp?tool=stress_test_plan&planText=<the plan, URL-encoded>`. It returns
a verdict, the assumptions that would break first, and the pause and resume lines that apply.
