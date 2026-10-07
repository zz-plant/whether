import { Fragment } from "react";
import {
  parseSlackMrkdwn,
  slackMrkdwnHasFormatting,
  type SlackBlock,
  type SlackInline,
} from "../../lib/export/slackMrkdwn";

/*
 * A chat format drawn the way the channel will draw it: bold where the text has
 * `*…*`, a bar beside `>` lines, URLs as links. The copy button beside it still
 * copies the text itself; this only changes what the reader looks at before
 * copying. Every node is built from `parseSlackMrkdwn`'s data, so no part of
 * the text is ever handed to the DOM as markup.
 */

const InlineRun = ({ inline }: { inline: SlackInline }) => {
  if (inline.kind === "link") {
    return (
      <a
        href={inline.href}
        target="_blank"
        rel="noreferrer"
        className="break-all text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:text-sky-200"
      >
        {inline.href}
      </a>
    );
  }
  if (inline.kind === "bold") return <strong className="font-semibold text-slate-100">{inline.text}</strong>;
  if (inline.kind === "italic") return <em>{inline.text}</em>;
  return <>{inline.text}</>;
};

/* Lines keep their breaks through `whitespace-pre-wrap` on the frame, so a
   blank line in the text is a blank line here, as it is in the channel. */
const Block = ({ block }: { block: SlackBlock }) => (
  <div className={block.quote ? "border-l-4 border-[color:var(--border-strong)] pl-3" : undefined}>
    {block.lines.map((line, lineIndex) => (
      <Fragment key={lineIndex}>
        {lineIndex > 0 ? "\n" : null}
        {line.map((inline, inlineIndex) => (
          <InlineRun key={inlineIndex} inline={inline} />
        ))}
      </Fragment>
    ))}
  </div>
);

/**
 * The preview for `/share`'s chat formats, in the frame `BriefPreview` draws
 * for the others. When the drawing differs from the text — a quote bar, bold —
 * the text that copies is one tap away under it, so a reader can see both what
 * lands in the composer and what the channel shows.
 */
export function ChatPreview({ label, text }: { label: string; text: string }) {
  const blocks = parseSlackMrkdwn(text);
  return (
    <figure className="overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/80">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-800/60 bg-slate-900/60 px-3 py-1.5 text-fluid-nano text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400/80" aria-hidden="true" />
          {label} · how it reads in Slack
        </span>
        <span className="text-slate-500 tabular-nums">Ready to paste</span>
      </figcaption>
      <div className="whitespace-pre-wrap break-words p-3 text-sm leading-6 text-slate-300" data-chat-preview>
        {blocks.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </div>
      {slackMrkdwnHasFormatting(blocks) ? (
        <details className="weather-auto-chevron border-t border-slate-800/60">
          <summary className="px-3 text-xs text-slate-400 hover:text-slate-200">Show the text that copies</summary>
          <pre
            aria-label={`Text of ${label}`}
            className="whitespace-pre-wrap break-words px-3 pb-3 text-fluid-xs leading-5 text-slate-300"
          >
            {text}
          </pre>
        </details>
      ) : null}
    </figure>
  );
}
