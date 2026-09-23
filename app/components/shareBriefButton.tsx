"use client";

import { useCallback } from "react";
import { ClipboardActionRow } from "./clipboardActionRow";
import { CheckIcon, ShareIcon, SpinnerIcon } from "./uiIcons";
import { useClipboardCopy } from "./useClipboardCopy";

type Props = {
  title?: string;
  text: string;
  /** Labeled decision bullets ("Do now: …", "Pause if: …") appended below the operating call. */
  lines?: string[];
  url?: string;
  className?: string;
  /** Icon-only when false; the name still reaches assistive tech through `aria-label`. */
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
    const formattedSlackBrief = `*${title}*\n> *Guidance:* ${text}${bulletBlock}\n\n*Full brief:* ${url || "https://whether.work"}`;
    void copyToClipboard(formattedSlackBrief, "share-brief");
  }, [title, text, lines, url, copyToClipboard]);

  /* The shared row, so this button and the slide button beside it are one
     control drawn twice. It used to carry its own sky-tinted class chain, and
     the hero's action row showed three button styles for three actions. */
  return (
    <ClipboardActionRow
      compact
      className={className}
      label={showLabel ? label : <span className="sr-only">{label}</span>}
      state={status}
      onClick={handleClick}
      leadingIcon={<ShareIcon className={didFail ? "size-4 text-amber-300" : "size-4"} />}
      stateIcons={{
        copying: <SpinnerIcon className="size-4" />,
        copied: <CheckIcon className="size-4 text-emerald-300" />,
      }}
      buttonLabels={{
        copied: showLabel ? copiedLabel : <span className="sr-only">{copiedLabel}</span>,
        error: showLabel ? <span className="text-amber-300">Copy failed</span> : <span className="sr-only">Copy failed</span>,
      }}
      buttonProps={{
        title: `${label} — copies to the clipboard, or shares if the browser offers it`,
        "aria-label": label,
        "data-premium-intent": "export_brief",
        "data-premium-cta": "share_brief_button",
        // The `C` shortcut and the command palette target this id. It moved here
        // when the separate Slack copy button was retired; this button produces
        // the same Slack block.
        "data-testid": "copy-slack-brief-button",
      }}
      showStatus
      statusClassName="sr-only"
      statusMessages={{
        copied: `${copiedLabel}.`,
        error: "Copy failed. Select the brief text to copy it manually.",
      }}
    />
  );
}
