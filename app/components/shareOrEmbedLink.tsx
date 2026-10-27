import { ActionLink } from "./ui/actionLink";

/*
 * The one link from a reading page to /share.
 *
 * Until 2026-10-08 the site offered to share the same week in five places: the
 * brief's "Do and share" slide and image buttons, the plan's "Share the brief"
 * step, Trust's "Cite this guidance" and "Meeting snippet", the /share page, and
 * each frozen week's own copy panel. /share owns every format, the embed, the
 * citation and the API; the brief and Trust each carry this link instead.
 * Decide carried it as a closing "Next" card until 2026-10-09, a third way to
 * a page its header and footer already reach. A frozen week keeps its
 * date-pinned copy panel, which /share — the current week's page — cannot give.
 */
const SHARE_OR_EMBED_LABEL = "Share or embed this →";

export function ShareOrEmbedLink({ className }: { className?: string }) {
  return (
    <ActionLink href="/share" variant="inline" className={className} data-share-or-embed>
      {SHARE_OR_EMBED_LABEL}
    </ActionLink>
  );
}
