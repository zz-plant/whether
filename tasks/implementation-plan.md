# Implementation Plan — Full CTO/CPO Priority

## Phase 0: Pipeline Diagnostics (~2 hrs)
- [ ] Diagnose why live data is 33 days stale
- [ ] Test whether ingestion endpoints still resolve
- [ ] Restore live data flow
- [ ] Validate regime thresholds against 2025-2026

## Phase 1: UI Reorg (Week 3-4)
- [ ] Consolidated navigation rail (replace 3 systems with 1 persistent compact rail)
- [ ] Compressed hero (call-line + copy CTA + next-step CTA + configure placeholder)
- [ ] Unified decision body (merge WhatChanged + RevisitFlip + Decision)
- [ ] Glossary relocation (bottom of page / behind help affordance)
- [ ] Configure placeholder in hero

## Phase 2: Weekly Email Brief (Week 5-6)
- [ ] Email rendering path for bounded decision format
- [ ] Email template (notification-scannable, 5-second read)
- [ ] Email delivery trigger (post-refresh)
- [ ] Unsubscribe/opt-in management

## Phase 3: Ticker Input (Week 7-8)
- [ ] Ticker → sector mapping infrastructure
- [ ] Ticker input UI in configure affordance
- [ ] Sector-scoped regime parameter overrides
- [ ] Persistence via operator context cookies