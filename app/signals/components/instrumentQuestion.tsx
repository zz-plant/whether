import type { ReactNode } from "react";

/**
 * A "Deeper evidence" summary: the question, then its answer this week in the
 * quieter weight, so a closed row says what is behind it and what it found
 * (ui-ux-standards §XII). The answers come from
 * `lib/report/evidenceInstrumentSummaries.ts`, built from the values the panel
 * under the summary draws. A question with no answer to give prints alone.
 *
 * `preview` draws the answer at text height beside it (`instrumentPreviews.tsx`),
 * from the same values the sentence is built from, so a closed row shows its
 * finding before it is opened. It is a picture of the sentence and nothing
 * more: hidden from assistive tech, which reads the sentence, and holding no
 * link or control, because a link inside a `<summary>` is a control inside a
 * control. The marks a reader can point at and open are in the panel.
 */
export const InstrumentQuestion = ({
  question,
  answer,
  preview,
}: {
  question: string;
  answer?: string | null;
  preview?: ReactNode;
}) => {
  const text = (
    <>
      {question}
      {answer ? (
        <>
          {" "}
          <span className="font-normal text-slate-400" data-instrument-answer>
            {answer}
          </span>
        </>
      ) : null}
    </>
  );
  if (!preview) return <span>{text}</span>;
  /* A cluster (§XXIX): the words take the room, and the picture sits beside
     them where it fits and drops under them where it does not. */
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
      <span className="min-w-0 grow-[999] basis-72">{text}</span>
      <span aria-hidden="true" className="flex shrink-0 items-center gap-2" data-instrument-preview>
        {preview}
      </span>
    </span>
  );
};
