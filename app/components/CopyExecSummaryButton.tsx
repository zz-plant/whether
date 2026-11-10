"use client";

import { CheckIcon, CopyIcon, SpinnerIcon } from "./uiIcons";
import { useClipboardCopy } from "./useClipboardCopy";
import { ClipboardActionRow } from "./clipboardActionRow";

type Props = {
  text: string;
  className?: string;
};

/**
 * Copies a three-bullet executive summary of this week's guidance, for a leadership
 * email or a Monday sync agenda. The bullets come from the same brief the card
 * states, so the paste and the page cannot disagree.
 */
export function CopyExecSummaryButton({ text, className = "" }: Props) {
  const { status, copyToClipboard } = useClipboardCopy({ commitment: "copied_slack" });

  const handleClick = () => {
    void copyToClipboard(text, "exec-summary");
  };

  return (
    <ClipboardActionRow
      compact
      className={className}
      buttonVariant="pill"
      label="Copy 3-bullet exec summary"
      state={status}
      onClick={handleClick}
      leadingIcon={<CopyIcon className="size-4 text-slate-400" />}
      stateIcons={{
        copying: <SpinnerIcon className="size-4 text-slate-400" />,
        copied: <CheckIcon className="size-4 text-emerald-400" />,
      }}
      buttonLabels={{
        copied: <span className="text-emerald-300">Summary copied</span>,
        error: <span className="text-rose-400">Copy failed</span>,
      }}
      buttonProps={{
        title: "Copy a three-bullet executive summary of this week's guidance",
        "data-testid": "copy-exec-summary-button",
      }}
    />
  );
}