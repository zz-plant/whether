"use client";

import { useHydrated } from "./browserSource";
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
  const { status, copyToClipboard } = useClipboardCopy({ commitment: "copied_slack" });
  const didFail = status === "error";
  const bulletBlock = lines && lines.length > 0 ? `\n\n${lines.map((line) => `• ${line}`).join("\n")}` : "";
  const payload = { title, text: `${text}${bulletBlock}`, url };
  /*
   * The share sheet on a touch screen only, and named for what it does (2026-10-27).
   * The button said "Copy Brief" and opened the share sheet wherever the browser had
   * one, desktop Safari and Chrome included, so a desktop reader (and the `C`
   * shortcut) got a system menu instead of the Slack block. Hydrated first: the
   * server cannot know, so it renders the copy button.
   */
  const hydrated = useHydrated();
  const offersShare =
    hydrated &&
    typeof navigator.canShare === "function" &&
    window.matchMedia("(pointer: coarse)").matches &&
    navigator.canShare(payload);
  const actionLabel = offersShare ? "Share Brief" : label;

  const handleClick = () => {
    // `title` names the artifact, so the pasted block has to use it. Hardcoding the
    // weekly heading here meant a monthly or quarterly call arrived in Slack labelled
    // "Whether Weekly Brief" — the wrong horizon on a message people act on.
    const formattedSlackBrief = `*${title}*\n> *Guidance:* ${payload.text}\n\n*Full brief:* ${url || "https://whether.work"}`;
    if (offersShare) {
      /* Closing the sheet is a choice, not a failure. Any other refusal (no user
         gesture left, a share target that errored) falls back to the copy, which
         reports its own outcome. */
      navigator.share(payload).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        void copyToClipboard(formattedSlackBrief, "share-brief");
      });
      return;
    }
    void copyToClipboard(formattedSlackBrief, "share-brief");
  };

  /* The shared row, so this button and the slide button beside it are one
     control drawn twice. It used to carry its own sky-tinted class chain, and
     the hero's action row showed three button styles for three actions. */
  return (
    <ClipboardActionRow
      compact
      buttonVariant="primary"
      className={className}
      label={showLabel ? actionLabel : <span className="sr-only">{actionLabel}</span>}
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
        title: offersShare ? "Share Brief — opens your device's share sheet" : `${label} — copies the brief for Slack`,
        "aria-label": actionLabel,
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
