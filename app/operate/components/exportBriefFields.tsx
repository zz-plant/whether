"use client";

import { Button } from "@base-ui/react/button";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";

/**
 * The repeated parts of `ExportBriefPanel`.
 *
 * That panel was one 720-line component function with no internal seams: four
 * copy targets, each rendered inline as the same two-column grid, plus a
 * four-input override form. It sat within fifty lines of the 800-line budget on
 * `app/**`, which meant the next change to it would have been made under
 * pressure to shrink rather than to improve. These are the pieces it repeated.
 */

export type OverrideDraft = {
  reason: string;
  indicator: string;
  owner: string;
  reversal: string;
};

export const EMPTY_OVERRIDE: OverrideDraft = {
  reason: "",
  indicator: "",
  owner: "",
  reversal: "",
};

/** An override only applies once every field is answered — a partial one states
 *  a deviation without saying who owns it or what would reverse it. */
export const isOverrideComplete = (draft: OverrideDraft) =>
  Object.values(draft).every((value) => value.trim().length > 0);

export const formatOverrideLine = (draft: OverrideDraft) =>
  isOverrideComplete(draft)
    ? `OVERRIDE ACTIVE: ${draft.reason.trim()} · Indicator: ${draft.indicator.trim()} · Owner: ${draft.owner.trim()} · Reverse when: ${draft.reversal.trim()}`
    : "";

/** Two-column grid: actions on the left, a preview of what they copy on the right. */
export const ExportTargetGrid = ({
  children,
  className = "mt-4",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`${className} grid gap-4 lg:grid-cols-[1.4fr,1fr]`}>{children}</div>;

/**
 * Downloads one export as a file. Nine of these were written out inline, each
 * repeating the same forty-character class string and the same arrow-function
 * wrapper around `handleDownload`.
 */
export const ExportDownloadButton = ({
  label,
  content,
  fileName,
  onDownload,
  className = "mt-3",
}: {
  /** A node, not a string: three of these wrap a `WorkAppLabel` glyph. */
  label: React.ReactNode;
  content: string;
  fileName: string;
  onDownload: (content: string, fileName: string) => void;
  className?: string;
}) => (
  <Button
    type="button"
    onClick={() => onDownload(content, fileName)}
    className={`weather-button ${className} inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100`}
  >
    {label}
  </Button>
);

/** The read-only preview beside a copy control. */
export const ExportPreviewPane = ({
  title,
  description,
  value,
  rows = 6,
}: {
  title: string;
  description: string;
  value: string;
  rows?: number;
}) => (
  <div className="weather-surface p-4">
    <p className="type-kicker">{title}</p>
    <p className="mt-3 text-sm text-slate-300">{description}</p>
    <textarea
      readOnly
      value={value}
      rows={rows}
      aria-label={title}
      className="mt-3 w-full rounded-lg border border-slate-800 bg-slate-950/80 p-3 font-mono text-base text-slate-200"
    />
  </div>
);

const OVERRIDE_FIELDS: readonly { key: keyof OverrideDraft; label: string }[] = [
  { key: "reason", label: "Reason" },
  { key: "indicator", label: "Local indicator" },
  { key: "owner", label: "Owner" },
  { key: "reversal", label: DECISION_CONTRACT_LABELS.reversal.changeCourseIf },
];

/**
 * The company-specific exception, as four fields instead of four inline blocks.
 *
 * Labels, styling and copy are unchanged — this is a decomposition, not a
 * redesign, and a repeated `<label>`/`<input>` pair is the part worth naming.
 */
export const ExportOverrideFields = ({
  draft,
  onChange,
}: {
  draft: OverrideDraft;
  onChange: (next: OverrideDraft) => void;
}) => (
  <div className="mt-4 space-y-3 border-t border-amber-300/20 pt-4">
    <p className="text-sm text-amber-50">Add a company-specific exception to all exports.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {OVERRIDE_FIELDS.map((field) => (
        <label key={field.key} className="space-y-1">
          <span className="type-eyebrow text-amber-100/80">{field.label}</span>
          <input
            className="w-full rounded-lg border border-amber-300/20 bg-slate-950/80 px-3 py-2 text-base text-slate-100"
            value={draft[field.key]}
            onChange={(event) => onChange({ ...draft, [field.key]: event.target.value })}
          />
        </label>
      ))}
    </div>
    <p className="text-fluid-xs leading-5 text-amber-100/80">
      When active, the exception is appended to the leadership team brief, plain-English brief,
      board note, meeting pack, one-screen summary, and board summary exports.
    </p>
  </div>
);
