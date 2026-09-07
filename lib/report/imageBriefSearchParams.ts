import type { HomePageSearchParams } from "./homeMetadata";
import type { CompanyStage, OperatorContext } from "./operatorContext";
import { parseOperatorStageParam } from "./operatorStage";
import type { SectorKey } from "./sectorSensitivity";

const VALID_CADENCES = new Set(["weekly", "monthly", "quarterly", "yearly"]);
const VALID_SECTORS = new Set<SectorKey>([
  "b2b-saas",
  "consumer",
  "infrastructure",
  "fintech",
  "healthcare",
  "ai-platforms",
]);
const VALID_INTERPRETATION_VIEWS = new Set(["default", "operator", "forecast", "sector"]);

const MAX_CONTEXT_VALUE_LENGTH = 48;

const SUPPORTED_IMAGE_BRIEF_PARAM_KEYS = [
  "month",
  "year",
  "sector",
  "view",
  "cadence",
  "stage",
  "companyStage",
  "ticker",
  "company",
] as const;

export type ImageBriefSearchParamKey = typeof SUPPORTED_IMAGE_BRIEF_PARAM_KEYS[number];

export type SearchParamReader = {
  get(name: string): string | null;
};

export type ImageBriefRequestContext = {
  searchParams?: HomePageSearchParams;
  operatorContext?: OperatorContext;
};

const readTrimmed = (source: SearchParamReader, key: ImageBriefSearchParamKey) => {
  const value = source.get(key)?.trim();
  return value && value.length > 0 ? value : undefined;
};

const normalizeBoundedText = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().slice(0, MAX_CONTEXT_VALUE_LENGTH);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeMonth = (value: string | undefined) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
    return undefined;
  }

  return String(parsed);
};

const normalizeYear = (value: string | undefined) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 2000) {
    return undefined;
  }

  return String(parsed);
};

const normalizeSector = (value: string | undefined): SectorKey | undefined => {
  const normalized = normalizeBoundedText(value)?.toLowerCase();
  return normalized && VALID_SECTORS.has(normalized as SectorKey) ? (normalized as SectorKey) : undefined;
};

const normalizeTicker = (value: string | undefined) => {
  const normalized = normalizeBoundedText(value)?.toUpperCase();

  if (!normalized || !/^[A-Z0-9.]{1,10}$/.test(normalized)) {
    return undefined;
  }

  return normalized;
};

/**
 * `parseOperatorStageParam`, not `isOperatorStage`, for the same reason `/api/embed`
 * changed on 2026-09-07: `growth` and `public` were published in older `?stage=` links
 * and embed snippets, and rejecting them drops the calibration silently rather than
 * folding them into Series B+ where they belong.
 */
const normalizeCompanyStage = (value: string | undefined): CompanyStage | undefined =>
  parseOperatorStageParam(normalizeBoundedText(value)?.toLowerCase()) ?? undefined;

const normalizeCadence = (value: string | undefined) => {
  const normalized = normalizeBoundedText(value)?.toLowerCase();
  return normalized && VALID_CADENCES.has(normalized) ? normalized : undefined;
};

const normalizeView = (value: string | undefined) => {
  const normalized = normalizeBoundedText(value)?.toLowerCase();
  return normalized && VALID_INTERPRETATION_VIEWS.has(normalized) ? normalized : undefined;
};

export const buildSupportedImageBriefSearchParams = (source: SearchParamReader) => {
  const params = new URLSearchParams();
  const month = normalizeMonth(readTrimmed(source, "month"));
  const year = normalizeYear(readTrimmed(source, "year"));
  const sector = normalizeSector(readTrimmed(source, "sector"));
  const view = normalizeView(readTrimmed(source, "view"));
  const cadence = normalizeCadence(readTrimmed(source, "cadence"));
  const companyStage = normalizeCompanyStage(
    readTrimmed(source, "stage") ?? readTrimmed(source, "companyStage"),
  );
  const ticker = normalizeTicker(readTrimmed(source, "ticker") ?? readTrimmed(source, "company"));

  if (month) {
    params.set("month", month);
  }

  if (year) {
    params.set("year", year);
  }

  if (sector) {
    params.set("sector", sector);
  }

  if (view) {
    params.set("view", view);
  }

  if (cadence) {
    params.set("cadence", cadence);
  }

  if (companyStage) {
    params.set("stage", companyStage);
  }

  if (ticker) {
    params.set("ticker", ticker);
  }

  return params;
};

export const buildImageBriefApiPath = (source: SearchParamReader, pathname = "/api/image/brief") => {
  const params = buildSupportedImageBriefSearchParams(source);
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
};

export const parseImageBriefRequestContext = (source: SearchParamReader): ImageBriefRequestContext => {
  const supportedParams = buildSupportedImageBriefSearchParams(source);
  const searchParams: HomePageSearchParams = {};
  const month = supportedParams.get("month") ?? undefined;
  const year = supportedParams.get("year") ?? undefined;
  const sector = supportedParams.get("sector") ?? undefined;
  const view = supportedParams.get("view") ?? undefined;
  const cadence = supportedParams.get("cadence") ?? undefined;

  if (month) {
    searchParams.month = month;
  }

  if (year) {
    searchParams.year = year;
  }

  if (sector) {
    searchParams.sector = sector;
  }

  if (view) {
    searchParams.view = view;
  }

  if (cadence) {
    searchParams.cadence = cadence;
  }

  // Same parse as the writer above. These two disagreed until 2026-09-07: the writer
  // normalized a stage into the params and this reader gated the result again on a
  // narrower predicate, so a legacy value survived serialization and was then dropped.
  const operatorContext: OperatorContext = {
    companyStage: parseOperatorStageParam(supportedParams.get("stage")),
    ticker: supportedParams.get("ticker"),
  };

  return {
    searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
    operatorContext: operatorContext.companyStage || operatorContext.ticker
      ? operatorContext
      : undefined,
  };
};
