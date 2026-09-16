import type { BriefArtifact } from "../../lib/report/briefArtifact";
import { JsonLdScript } from "./jsonLdScript";

export const BRIEF_ARTIFACT_ELEMENT_ID = "whether-brief-artifact";

/**
 * Publishes the week's call as structured JSON for client surfaces that are not
 * rendered inside the brief.
 *
 * `ShareRail` is mounted once from `app/layout.tsx` — deliberately, so a share
 * panel opened from anywhere is the same instance — which puts it outside the
 * homepage's props entirely. It reached for the brief with
 * `document.querySelector('[data-share-section="decision"]').textContent`, which
 * would have produced run-together text if that attribute existed anywhere; it
 * does not, so the control copied its own fallback string instead.
 *
 * A JSON island keeps the global mount and gives it real fields. Routes that
 * carry no weekly call simply do not render one, and the panel falls back.
 */
export function BriefArtifactScript({ artifact }: { artifact: BriefArtifact }) {
  return (
    /* Escaping moved into JsonLdScript, which is a tightening as well as a
       consolidation: this escaped only `<`, so a U+2028 in any string the
       artifact carried was a parse error in the embedded JSON. */
    <JsonLdScript type="application/json" id={BRIEF_ARTIFACT_ELEMENT_ID} data={artifact} />
  );
}
