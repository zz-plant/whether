"use client";

import { useMemo, useState } from "react";

type ShareCopyControlsProps = {
  recordDate: string;
  slackBrief: string;
  emailBrief: string;
  meetingPack: string;
  calendarDetails: string;
};

type CopyTarget = "slack" | "email" | "meeting";

const copyLabels: Record<CopyTarget, string> = {
  slack: "Slack brief",
  email: "Email brief",
  meeting: "Meeting pack",
};

const nextMondayIsoDate = () => {
  const date = new Date();
  const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date.toISOString().split("T")[0];
};

export function ShareCopyControls({
  recordDate,
  slackBrief,
  emailBrief,
  meetingPack,
  calendarDetails,
}: ShareCopyControlsProps) {
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const calendarHref = useMemo(() => {
    const date = nextMondayIsoDate();
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Whether weekly brief review — ${recordDate}`,
      dates: `${date.replaceAll("-", "")}T140000Z/${date.replaceAll("-", "")}T143000Z`,
      details: calendarDetails,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [calendarDetails, recordDate]);

  const copyText = async (target: CopyTarget, text: string) => {
    setCopyError(null);

    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
    } catch {
      setCopiedTarget(null);
      setCopyError("Clipboard access failed. Select the preview text and copy it manually.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-sky-200">Slack</h2>
          <p className="text-xs leading-relaxed text-slate-300">Copy the current weekly operator brief for channel handoff.</p>
          <button
            type="button"
            className="weather-button min-h-[44px] px-4 py-2 text-xs font-semibold"
            onClick={() => void copyText("slack", slackBrief)}
          >
            {copiedTarget === "slack" ? "Copied Slack brief" : "Copy Slack brief"}
          </button>
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-emerald-200">Email</h2>
          <p className="text-xs leading-relaxed text-slate-300">Copy the same call with citation context for leadership notes.</p>
          <button
            type="button"
            className="weather-button min-h-[44px] px-4 py-2 text-xs font-semibold"
            onClick={() => void copyText("email", emailBrief)}
          >
            {copiedTarget === "email" ? "Copied email brief" : "Copy email brief"}
          </button>
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-amber-200">Meeting pack</h2>
          <p className="text-xs leading-relaxed text-slate-300">Copy the board note, call snapshot, weekly brief, and citation.</p>
          <button
            type="button"
            className="weather-button min-h-[44px] px-4 py-2 text-xs font-semibold"
            onClick={() => void copyText("meeting", meetingPack)}
          >
            {copiedTarget === "meeting" ? "Copied meeting pack" : "Copy meeting pack"}
          </button>
        </article>

        <article className="weather-surface space-y-3 px-4 py-4">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-violet-200">Calendar</h2>
          <p className="text-xs leading-relaxed text-slate-300">Open a Monday review invite with the current call in the agenda.</p>
          <a
            href={calendarHref}
            target="_blank"
            rel="noreferrer"
            className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold no-underline"
          >
            Add review
          </a>
        </article>
      </div>

      <article className="weather-surface min-w-0 space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-fluid-xs font-semibold tracking-[0.04em] text-slate-300">
            Preview
          </h2>
          <span className="text-fluid-micro text-slate-500">
            {copiedTarget ? `${copyLabels[copiedTarget]} ready` : "Current Slack brief"}
          </span>
        </div>
        {copyError ? <p className="text-xs text-amber-200">{copyError}</p> : null}
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-slate-800/80 bg-slate-950/80 p-3 text-xs leading-relaxed text-slate-200">
          {slackBrief}
        </pre>
      </article>
    </div>
  );
}
