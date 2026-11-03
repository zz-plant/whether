import { sendTelemetry } from "./telemetry/sendTelemetry";

/**
 * A click that did nothing, on something that looked as if it would (2026-11-03).
 *
 * The 2026-11-03 dead-click pass predicted where readers press and get no response — a
 * coloured month in the record's strip, the conditions map, a status stamp — from how
 * the page looks, with no measurement to say whether they do. This is the measurement:
 * one event per such click, so the prediction can be checked and the next one found.
 *
 * What it carries is the page, the section and the kind of element, and nothing a
 * reader typed or read: no text, no position on the screen, no query string. A click on
 * plain prose or the page's background is not sent unless it is one of a rapid burst on
 * the same spot, which is the other sign of a reader expecting a response.
 */
const DEAD_CLICK_KINDS = ["chart", "stamp", "glyph", "hover-title", "heading", "table-cell", "other"] as const;
export type DeadClickKind = (typeof DEAD_CLICK_KINDS)[number];

type DeadClickPointer = "mouse" | "touch" | "pen";

type DeadClickEvent = {
  type: "dead_click";
  /** The page's path, without its query or hash. */
  path: string;
  /** The nearest section's id (`data-page-section`, or a `<section>`'s id); "" when none. */
  section: string;
  kind: DeadClickKind;
  /** One of three or more clicks within a second on the same spot. */
  rage: boolean;
  pointer: DeadClickPointer;
};

const DEAD_CLICK_TELEMETRY_ENDPOINT = "/api/telemetry/dead-click";

const EVENT_KEYS = new Set(["type", "path", "section", "kind", "rage", "pointer"]);

const isDeadClickKind = (value: unknown): value is DeadClickKind =>
  typeof value === "string" && DEAD_CLICK_KINDS.some((kind) => kind === value);

/* Strict, as the search and content validators are: a key beyond these is refused rather
   than stored, so the stream cannot start carrying more than `/privacy` says it does. */
export const isDeadClickEvent = (input: unknown): input is DeadClickEvent => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const entries = Object.entries(input);
  if (entries.length !== EVENT_KEYS.size || entries.some(([key]) => !EVENT_KEYS.has(key))) return false;
  const payload: Record<string, unknown> = Object.fromEntries(entries);
  return (
    payload.type === "dead_click" &&
    typeof payload.path === "string" &&
    /^\/[\w\-/.]{0,200}$/.test(payload.path) &&
    typeof payload.section === "string" &&
    /^[a-z0-9-]{0,64}$/.test(payload.section) &&
    isDeadClickKind(payload.kind) &&
    typeof payload.rage === "boolean" &&
    (payload.pointer === "mouse" || payload.pointer === "touch" || payload.pointer === "pen")
  );
};

export const trackDeadClick = (event: DeadClickEvent) => {
  sendTelemetry(DEAD_CLICK_TELEMETRY_ENDPOINT, event);
};
