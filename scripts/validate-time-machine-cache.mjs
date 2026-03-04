import cache from "../data/time_machine_cache.json" with { type: "json" };

const MIN_MONTHS = Number.parseInt(process.env.TIME_MACHINE_MIN_MONTHS ?? "24", 10);
const MAX_STALENESS_DAYS = Number.parseInt(
  process.env.TIME_MACHINE_MAX_STALENESS_DAYS ?? "62",
  10,
);
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const YIELD_KEYS = ["oneMonth", "threeMonth", "twoYear", "tenYear"];
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteOrNull = (value) => value === null || (typeof value === "number" && Number.isFinite(value));
const isValidDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));

const asCacheArray = Array.isArray(cache) ? cache : [];
const errors = [];

asCacheArray.forEach((snapshot, index) => {
  if (!isObject(snapshot)) {
    errors.push(`entry[${index}] is not an object`);
    return;
  }

  if (!Number.isInteger(snapshot.year)) {
    errors.push(`entry[${index}] has invalid year`);
  }
  if (!Number.isInteger(snapshot.month) || snapshot.month < 1 || snapshot.month > 12) {
    errors.push(`entry[${index}] has invalid month`);
  }
  if (typeof snapshot.source !== "string") {
    errors.push(`entry[${index}] has invalid source`);
  }
  if (!isValidDate(snapshot.record_date)) {
    errors.push(`entry[${index}] has invalid record_date`);
  }
  if (!isValidDate(snapshot.fetched_at)) {
    errors.push(`entry[${index}] has invalid fetched_at`);
  }
  if (typeof snapshot.isLive !== "boolean") {
    errors.push(`entry[${index}] has invalid isLive`);
  }

  if (!isObject(snapshot.yields)) {
    errors.push(`entry[${index}] has invalid yields object`);
  } else {
    YIELD_KEYS.forEach((key) => {
      if (!isFiniteOrNull(snapshot.yields[key])) {
        errors.push(`entry[${index}] yields.${key} is invalid`);
      }
    });
  }
});

if (errors.length > 0) {
  console.error(
    `[validate-time-machine-cache] Validation failed (${errors.length} error(s)).`,
  );
  console.error(errors.slice(0, 20).join("\n"));
  process.exit(1);
}

if (asCacheArray.length < MIN_MONTHS) {
  console.error(
    `[validate-time-machine-cache] Expected at least ${MIN_MONTHS} monthly snapshots, found ${asCacheArray.length}.`,
  );
  process.exit(1);
}

const sorted = [...asCacheArray].sort(
  (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime(),
);
const latest = sorted.at(-1);
if (!latest) {
  console.error("[validate-time-machine-cache] Cache is empty.");
  process.exit(1);
}

const latestTime = new Date(latest.record_date).getTime();
if (!Number.isFinite(latestTime)) {
  console.error("[validate-time-machine-cache] Latest record_date is invalid.");
  process.exit(1);
}

const stalenessDays = Math.floor((Date.now() - latestTime) / MS_PER_DAY);
if (stalenessDays > MAX_STALENESS_DAYS) {
  console.error(
    `[validate-time-machine-cache] Latest snapshot is ${stalenessDays} days old (max ${MAX_STALENESS_DAYS}).`,
  );
  process.exit(1);
}

const duplicateYearMonths = new Set();
const yearMonths = new Set();
for (const snapshot of asCacheArray) {
  const key = `${snapshot.year}-${snapshot.month}`;
  if (yearMonths.has(key)) {
    duplicateYearMonths.add(key);
  } else {
    yearMonths.add(key);
  }
}

if (duplicateYearMonths.size > 0) {
  console.error(
    `[validate-time-machine-cache] Duplicate year-month entries found (${duplicateYearMonths.size}).`,
  );
  console.error([...duplicateYearMonths].slice(0, 10).join("\n"));
  process.exit(1);
}

console.log("[validate-time-machine-cache] OK");
console.log(
  JSON.stringify(
    {
      total: asCacheArray.length,
      earliest: sorted[0]?.record_date ?? null,
      latest: latest.record_date,
      stalenessDays,
      minMonthsRequirement: MIN_MONTHS,
      maxStalenessDays: MAX_STALENESS_DAYS,
    },
    null,
    2,
  ),
);
