import type { BriefArtifact } from "../../lib/report/briefArtifact";

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
    <script
      type="application/json"
      id={BRIEF_ARTIFACT_ELEMENT_ID}
      // `dangerouslySetInnerHTML` with `<` escaped, which is the one sequence
      // that could close this tag early. The content is JSON, never markup.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(artifact).replace(/</g, "\\u003c"),
      }}
    />
  );
}
