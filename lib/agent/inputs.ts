import { z } from "zod";
import type { LifecycleStage } from "../decisionShield";
import type { SignalKey } from "../ingestion/types";
import type { RegimeKey } from "../regimeEngineCore";
import { REGIME_LABELS } from "../regimePresentation";
import { labelChoices } from "./registry";

/**
 * What an agent may pass a tool, and what it is told when it passes something else.
 *
 * The tools took a regime as free text and answered an unknown one with a success:
 * `get_context` with "SUNNY", the word the page itself prints for EXPANSION, came back as
 * zero weeks active and no history, which reads as a finding. A cadence the server did not
 * know quietly became weekly. And every refusal said what was missing without saying what
 * was allowed, so the only way to learn the vocabulary was to guess.
 *
 * So the vocabulary lives here once, in the words a caller may plausibly send (the engine
 * key or the word the site prints, in any case), and every refusal carries the values that
 * would have been accepted. What is accepted is wider than what is returned: outputs stay on
 * the keys.
 */

export const REGIME_KEYS = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const satisfies readonly RegimeKey[];

export const SIGNAL_KEYS = [
  "TREASURY_1M",
  "TREASURY_3M",
  "TREASURY_2Y",
  "TREASURY_10Y",
  "BBB_CREDIT_SPREAD",
  "HY_CREDIT_SPREAD",
  "CPI_YOY",
  "UNEMPLOYMENT_RATE",
  "CHICAGO_FCI",
  "VIX_INDEX",
] as const satisfies readonly SignalKey[];

const LIFECYCLE_STAGES = ["DISCOVERY", "GROWTH", "SCALE", "MATURE"] as const satisfies readonly LifecycleStage[];

const upperCased = (value: unknown) => (typeof value === "string" ? value.trim().toUpperCase() : value);

/**
 * A regime by its engine key ("EXPANSION") or by the word the site prints for it ("Sunny"), in
 * any case. A refusal lists each key with its word, "SCARCITY (Freezing)", so a caller who only
 * knows the page's word finds it.
 */
export const regimeInput = labelChoices(
  z.preprocess((value) => {
    const wanted = upperCased(value);
    return REGIME_KEYS.find((key) => key === wanted || REGIME_LABELS[key].toUpperCase() === wanted) ?? value;
  }, z.enum(REGIME_KEYS)),
  (choice) => {
    const key = REGIME_KEYS.find((candidate) => candidate === choice);
    return key ? `${key} (${REGIME_LABELS[key]})` : choice;
  },
);

export const signalKeyInput = z.preprocess(upperCased, z.enum(SIGNAL_KEYS));

export const lifecycleInput = z.preprocess(upperCased, z.enum(LIFECYCLE_STAGES));

export const lowerCasedInput = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);

/**
 * A finite number, sent as a number or as text (a query parameter is always text). Zero is a
 * value: the plain-GET shim tested the parsed number for truth and refused `riskAppetite=0`.
 */
export const numberInput = z.preprocess((value) => (typeof value === "string" ? Number(value.trim()) : value), z.number());

export const textInput = z.string().min(1);
