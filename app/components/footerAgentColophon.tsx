"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useClipboardCopy } from "./useClipboardCopy";
import { siteUrl } from "../../lib/siteUrl";

/* The full origin, not the bare host: `curl whether.work` speaks HTTP, and the
   redirect it meets prints a 301 body rather than the Markdown. */
const MARKDOWN_REQUEST = `curl -H "Accept: text/markdown" ${siteUrl}`;

/**
 * The footer's one line for an agent, beside the shortcuts key. The homepage
 * answers this request with `/brief.md` (`agentResponse.ts`), and `/api-docs`
 * carries the MCP server; both were reachable only from `/share` before
 * (2026-11-21). Hidden where there is no hover, like the shortcuts key: a phone
 * has no shell to paste a curl command into.
 *
 * The status bubble stays mounted and empty at rest (faded via `opacity`, never
 * `display: none` or `visibility: hidden`) so screen readers never read a stale
 * "Copied" in browse mode and reliably announce both success and failure on click,
 * including consecutive copies in VoiceOver via a trailing non-breaking space.
 */
export function FooterAgentColophon() {
  /* `null`: a developer command, not a copy of the guidance, so it is not an
     activation commitment. The hook requires the caller to say so. */
  const { copyToClipboard, copiedTarget } = useClipboardCopy({ commitment: null });
  const copied = copiedTarget === "markdown-request";
  const [feedback, setFeedback] = useState<{ kind: "copied" | "failed"; text: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageRef = useRef("");

  const clearFeedbackTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearFeedbackTimer, [clearFeedbackTimer]);

  const announce = useCallback(
    (ok: boolean) => {
      clearFeedbackTimer();
      let message = ok ? "Copied" : "Copy failed";
      if (message === lastMessageRef.current) message += "\u00A0";
      lastMessageRef.current = message;
      setFeedback(null);
      window.requestAnimationFrame(() => {
        setFeedback({ kind: ok ? "copied" : "failed", text: message });
      });
      timerRef.current = setTimeout(() => {
        setFeedback(null);
      }, 2000);
    },
    [clearFeedbackTimer],
  );

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(MARKDOWN_REQUEST, "markdown-request");
    announce(ok);
  }, [announce, copyToClipboard]);

  const showCopiedIcon = copied || feedback?.kind === "copied";
  const visible = feedback !== null;

  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-fluid-nano text-[var(--footer-legal)] [@media(hover:none)]:hidden">
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        data-copied={showCopiedIcon ? "" : undefined}
        data-failed={feedback?.kind === "failed" ? "" : undefined}
        title="Copy this request: the homepage answers with Markdown for an agent"
        className="weather-focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 font-mono transition-colors hover:text-[var(--footer-legal-hover)]"
      >
        {showCopiedIcon ? (
          <Check aria-hidden="true" size={12} strokeWidth={2.2} className="shrink-0" />
        ) : (
          <Copy aria-hidden="true" size={12} strokeWidth={1.8} className="shrink-0 opacity-75" />
        )}
        <span>{MARKDOWN_REQUEST}</span>
      </button>
      <output
        aria-live="polite"
        className="footer-copy-status"
        data-visible={visible ? "true" : "false"}
      >
        {feedback?.text ?? ""}
      </output>
      <Link
        href="/api-docs"
        className="weather-list-link no-underline transition-colors hover:text-[var(--footer-legal-hover)]"
      >
        API &amp; MCP
      </Link>
    </p>
  );
}
