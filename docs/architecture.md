# Architecture overview

Whether (Regime Station) is a Next.js App Router product that turns Treasury macro data into
operational guidance. The system is organized around a small number of deterministic pipelines:
fetch/normalize data, score the regime, generate guidance, and render reports.

## Runtime data flow
1. **Treasury fetch** via `lib/treasury/treasuryClient.ts`, with snapshot fallback and
   source metadata attached.
2. **Normalization** in `lib/treasury/treasuryNormalizer.ts` to map API payloads into
   typed, consistent shapes.
3. **Sensor construction** in `lib/sensors.ts` (yield curve slope, base rate, macro snapshots)
   to produce source+timestamp annotated readings.
4. **Regime scoring** in `lib/regimeEngine.ts`, producing the market climate and constraints.
5. **Guidance selection** in `lib/playbook.ts` and **action validation** in
   `lib/decisionShield.ts` for operator decisions.
6. **Report assembly** in `lib/report/reportData.ts` and summary generators in `lib/summary/*`.
7. **UI rendering** through `app/` routes (overview, signals, operations) backed by API
   endpoints under `app/api/*`.

## Core domains and modules
- **Data acquisition**: `lib/treasury/*`, `lib/macroSnapshot.ts`, `lib/snapshot.ts`.
- **Scoring + classification**: `lib/regimeEngine.ts`, `lib/thresholds.ts`.
- **Decision support**: `lib/decisionShield.ts`, `lib/decisionShieldConfig.ts`.
- **Guidance content**: `lib/playbook.ts`, `data/recommendations.ts`.
- **Historical analysis**: `lib/timeMachine/*`, `data/time_machine_cache.json`.
- **Report generation**: `lib/report/*`, `lib/summary/*`.
- **Navigation + UX framing**: `lib/navigation/*`, `lib/operatorRequests.ts`.

## Caches and snapshots
- `data/snapshot_fallback.json` provides an offline baseline for the latest Treasury reading.
- `data/macro_snapshot.json` stores expanded macro signals with explicit sources.
- `data/time_machine_cache.json` and `data/summary_archive.json` accelerate historical queries
  and summary generation.

## API routes
Summary APIs live under `app/api/*` and mirror the time horizon they serve:
- `/api/weekly`, `/api/monthly`, `/api/quarterly`, `/api/yearly`
- `/api/summary-delta` for change detection
- `/api/treasury` for direct Treasury-derived data access

## Extension points
- **New sensors**: add a normalized source in `lib/treasury/*` or `lib/macroSnapshot.ts`, then
  wire it into `lib/sensors.ts`.
- **New guidance**: update `data/recommendations.ts` and extend `lib/playbook.ts` mappings.
- **New report lanes**: add a route under `app/` plus corresponding builders in `lib/report/*`.
