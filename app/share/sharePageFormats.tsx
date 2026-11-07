"use client";

import { useMemo } from "react";
import type { ActivationCommitment } from "../../lib/activationFunnel";
import {
  formatInvestorUpdateSnippet,
  type InvestorUpdateSnippetParts,
} from "../../lib/export/investorUpdateSnippet";
import { BriefPreview } from "../components/briefFormatPicker";
import { ChatPreview } from "./chatPreview";
import { locationHashSource, useBrowserSource, useHydrated } from "../components/browserSource";
import { ClipboardActionRow } from "../components/clipboardActionRow";
import { ActionLink } from "../components/ui/actionLink";
import { getClipboardUiState, useClipboardCopy } from "../components/useClipboardCopy";
import { useOperatorRunway } from "../components/useOperatorRunway";

/**
 * Every format on `/share`, behind one picker: pick a format, read exactly what
 * will be pasted, copy it.
 *
 * The page used to stack each format as its own section — a tabbed picker, a
 * grid of eight "longer format" cards, the work-item tags, the pull policies,
 * the role memos — about 5,700px on desktop and 10,000 on a phone, with the
 * Slack text drawn three times (DD-041). Worse, the cards' preview showed only
 * what had already been copied, so a reader copied blind. Now one list, one
 * preview, one copy action.
 *
 * Five formats left on 2026-11-03, each a cut of another: the standup line (the
 * Slack post's first lines), the meeting snippet (the agenda's facts), the
 * work-item tags and pull policies (the ticket brief, one area at a time) and
 * the role memos (the email, split by role). Every format is pinned word for
 * word in `tests/briefFormatsPinned.test.ts`, so each one is a place a copy
 * change has to land; their old hashes open the format that carries them.
 *
 * Two Slack texts, on purpose: the short post (the share rail's Slack format,
 * the shape a channel skims) and the full brief (the weekly operator brief, for
 * a channel that wants every area). Each is drawn once.
 *
 * The selection is the URL hash, so a link can open the page on a format
 * (`/share#investor-update`) and the page's old section anchors still land.
 */
type ShareFormatGroup = "Chat" | "Social" | "Meetings" | "Docs and email" | "Tickets";

type ShareFormatBase = {
  id: string;
  label: string;
  /** What the reader is about to paste, in the place they will paste it. */
  hint: string;
  group: ShareFormatGroup;
};

export type ShareFormatOption = ShareFormatBase &
  (
    | {
        kind: "text";
        text: string;
        copyLabel: string;
        commitment: ActivationCommitment;
        offersCalendar?: boolean;
        /**
         * The destination's own composer with the text filled in: a network's
         * post intent, or a mail client's new message. A plain link; the reader
         * still presses send there.
         */
        compose?: { label: string; href: string };
        /**
         * "chat" draws the text as the channel will (bold, quote bars, links)
         * for the formats posted into Slack. Every other format previews as the
         * text itself, because there the text is the artifact: a Markdown
         * agenda, a ticket, an email.
         */
        preview?: "chat";
      }
    /** Composed in the browser: its last paragraph reads the reader's runway band, and the page is cached. */
    | { kind: "investor"; parts: InvestorUpdateSnippetParts; copyLabel: string }
  );

const GROUP_ORDER: readonly ShareFormatGroup[] = ["Chat", "Social", "Meetings", "Docs and email", "Tickets"];

/** The anchors the stacked page linked to, so an old link opens the format that lived there. */
const LEGACY_HASHES: Readonly<Record<string, string>> = {
  "meeting-slack": "slack-post",
  "tickets-kanban": "ticket-brief",
  standup: "slack-post",
  "meeting-snippet": "agenda",
  "work-item-tags": "ticket-brief",
  "pull-policies": "ticket-brief",
  "role-memos": "email",
};

/** The format a hash names, or the first format when it names none. */
const resolveShareFormat = (options: readonly ShareFormatOption[], hash: string): ShareFormatOption | undefined =>
  options.find((option) => option.id === (LEGACY_HASHES[hash] ?? hash)) ?? options[0];

const nextMondayIsoDate = () => {
  const date = new Date();
  const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date.toISOString().split("T")[0];
};

/* Built in the browser only. The date is the reader's next Monday, which the
   server cannot know; computing it during server render is what made this link
   the page's one hydration mismatch. */
const CalendarLink = ({ title, details }: { title: string; details: string }) => {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const date = nextMondayIsoDate().replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${date}T140000Z/${date}T143000Z`,
    details,
  });
  return (
    <a
      href={`https://calendar.google.com/calendar/render?${params.toString()}`}
      target="_blank"
      rel="noreferrer"
      className="weather-hit text-fluid-sm text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200"
    >
      Add a Monday review to your calendar
    </a>
  );
};

/* The subscribed feed (`/calendar.ics`): every Monday carries its own week's
   guidance. webcal:// opens Apple Calendar and Outlook; Google takes the same
   address through its add-by-URL page. Offered beside the meeting formats and,
   since 2026-10-27, beside RSS on the page's feed list too: shown only under
   two of fifteen formats, the feed was reachable by a reader who had already
   picked a meeting pack and by no one else. */
