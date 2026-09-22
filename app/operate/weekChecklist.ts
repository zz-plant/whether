import { STORAGE_KEYS } from "../../lib/storage/keys";

/**
 * Which steps of the weekly plan this browser has ticked off, and for which week.
 *
 * The plan page is the one place the reader acts, and nothing recorded what
 * had been done: six steps, every visit, all of them looking equally undone.
 * The record is keyed by the reading's week-ending date (`weeklyRecordDate`)
 * rather than cleared on a timer, so a new week starts clean by construction
 * and a mid-week return finds the ticks where they were left. Not the daily
 * record date: Treasury publishes a row every business day, so a key on that
 * reset the list each morning. Pure, so the two rules that matter —
 * a tick belongs to one week, and a different week reads as nothing done —
 * are pinned without a DOM.
 */
export type WeekChecklist = {
  recordDate: string;
  done: string[];
};

export const WEEK_CHECKLIST_STORAGE_KEY = STORAGE_KEYS.weekChecklist;

/** Module constant on purpose: the storage hook needs a referentially stable fallback. */
export const EMPTY_WEEK_CHECKLIST: WeekChecklist = { recordDate: "", done: [] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWeekChecklist = (value: unknown): value is WeekChecklist =>
  isRecord(value)
  && typeof value.recordDate === "string"
  && Array.isArray(value.done)
  && value.done.every((entry) => typeof entry === "string");

/** The steps done this week. A record for any other week reads as nothing done. */
export const doneStepsForWeek = (stored: unknown, recordDate: string): string[] =>
  isWeekChecklist(stored) && stored.recordDate === recordDate ? stored.done : [];

/** Toggle one step for this week. A record for another week is replaced, not merged. */
export const toggleWeekStep = (stored: unknown, recordDate: string, stepId: string): WeekChecklist => {
  const done = doneStepsForWeek(stored, recordDate);
  return {
    recordDate,
    done: done.includes(stepId) ? done.filter((id) => id !== stepId) : [...done, stepId],
  };
};
