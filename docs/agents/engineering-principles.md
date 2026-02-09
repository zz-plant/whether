# Engineering principles & coding conventions

## Working agreements
- **Clarity over cleverness:** explicit names and readable control flow.
- **Traceable outputs:** user-visible data should map to verifiable sources.
- **Plain-English interpretation:** financial signals should become operational language.
- **Serious product posture:** optimize for trust, not novelty.

## Implementation guidance
- Prefer small, composable functions with explicit inputs/outputs.
- Keep regime scoring and classification deterministic and well-tested.
- Avoid hidden side effects in fetch/transformation paths.
- Propagate metadata (source URL, capture timestamp, confidence) whenever available.
- Reuse existing utilities/types before creating new abstractions.