export const CalendarSubscribeLinks = ({
  feedUrl,
  lead = "Subscribe to each week's guidance",
}: {
  feedUrl: string;
  /** The words before the two links. */
  lead?: string;
}) => {
  const webcal = feedUrl.replace(/^https?:/, "webcal:");
  const linkClass =
    "weather-hit text-fluid-sm text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200";
  return (
    <span className="text-fluid-sm text-slate-400">
      {lead}:{" "}
      <a href={webcal} className={linkClass}>
        Apple or Outlook
      </a>{" "}
      ·{" "}
      <a
        href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
        target="_blank"
        rel="noreferrer"
        className={linkClass}
      >
        Google
      </a>
    </span>
  );
};

export function SharePageFormats({
  scoreReferences = [],
  options,
  calendar,
}: {
  /** Each score with its line, distance and last week, from `formatScoreReference`; the on-screen reference for every paste. */
  scoreReferences?: string[];
  options: readonly ShareFormatOption[];
  calendar: { title: string; details: string; feedUrl: string };
}) {
  const hash = useBrowserSource(locationHashSource);
  const selected = resolveShareFormat(options, hash);
  const { runwayBand } = useOperatorRunway();
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({
    commitment: (target) => {
      const option = options.find((candidate) => candidate.id === target);
      return option?.kind === "text" ? option.commitment : "copied_brief";
    },
  });

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({ group, items: options.filter((option) => option.group === group) })).filter(
        ({ items }) => items.length > 0,
      ),
    [options],
  );

  if (!selected) return null;

  const select = (id: string) => {
    /* replaceState, not a hash assignment: switching formats is not a page the
       back button should step through, and an assigned hash scrolls to any
       element that happens to carry the id. */
    window.history.replaceState(null, "", `#${id}`);
    locationHashSource.refresh();
  };

  const text =
    selected.kind === "text" ? selected.text : formatInvestorUpdateSnippet(selected.parts, runwayBand);
  const hint =
    selected.kind === "investor" && !runwayBand
      ? `${selected.hint} Pick a runway band on the brief to add what it means for your cash.`
      : selected.hint;

  return (
    <section id="formats" className="weather-panel weather-section-stack p-0" aria-labelledby="copy-call-heading">
      <h2 id="copy-call-heading" className="type-section">Copy this week&apos;s guidance</h2>
      <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* A phone gets the platform's own grouped picker: fifteen buttons
            stacked above the preview put the text a screen and a half down. */}
        <label className="flex flex-col gap-1.5 md:hidden">
          <span className="type-eyebrow">Format</span>
          <select
            value={selected.id}
            onChange={(event) => select(event.target.value)}
            className="weather-control min-h-[44px] w-full px-3 text-sm"
          >
            {grouped.map(({ group, items }) => (
              <optgroup key={group} label={group}>
                {items.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <nav aria-label="Formats" className="max-md:hidden">
          <div className="space-y-3">
            {grouped.map(({ group, items }) => (
              <div key={group} className="space-y-1">
                <p className="type-eyebrow">{group}</p>
                <ul>
                  {items.map((option) => {
                    const active = option.id === selected.id;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => select(option.id)}
                          aria-pressed={active}
                          className={`weather-focus-ring flex min-h-11 w-full items-center rounded-lg border px-2.5 text-left text-sm transition-colors [@media(hover:hover)_and_(pointer:fine)]:min-h-8 ${
                            active
                              ? "border-sky-500/30 bg-sky-500/12 font-semibold text-sky-100"
                              : "border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
                          }`}
                        >
                          {option.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-3" data-share-format={selected.id}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h3 className="text-fluid-base font-semibold text-slate-100 max-md:sr-only">{selected.label}</h3>
            <ClipboardActionRow
              label={selected.copyLabel}
              state={getClipboardUiState(selected.id, { status, error, activeTarget, copiedTarget })}
              onClick={() => void copyToClipboard(text, selected.id)}
              buttonLabels={{ error: "Copy failed" }}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">{hint}</p>
          {error ? (
            <p className="text-xs text-amber-200">Clipboard access failed. Select the preview text and copy it manually.</p>
          ) : null}
          {selected.kind === "text" && selected.preview === "chat" ? (
            <ChatPreview label={selected.label} text={text} />
          ) : (
            <BriefPreview label={selected.label} text={text} />
          )}
          {selected.kind === "text" && (selected.compose || selected.offersCalendar) ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {selected.compose ? (
                <ActionLink href={selected.compose.href} variant="inline" target="_blank" rel="noreferrer">
                  {selected.compose.label}
                </ActionLink>
              ) : null}
              {selected.offersCalendar ? (
                <>
                  <CalendarLink title={calendar.title} details={calendar.details} />
                  <CalendarSubscribeLinks feedUrl={calendar.feedUrl} />
                </>
              ) : null}
            </div>
          ) : null}
          {scoreReferences.length > 0 ? (
            <details className="weather-auto-chevron">
              <summary className="weather-hit w-fit cursor-pointer text-fluid-sm font-medium text-slate-300">
                This week&apos;s readings
              </summary>
              <ul className="max-w-3xl space-y-1.5 border-l-2 border-[color:var(--border-subtle)] pl-3 text-fluid-sm leading-5 tabular-nums text-slate-300">
                {scoreReferences.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
