"use client";

import { ClipboardActionRow } from "../../../components/clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../../../components/useClipboardCopy";

type CliCommandRowProps = {
  command: string;
  label?: string;
  target: string;
  helperText?: string;
};

export const CliCommandRow = ({
  command,
  label = "Copy command",
  target,
  helperText = "Ready to copy into your terminal or automation.",
}: CliCommandRowProps) => {
  const { copyToClipboard, status, error, activeTarget, copiedTarget } = useClipboardCopy();
  const state = getClipboardUiState(target, { status, error, activeTarget, copiedTarget });

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3">
      <pre className="overflow-x-auto rounded-xl border border-slate-800/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-100">
        {command}
      </pre>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <ClipboardActionRow
          label={label}
          state={state}
          onClick={() => {
            void copyToClipboard(command, target);
          }}
          buttonVariant="pill"
          compact
          showStatus
          statusClassName="text-xs text-slate-400"
          statusMessages={{
            idle: helperText,
            copying: "Copying command…",
            copied: "Copied command.",
            error: "Clipboard unavailable in this environment.",
          }}
          buttonLabels={{
            copied: "Copied",
          }}
        />
      </div>
    </div>
  );
};
