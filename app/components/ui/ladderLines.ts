/*
 * The lines a score ladder draws, as data. Split from `scoreLadder.tsx` on 2026-11-10:
 * that module is a client component, and /history/compare builds its lines on the
 * server, where a client module's export is a reference rather than the function. The
 * page threw "Unexpectedly client reference export 'buildLadderLines' is called on
 * server" and rendered no comparison from 2026-11-07.
 */
export type LadderLineKind = "pause" | "resume" | "callChange";

export type LadderLine = {
  kind: LadderLineKind;
  value: number;
  /** Overrides the default label for the kind. */
  label?: string;
};

/**
 * The three lines as a ladder takes them, from the numbers a surface has. The
 * pause and restart lines come from a rule's rails (`buildSharedCorridorRails`)
 * and are absent when the rule states none; the call-change line is the
 * threshold in force and is always drawn.
 */
export const buildLadderLines = ({
  pause,
  resume,
  callChange,
}: {
  pause?: number;
  resume?: number;
  callChange: number;
}): LadderLine[] => [
  ...(typeof pause === "number" ? [{ kind: "pause" as const, value: pause }] : []),
  ...(typeof resume === "number" ? [{ kind: "resume" as const, value: resume }] : []),
  { kind: "callChange" as const, value: callChange },
];
