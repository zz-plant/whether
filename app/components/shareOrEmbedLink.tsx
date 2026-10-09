import { ActionLink } from "./ui/actionLink";
import type { NextStep } from "./report-shell/NextStepCard";
import { utilityLinks } from "../../lib/navigation/informationArchitecture";

/*
 * The one link from a reading page to /share.
 *
 * Until 2026-10-08 the site offered to share the same week in five places: the
 * brief's "Do and share" slide and image buttons, the plan's "Share the brief"
 * step, Trust's "Cite this guidance" and "Meeting snippet", the /share page, and
 * each frozen week's own copy panel. /share owns every format, the embed, the
 * citation and the API; the brief, Decide and Trust each carry this link
 * instead. A frozen week keeps its date-pinned copy panel, which /share — the
 * current week's page — cannot give.
 */
const SHARE_OR_EMBED_LABEL = "Share or embed this →";

const shareLink = utilityLinks.find((link) => link.href === "/share");

export const SHARE_OR_EMBED_NEXT_STEP: NextStep = {
  href: "/share",
  description: shareLink?.description ?? "",
  label: SHARE_OR_EMBED_LABEL,
};

export function ShareOrEmbedLink({ className }: { className?: string }) {
  return (
    <ActionLink href="/share" variant="inline" className={className} data-share-or-embed>
      {SHARE_OR_EMBED_LABEL}
    </ActionLink>
  );
}
