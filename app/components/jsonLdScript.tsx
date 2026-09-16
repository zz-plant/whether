import { serializeJsonLd } from "../../lib/seo";

/**
 * The only `dangerouslySetInnerHTML` in the repo.
 *
 * Fourteen surfaces embedded structured data by hand, which is why
 * `react/no-danger` was switched off repo-wide: every one of them is a
 * `<script>` holding JSON, the one case the rule cannot distinguish from an
 * HTML injection and the one case React offers no other API for. A rule turned
 * off everywhere is a wider suppression than a disable on a line someone has
 * read — the suppression census makes that argument itself — so the uses are
 * now one component and the rule is enforced everywhere else.
 *
 * Every payload goes through `serializeJsonLd`, which escapes `<`, `>`, `&` and
 * the two line separators. That is a tightening as well as a consolidation:
 * `briefArtifactScript` escaped only `<`, so a line separator in any string it
 * carried would have been a parse error in the embedded JSON.
 */
export function JsonLdScript({
  data,
  /** `application/json` for a payload the page reads back, rather than one a crawler does. */
  type = "application/ld+json",
  id,
}: {
  data: unknown;
  type?: "application/ld+json" | "application/json";
  id?: string;
}) {
  return (
    // oxlint-disable-next-line react/no-danger -- see this file's doc comment: JSON in a script tag, escaped.
    <script type={type} id={id} dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
  );
}
