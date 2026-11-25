# Whether in a spreadsheet

Canonical. Put this week's scores, lines and guidance in the cells of a hiring or burn plan, so the
plan shows when a score is past its pause line without anyone checking the site.

Both routes read `GET https://whether.work/api/agent?view=state` (the compact state, shape
`agentStateSchema` in `lib/agentState.ts`; fields in [the agent interface](../../agents/agent-interface.md#start-here-the-state)).
It is public: no key, no sign-in, and nothing from the sheet is sent.

| Spreadsheet | Route | Source |
| --- | --- | --- |
| Google Sheets | The custom function `=WHETHER(key, [score])` | [whether.gs](whether.gs) |
| Excel | A Power Query table of `Field` and `Value`, read with `XLOOKUP` | [whether-state.pq](whether-state.pq) |

Copy from those two files; this page holds no copy of either. `tests/spreadsheetFunction.test.ts`
runs `whether.gs` against the state the route builds, and holds the key tables below to the script.

## Google Sheets

1. Open the sheet, then **Extensions → Apps Script**.
2. Replace the editor's contents with all of [whether.gs](whether.gs) and save.
3. In any cell: `=WHETHER("regime")`.

Custom functions ask for no authorization. The first call fetches the state; later calls in the
next hour read it from the script cache.

### Keys

| Key | Payload field | Returns |
| --- | --- | --- |
| `regime` | `conditions.key` | The engine key: `SCARCITY`, `DEFENSIVE`, `VOLATILE` or `EXPANSION`. |
| `conditions` | `conditions.label` | The weather word the site prints: Freezing, Cloudy, Stormy or Sunny. |
| `headline` | `headline` | The state in one sentence. |
| `guidance` | `guidance.call` | This week's guidance, one sentence. |
| `do_now` | `guidance.doNow` | What to do now, one item per cell down the column. |
| `avoid_now` | `guidance.avoidNow` | What to avoid now, one item per cell. |
| `flip_conditions` | `guidance.flipConditions` | What would change the guidance, one item per cell. |
| `confidence` | `confidence.label` | `HIGH`, `MED` or `LOW`; the site prints it as room before a change. |
| `confidence_percent` | `confidence.percent` | The same margin as a number. It is not a probability. |
| `record_date` | `recordDate` | The date of the reading. |
| `next_call_due` | `freshness.nextCallDue` | When the next weekly reading publishes (Mondays 14:00 UTC). |
| `automation_ready` | `automation.ready` | TRUE when the reading is live and current. |
| `automation_refusal` | `automation.refusal` | Why not, when `automation_ready` is FALSE. |
| `direction` | `change.direction` | `improving`, `deteriorating`, `mixed`, `stable` or `unavailable`. |
| `regime_changed` | `change.regimeChanged` | TRUE when the conditions changed since the earlier reading. |
| `change_summary` | `change.summary` | Which areas' pause or restart lines were crossed since the earlier reading. |
| `tightness` | `scores.tightness.value` | Funding pressure, 0 to 100. |
| `risk_appetite` | `scores.riskAppetite.value` | Risk appetite, 0 to 100. |

These take a score as the second argument: `tightness` (funding pressure) or `risk_appetite`.

| Key | Payload field | Returns |
| --- | --- | --- |
| `score` | `scores.{score}.value` | The score, 0 to 100. |
| `pause_line` | `scores.{score}.pause.line` | The pause line. |
| `pause_met` | `scores.{score}.pause.met` | TRUE when the score is past its pause line. |
| `resume_line` | `scores.{score}.resume.line` | The restart line. |
| `resume_met` | `scores.{score}.resume.met` | TRUE when the score is past its restart line. |
| `change_line` | `scores.{score}.change.line` | The line where conditions change. |
| `delta` | `scores.{score}.delta` | The move since the earlier reading, in points. |
| `per_week` | `scores.{score}.perWeek` | That move in points per week. |

A key matches in any case or spacing (`"Pause line"` works), and `"Funding pressure"` works as a
score. A dotted payload path also works as a key, for a field the tables leave out:
`=WHETHER("change.comparedWith.recordDate")`.

A cell is blank where the state holds nothing, as on a week that states no pause line. A key the
state cannot serve is an error that lists the keys that work.

## Excel

1. **Data → Get Data → From Other Sources → Blank Query**, then **Advanced Editor**.
2. Replace the contents with all of [whether-state.pq](whether-state.pq), name the query `Whether`, and
   **Close & Load** it as a table.
3. When Excel asks how to connect to `whether.work`, choose **Anonymous**.

Each row is one payload field. Read a value by its path, the second column of the tables above
with the score filled in:

```text
=XLOOKUP("scores.tightness.pause.line", Whether[Field], Whether[Value], "")
=XLOOKUP("guidance.doNow.0", Whether[Field], Whether[Value], "")
```

List items are numbered from 0. A field the state holds as null has no row, so the lookup falls back
to `""`. Refresh with **Data → Refresh All**, or set the query to refresh when the file opens.

## Flag planned hires when hiring pauses

Every area reads the same pause line per score; areas differ in which lines apply. Hiring's rule
pauses net-new hiring when either score is past its pause line (`buildCanonicalBoundedDecisionRules`
in `lib/report/boundedDecisionRules.ts`). To shade planned net-new hires while that holds, in Google
Sheets:

1. Put `=WHETHER("pause_met", "tightness")` in `H1` and `=WHETHER("pause_met", "risk_appetite")` in `H2`.
2. Select the planned-hire rows, then **Format → Conditional formatting → Custom formula is**
   `=OR($H$1=TRUE, $H$2=TRUE)`.

Excel takes the same rule from two `XLOOKUP` cells on `scores.tightness.pause.met` and
`scores.riskAppetite.pause.met`.

Put `=WHETHER("automation_ready")` beside the flag. When it reads FALSE the reading is a saved copy
or too old to name this week, and the flag reflects that reading.

## Freshness

The state publishes weekly, Mondays 14:00 UTC. Google Sheets keeps a custom function's result until
it recalculates the cell, and the script reuses a fetch for an hour; re-enter a formula to read again.
`next_call_due` says when a newer reading exists.

## What the state does not carry

- **A hiring stance** such as `PAUSE_NET_NEW`. The state has no per-area action; the rule above
  derives hiring's pause from the two `pause_met` cells, and `/api/decision` carries each area's
  action and lines.
- **A line per area.** The lines are per score, so `=WHETHER("pause_line", "hiring")` is an error
  that says so.
- **Runway or market-rate figures** for a runway model. Neither is in the state.
