import archive from "../data/summary_archive.json" with { type: "json" };
const VALID_CADENCES = new Set(["weekly", "monthly", "quarterly", "yearly"]);
const VALID_REGIMES = new Set(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]);

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isValidDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const isFiniteOrNull = (value) => value === null || (typeof value === "number" && Number.isFinite(value));

const asArchiveArray = Array.isArray(archive) ? archive : [];
const errors = [];

asArchiveArray.forEach((entry, index) => {
  if (!isObject(entry)) {
    errors.push(`entry[${index}] is not an object`);
    return;
  }

  const cadence = entry.cadence;
  if (!VALID_CADENCES.has(cadence)) {
    errors.push(`entry[${index}] has invalid cadence: ${String(cadence)}`);
    return;
  }

  if (!Number.isInteger(entry.year)) {
    errors.push(`entry[${index}] has invalid year`);
  }
  if (!isValidDate(entry.asOf)) {
    errors.push(`entry[${index}] has invalid asOf`);
  }
  if (!isValidDate(entry.record_date)) {
    errors.push(`entry[${index}] has invalid record_date`);
  }

  if (cadence === "weekly" && !Number.isInteger(entry.week)) {
    errors.push(`entry[${index}] weekly cadence missing integer week`);
  }
  if (
    cadence === "monthly" &&
    (!Number.isInteger(entry.month) || entry.month < 1 || entry.month > 12)
  ) {
    errors.push(`entry[${index}] monthly cadence missing valid month`);
  }
  if (
    cadence === "quarterly" &&
    (!Number.isInteger(entry.quarter) || entry.quarter < 1 || entry.quarter > 4)
  ) {
    errors.push(`entry[${index}] quarterly cadence missing valid quarter`);
  }

  if (!isObject(entry.summary)) {
    errors.push(`entry[${index}] missing summary object`);
    return;
  }

  if (typeof entry.summary.title !== "string") {
    errors.push(`entry[${index}] summary.title missing`);
  }
  if (typeof entry.summary.summary !== "string") {
    errors.push(`entry[${index}] summary.summary missing`);
  }
  if (!VALID_REGIMES.has(entry.summary.regime)) {
    errors.push(`entry[${index}] summary.regime invalid`);
  }
  if (!Array.isArray(entry.summary.constraints)) {
    errors.push(`entry[${index}] summary.constraints invalid`);
  }
  if (!isObject(entry.summary.provenance)) {
    errors.push(`entry[${index}] summary.provenance missing`);
  }
  if (!Array.isArray(entry.summary.inputs)) {
    errors.push(`entry[${index}] summary.inputs invalid`);
  } else {
    entry.summary.inputs.forEach((input, inputIndex) => {
      if (!isObject(input)) {
        errors.push(`entry[${index}] summary.inputs[${inputIndex}] invalid`);
        return;
      }
      if (!["base-rate", "two-year", "ten-year", "curve-slope"].includes(input.id)) {
        errors.push(`entry[${index}] summary.inputs[${inputIndex}] invalid id`);
      }
      if (!isFiniteOrNull(input.value)) {
        errors.push(`entry[${index}] summary.inputs[${inputIndex}] invalid value`);
      }
    });
  }
});

if (errors.length > 0) {
  console.error(
    `[validate-summary-archive] Validation failed (${errors.length} error(s)).`,
  );
  console.error(errors.slice(0, 20).join("\n"));
  process.exit(1);
}

const cadenceCounts = asArchiveArray.reduce(
  (counts, entry) => {
    counts[entry.cadence] += 1;
    return counts;
  },
  { weekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
);

const duplicateKeys = new Set();
const seenKeys = new Set();
asArchiveArray.forEach((entry) => {
  let key = `${entry.cadence}:${entry.year}`;
  if (entry.cadence === "weekly") {
    key += `:${entry.week}`;
  } else if (entry.cadence === "monthly") {
    key += `:${entry.month}`;
  } else if (entry.cadence === "quarterly") {
    key += `:${entry.quarter}`;
  }

  if (seenKeys.has(key)) {
    duplicateKeys.add(key);
  } else {
    seenKeys.add(key);
  }
});

if (duplicateKeys.size > 0) {
  console.error(
    `[validate-summary-archive] Duplicate cadence keys found (${duplicateKeys.size}).`,
  );
  console.error([...duplicateKeys].slice(0, 10).join("\n"));
  process.exit(1);
}

console.log("[validate-summary-archive] OK");
console.log(
  JSON.stringify(
    {
      total: asArchiveArray.length,
      cadenceCounts,
    },
    null,
    2,
  ),
);
