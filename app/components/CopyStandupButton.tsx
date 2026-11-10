"use client";

import { CheckIcon, CopyIcon, SpinnerIcon } from "./uiIcons";
import { useClipboardCopy } from "./useClipboardCopy";
import { ClipboardActionRow } from "./clipboardActionRow";

type Props = {
  text: string;
  className?: string;
};

/**
 * Copies the week's one-line standup ("Guidance unchanged; no pace change. Conditions
 * change if: …") for a team's standup or Slack thread. The line is computed on the
 * server from the same guidance the card states, so the paste and the page cannot
 * disagree (decision transmission: under 10 seconds to share).
 */
export function CopyStandupButton({ text, className = "" }: Props) {
  const { status, copyToClipboard } = useClipboardCopy({ commitment: "copied_slack" });

  const handleClick = () => {
    void copyToClipboard(text, "standup");
  };

  return (
    <ClipboardActionRow
      compact
      className={className}
      buttonVariant="pill"
      label="Copy 1-line standup"
      state={status}
      onClick={handleClick}
      leadingIcon={<CopyIcon className="size-4 text-slate-400" />}
      stateIcons={{
        copying: <SpinnerIcon className="size-4 text-slate-400" />,
        copied: <CheckIcon className="size-4 text-emerald-400" />,
      }}
      buttonLabels={{
        copied: <span className="text-emerald-300">Standup copied</span>,
        error: <span className="text-rose-400">Copy failed</span>,
      }}
      buttonProps={{
        title: "Copy this week's one-line standup for Slack or a team thread",
        "data-testid": "copy-standup-button",
      }}
    />
  );
}