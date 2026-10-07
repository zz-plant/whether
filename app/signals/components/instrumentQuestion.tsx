/**
 * A "Deeper evidence" summary: the question, then its answer this week in the
 * quieter weight, so a closed row says what is behind it and what it found
 * (ui-ux-standards §XII). The answers come from
 * `lib/report/evidenceInstrumentSummaries.ts`, built from the values the panel
 * under the summary draws. A question with no answer to give prints alone.
 */
export const InstrumentQuestion = ({ question, answer }: { question: string; answer?: string | null }) => (
  <span>
    {question}
    {answer ? (
      <>
        {" "}
        <span className="font-normal text-slate-400" data-instrument-answer>
          {answer}
        </span>
      </>
    ) : null}
  </span>
);
