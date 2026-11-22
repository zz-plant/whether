"use client";

import Link from "next/link";
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
 */
export function FooterAgentColophon() {
  /* `null`: a developer command, not a copy of the guidance, so it is not an
     activation commitment. The hook requires the caller to say so. */
  const { copyToClipboard, copiedTarget } = useClipboardCopy({ commitment: null });
  const copied = copiedTarget === "markdown-request";
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-fluid-nano text-[var(--footer-legal)] [@media(hover:none)]:hidden">
      <button
        type="button"
        onClick={() => {
          void copyToClipboard(MARKDOWN_REQUEST, "markdown-request");
        }}
        title="Copy this request: the homepage answers with Markdown for an agent"
        className="weather-focus-ring inline-flex min-h-11 items-center rounded-lg px-1 font-mono transition-colors hover:text-[var(--footer-legal-hover)]"
      >
        {MARKDOWN_REQUEST}
      </button>
      <output aria-live="polite" className="footer-copy-status" data-visible={copied}>
        Copied
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
