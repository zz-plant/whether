/**
 * Pure functions for the eval scripts — no Ollama, no server, no I/O.
 *
 * Extracted so a test can verify the extraction, normalization and date
 * formatting without a model or a running app (2026-10-22). The eval script
 * imports from here; the I/O (server detection, Ollama calls) stays in the
 * scripts themselves.
 */
import { z } from "zod";

/** The state's ISO date, in the words the page prints it in ("Oct 20, 2026"). */
export const pageDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

/** Normalizes text for objective comparison: straight quotes, lowercase, single spaces. */
export const normalize = (text: string) =>
  text
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

/** The rendered text a visitor reads: chrome and all, because that is what they see. */
export const pageTextOf = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const agentStateSchema = z.object({
  recordDate: z.string(),
  headline: z.string(),
  conditions: z.object({
    key: z.string(),
    label: z.string(),
  }),
  scores: z.object({
    tightness: z.object({
      value: z.number(),
      pause: z.object({ line: z.number() }).nullable().optional(),
    }),
    riskAppetite: z.object({
      value: z.number(),
      pause: z.object({ line: z.number() }).nullable().optional(),
    }),
  }),
});

export type AgentState = z.infer<typeof agentStateSchema>;
