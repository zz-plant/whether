<!-- Part of the feature log. Index: ./README.md -->

## 2) Data sourcing & provenance

### 2.1 Treasury yields (live + fallback)
- Canonical in-product source: FRED CSV Treasury constant-maturity series (`DGS1MO`, `DGS3MO`, `DGS2`, `DGS10`).
- Secondary/provenance source: US Treasury Fiscal Data API is used only for validation workflows and source cross-checking, not for runtime scoring.
- Data is normalized into a `TreasuryData` shape and stamped with `record_date`, `fetched_at`,
  and source metadata.
- If live fetch is unavailable, the report falls back to `data/snapshot_fallback.json` and marks the
  response as cached with a fallback reason.

### 2.2 Macro snapshot
- Core series now include CPI, unemployment, BBB OAS, HY OAS, Chicago Fed NFCI, and VIX with live fetch support where available.
- Startup/operator overlays (VC funding velocity, tech layoff trend, SaaS multiples) and structural overlays (earnings revisions, AI compute cost trend, regulatory risk tracker) are shipped via snapshot-backed series for deterministic fallback.
- Each series carries a source URL, record date, and freshness metadata.

### 2.3 Time Machine cache
- Historical Treasury snapshots are served from `data/time_machine_cache.json`.
- Each entry also carries the period's VIX reading with a trailing daily tail
  (`vixHistory`) and the resolved base-rate velocity pair
  (`baseRateVelocityWindow`), so the runtime replay evaluates the market-stress
  veto and tightening-speed term on the same daily cadence the archive
  generators use. The runtime governed walk must publish the same regime and
  scores as `data/summary_archive.json` for every month on record; the parity
  test in `tests/regimeGovernance.test.ts` pins this.
- Historical selections resolve their assessment from the governed walk
  (`findTimeMachineGovernedAssessment`), not a point evaluation against the
  live machine snapshot, so a selected month reads the same call on every
  surface — brief, compare cards, and `/history`.
- The confidence history and the analog ranking resolve each historical month
  from that same governed walk, so a stress month's confidence and distance to
  flip carry the VIX haircut and veto the record was published with. The
  current record date resolves to the live assessment instead.
- A partial generator run (`HISTORY_START_YEAR`, which
  `time-machine:update-summaries` sets to 2024) walks from the first year and
  filters only which records it writes, so a merge lands the same
  confirmations a full replay produces.
- One walk (2026-10-06): the runtime replay and all three generators thread the
  engine through `replayRegimeWalk` (`lib/timeMachine/regimeReplay.ts`), and the
  generators' period logic is `lib/summary/regimeArchiveReplay.ts`.
  `tests/regimeArchiveReplay.test.ts` replays every cadence offline from series
  rebuilt out of the bundled data and holds it to the archive on record.
- Every entry a generator writes carries `engineVersion` (`ENGINE_VERSION`, the
  engine calibration that scored it). It is additive: entries written earlier have
  none, and the archive reader ignores it.
- A flip is a shock only when the one-step move is 25 points or more *and* the
  prior reading sat outside the 5-point near band; from inside the band the
  warning could have fired, so the flip confirms through the gate.
- The Time Machine UI validates available months, shows cache coverage, and uses cached
  summary archives for weekly/monthly/quarterly/yearly playback.
- Historical assessment now attempts to align macro-series history to the selected `asOf` date and records explicit coverage labels (`historical aligned`, `historical aligned partial`, or `treasury-only`) so historical vs. live comparisons stay structurally comparable when data exists and honestly degraded when it does not.
