# whether.work page load audit (2026-02-25)

## Scope
- Goal: audit page load times for key public routes on `https://whether.work` and identify highest-value optimization targets.
- Sampled routes (from sitemap):
  - `/`
  - `/signals`
  - `/operations`
  - `/operations/decisions`
  - `/operations/briefings`
  - `/methodology`
  - `/guides`
  - `/solutions`

## Method (reproducible)
- Script: `scripts/perf/audit_page_load_times.py`
- Runs: 7 samples per URL (sequential).
- Collection approach:
  - uses `curl` timing fields for DNS/connect/TLS/TTFB/total,
  - captures `x-envoy-upstream-service-time` when present to separate upstream compute from transport overhead.
- Command:
  ```bash
  python scripts/perf/audit_page_load_times.py
  ```

## Results summary (7-run sample)

| URL | HTTP | Avg TTFB (s) | p50 TTFB (s) | p90 TTFB (s) | Avg Total (s) | Avg Upstream (ms) |
|---|---:|---:|---:|---:|---:|---:|
| `https://whether.work/` | 200 | 0.744 | 0.351 | 2.347 | 0.763 | 719.1 |
| `https://whether.work/signals` | 200 | 0.814 | 0.491 | 2.683 | 0.882 | 791.3 |
| `https://whether.work/operations` | 200 | 0.507 | 0.430 | 0.864 | 0.526 | 479.6 |
| `https://whether.work/operations/decisions` | 200 | 0.449 | 0.375 | 0.786 | 0.470 | 420.9 |
| `https://whether.work/operations/briefings` | 200 | 0.382 | 0.329 | 0.727 | 0.399 | 360.0 |
| `https://whether.work/methodology` | 200 | 0.071 | 0.066 | 0.106 | 0.072 | 45.1 |
| `https://whether.work/guides` | 200 | 0.113 | 0.049 | 0.350 | 0.115 | 90.0 |
| `https://whether.work/solutions` | 200 | 0.072 | 0.062 | 0.129 | 0.073 | 43.3 |

## What improved in this audit
- Added percentile reporting (p50/p90), not just averages, to better represent variance.
- Added upstream service-time signal (`x-envoy-upstream-service-time`) to distinguish backend generation latency from network overhead.
- Added a committed script so the team can re-run the exact audit workflow instead of manually reproducing ad-hoc commands.

## Findings
1. **`/` and `/signals` remain the highest-priority latency targets** by both avg TTFB and p90 TTFB.
2. **Variance is concentrated in those same routes** (elevated p90 relative to p50), which is consistent with inconsistent cache behavior and/or expensive on-demand generation paths.
3. **Upstream service time tracks TTFB closely** (hundreds of ms on slow routes, tens of ms on fastest routes), indicating optimization focus should be backend/render path and cacheability—not DNS/TLS/network handshakes.
4. `/methodology` and `/solutions` are currently strong baseline performers and can be used as reference routes for caching/render behavior.

## Concrete next actions
1. **Route-specific caching hardening for `/` and `/signals`**
   - Validate edge cache policy and revalidation strategy for these routes.
   - Track and alert on cache-hit ratio deltas for these endpoints.
2. **SSR/render-path profiling**
   - Instrument server timing around data fetch + render phases for `/` and `/signals`.
   - Compare warm-cache vs cold-cache timings in controlled runs.
3. **Monitoring and SLOs**
   - Start synthetic checks at 5-minute cadence on `/` and `/signals`.
   - Initial target: p90 TTFB < 1.0s for both routes; tighten once stable.

## Notes and limitations
- This is a network-level/server-response audit and does not include browser render milestones (e.g., LCP/CLS/INP).
- Browser-based Playwright collection was attempted previously in this container but Chromium crashed (`SIGSEGV`).
- Google PageSpeed API sampling was rate-limited (`HTTP 429`) during prior attempts.
