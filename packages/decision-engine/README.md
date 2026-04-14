# Decision Engine Boundary

This package is a thin boundary around the canonical Whether decision system.

Scope:
- `signals -> posture -> decision -> artifact`
- shared types and builders for posture, bounded decisions, trust, and export-ready payloads

Out of scope:
- route layout
- content catalog management
- UI presentation
- data fetching and persistence

The package intentionally re-exports the existing canonical `lib/report/*` surface for now. The goal is to create a stable package boundary before any behavior moves.
