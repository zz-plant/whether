/**
 * =WHETHER(key, [score]): Whether's current reading in a Google Sheets cell.
 *
 * Paste this whole file into Extensions > Apps Script and save. Setup, the key list and
 * examples: docs/developer/spreadsheets/README.md. tests/spreadsheetFunction.test.ts runs
 * this file, unchanged, against the state the endpoint builds, so a key cannot point at a
 * field the payload does not have.
 *
 * It reads GET https://whether.work/api/agent?view=state: public, no key, no sign-in.
 * Nothing from the sheet is sent; the request carries no argument.
 */

const WHETHER_STATE_URL = "https://whether.work/api/agent?view=state";
const WHETHER_SCRIPT_URL = "https://github.com/zz-plant/whether/blob/main/docs/developer/spreadsheets/whether.gs";
const WHETHER_STATE_VERSION = "v1";
const WHETHER_CACHE_KEY = "whether-state-v1";
/* The state changes once a week (Mondays 14:00 UTC); an hour keeps a sheet with many cells to one fetch. */
const WHETHER_CACHE_SECONDS = 3600;

/* Each key and the payload field it reads. `{score}` is filled from the second argument. */
const WHETHER_KEYS_ = {
  regime: "conditions.key",
  conditions: "conditions.label",
  headline: "headline",
  guidance: "guidance.call",
  do_now: "guidance.doNow",
  avoid_now: "guidance.avoidNow",
  flip_conditions: "guidance.flipConditions",
  confidence: "confidence.label",
  confidence_percent: "confidence.percent",
  record_date: "recordDate",
  next_call_due: "freshness.nextCallDue",
  automation_ready: "automation.ready",
  automation_refusal: "automation.refusal",
  direction: "change.direction",
  regime_changed: "change.regimeChanged",
  change_summary: "change.summary",
  tightness: "scores.tightness.value",
  risk_appetite: "scores.riskAppetite.value",
  score: "scores.{score}.value",
  pause_line: "scores.{score}.pause.line",
  pause_met: "scores.{score}.pause.met",
  resume_line: "scores.{score}.resume.line",
  resume_met: "scores.{score}.resume.met",
  change_line: "scores.{score}.change.line",
  delta: "scores.{score}.delta",
  per_week: "scores.{score}.perWeek",
};

/* The second argument, by the payload's name or the name the site prints. */
const WHETHER_SCORES_ = {
  tightness: "tightness",
  fundingpressure: "tightness",
  riskappetite: "riskAppetite",
};

const whetherNormalize_ = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

const whetherIsBlank_ = (value) => value === undefined || value === null || value === "";

/**
 * Whether's current reading: a score, a line, the conditions or the guidance.
 *
 * @param {string} key What to read, e.g. "regime", "tightness" or "pause_line". A payload path such as "scores.tightness.pause.line" also works.
 * @param {string} score For a per-score key: "tightness" (funding pressure) or "risk_appetite".
 * @return The value; a list fills the cells below.
 * @customfunction
 */
function WHETHER(key, score) {
  return whetherValue_(whetherState_(), key, score);
}

/** Reads one key or payload path from a state object. Kept apart from the fetch so it can be tested. */
function whetherValue_(state, key, score) {
  if (whetherIsBlank_(key)) throw new Error(`Name a key, e.g. =WHETHER("regime"). Keys: ${Object.keys(WHETHER_KEYS_).join(", ")}.`);
  const keyText = String(key).trim();
  let path;
  if (keyText.includes(".")) {
    path = keyText;
  } else {
    const match = Object.keys(WHETHER_KEYS_).find((name) => whetherNormalize_(name) === whetherNormalize_(keyText));
    if (!match) throw new Error(`Unknown key "${keyText}". Keys: ${Object.keys(WHETHER_KEYS_).join(", ")}.`);
    path = WHETHER_KEYS_[match];
  }
  if (path.includes("{score}")) {
    if (whetherIsBlank_(score)) throw new Error(`"${keyText}" needs a score: tightness or risk_appetite.`);
    const scoreKey = WHETHER_SCORES_[whetherNormalize_(score)];
    if (!scoreKey) {
      throw new Error(`Unknown score "${score}". Use tightness or risk_appetite: each score has one pause, restart and change line, shared by every area.`);
    }
    path = path.replace("{score}", scoreKey);
  } else if (!whetherIsBlank_(score)) {
    throw new Error(`"${keyText}" takes no second argument.`);
  }
  return whetherCell_(whetherRead_(state, path), keyText);
}

/* Walks the payload. A field the payload holds as null (no pause line this week) reads blank; a field it does not have is an error. */
function whetherRead_(state, path) {
  let current = state;
  for (const segment of path.split(".")) {
    if (current === null) return null;
    if (typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, segment)) {
      throw new Error(`Whether's state has no field "${path}".`);
    }
    current = current[segment];
  }
  return current;
}

/* One value per cell; a list of values fills a column; an empty list or a null reads blank. */
function whetherCell_(value, keyText) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    if (value.some((item) => item !== null && typeof item === "object")) {
      throw new Error(`"${keyText}" is a list of records; name one field inside an item, e.g. "${keyText}.0".`);
    }
    return value.length === 0 ? "" : value.map((item) => [item === null ? "" : item]);
  }
  if (typeof value === "object") throw new Error(`"${keyText}" is a record; name one of its fields: ${Object.keys(value).join(", ")}.`);
  return value;
}

function whetherState_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(WHETHER_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  const response = UrlFetchApp.fetch(WHETHER_STATE_URL, { muteHttpExceptions: true, headers: { Accept: "application/json" } });
  const status = response.getResponseCode();
  if (status !== 200) throw new Error(`Whether answered HTTP ${status}. Try again later.`);
  const text = response.getContentText();
  const state = JSON.parse(text);
  if (state.version !== WHETHER_STATE_VERSION) {
    throw new Error(`Whether's state is version ${state.version}; this script reads ${WHETHER_STATE_VERSION}. Get the current script: ${WHETHER_SCRIPT_URL}`);
  }
  cache.put(WHETHER_CACHE_KEY, text, WHETHER_CACHE_SECONDS);
  return state;
}
