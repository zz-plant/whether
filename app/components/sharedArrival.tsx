"use client";

import { isSharedArrivalQuery } from "../../lib/report/briefArtifact";
import { locationSearchSource, useBrowserSource } from "./browserSource";
import { ActionLink } from "./ui/actionLink";

/**
 * What a reader who followed a pasted brief does next.
 *
 * Every copy format links back with `?ref=share` (`resolveSharedBriefUrl`), and
 * the reader who follows one knows who sent it and nothing else: not what
 * Whether is, that it comes every Monday, or that its lines can be scaled to
 * their own company. The guidance is the same for every company, so the step
 * that makes it theirs is setting a stage and runway; the step that brings them
 * back is the Monday email. Two links, the email first, since a reader who
 * leaves without it does not come back.
 */
export function SharedArrivalActions({ calibrateHref, subscribeHref }: { calibrateHref: string; subscribeHref: string }) {
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <ActionLink href={subscribeHref} variant="inline">
        Get it every Monday
      </ActionLink>
      <ActionLink href={calibrateHref} variant="inline">
        Scale it to your stage and runway
      </ActionLink>
    </span>
  );
}

/**
 * The greeting on a dated record (`/brief/<week>`), where most pasted links
 * land: the record is the most specific stable URL for a week
 * (`resolveBriefUrl`). That page is built once and served static, so it cannot
 * read the query on the server the way the homepage does; this reads it in the
 * browser and renders nothing until then. It sits below the card, so arriving
 * late moves nothing a reader has started reading.
 */
export function SharedArrivalNote({ orientation }: { orientation: string }) {
  const search = useBrowserSource(locationSearchSource);
  if (!isSharedArrivalQuery(search)) return null;

  return (
    <section
      aria-label="Shared with you"
      data-shared-arrival
      className="border-l-2 border-[color:var(--border-default)] pl-3 text-fluid-xs leading-relaxed text-slate-300"
    >
      <p>
        <span className="font-semibold text-slate-100">Shared with you.</span> {orientation}
      </p>
      {/* The email is this page's own form, which starts on Monday delivery. */}
      <SharedArrivalActions calibrateHref="/#company-calibration" subscribeHref="#monday-email" />
    </section>
  );
}
