"use client";

import { useCallback } from "react";
import { CheckIcon, ShareIcon } from "./uiIcons";
import { useClipboardCopy } from "./useClipboardCopy";

type Props = {
  title?: string;
  text: string;
  /** Labeled decision bullets ("Do now: …", "Pause if: …") appended below the operating call. */
  lines?: string[];
  url?: string;
  className?: string;
  showLabel?: boolean;
  /** Names the artifact this button copies. Two copy controls can share a screen only
   *  when they say what they each copy — DD-005 settled one canonical `Copy Brief` on
   *  `/`, and a second control under that same name is the duplicate it ruled out. */
  label?: string;
  copiedLabel?: string;
};

export function ShareBriefButton({
  title = "Whether Weekly Brief",
  text,
  lines,
  url = typeof window !== "undefined" ? window.location.href : "",
  className = "",
  showLabel = false,
  label = "Copy Brief",
  copiedLabel = "Brief Copied",
}: Props) {
  /*
   * The copy path was `void navigator.clipboard.writeText(text)` in a try/catch
   * whose catch could never fire — `void` makes a rejected write an unhandled
   * rejection, not a synchronous throw — followed by an unconditional
   * `setDidCopy(true)`. On the homepage hero, that meant the brief people paste
   * into Slack reported "Brief Copied" whether or not anything was copied.
   */
  const { status, copyToClipboard } = useClipboardCopy();
  const didCopy = status === "copied";
  const didFail = status === "error";

  const handleClick = useCallback(() => {
    const bulletBlock = lines && lines.length > 0 ? `\n\n${lines.map((line) => `• ${line}`).join("\n")}` : "";
    const payload = { title, text: `${text}${bulletBlock}`, url };
    const canNativeShare = typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare(payload);
    if (canNativeShare) {
      void navigator.share(payload);
      return;
    }
    // `title` names the artifact, so the pasted block has to use it. Hardcoding the
    // weekly heading here meant a monthly or quarterly call arrived in Slack labelled
    // "Whether Weekly Brief" — the wrong horizon on a message people act on.
    const formattedSlackBrief = `*${title}*\n> *Operating Call:* ${text}${bulletBlock}\n\n*Full brief:* ${url || "https://whether.work"}`;
    void copyToClipboard(formattedSlackBrief, "share-brief");
  }, [title, text, lines, url, copyToClipboard]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${label} — copies to the clipboard, or shares if the browser offers it`}
      data-premium-intent="export_brief"
      data-premium-cta="share_brief_button"
      // The `C` shortcut and the command palette target this id. It moved here
      // when the separate Slack copy button was retired; this button produces
      // the same Slack block.
      data-testid="copy-slack-brief-button"
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-fluid-xs font-semibold tabular-nums text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/50 transition-colors weather-press-scale weather-focus-ring ${className}`}
      aria-label={label}
    >
      {didCopy ? (
        <CheckIcon className="size-4 text-emerald-300" />
      ) : (
        <ShareIcon className={didFail ? "size-4 text-amber-300" : "size-4"} />
      )}
      {showLabel ? (
        <span className={didFail ? "text-amber-300" : undefined}>
          {didCopy ? copiedLabel : didFail ? "Copy failed" : label}
        </span>
      ) : null}
      {/* The label is optional on this button, so the failure has to reach a
          screen reader either way. */}
      <output className="sr-only" aria-live="polite">
        {didCopy ? `${copiedLabel}.` : didFail ? "Copy failed. Select the brief text to copy it manually." : ""}
      </output>
    </button>
  );
}
