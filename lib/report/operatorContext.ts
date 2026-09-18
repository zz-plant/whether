/**
 * Operator context — server-side cookie reading for personalization.
 *
 * Reads the company stage (and an optional ticker) from request cookies and
 * hands them to the page assembler without accounts or login. The stage is
 * the one in `operatorStage.ts`; this module used to accept a five-value list
 * of its own, alongside a "rate sensitivity" setting that no code path ever
 * read. Both are gone: a setting the product stores and never applies is a
 * promise the settings panel cannot keep.
 */
import { readOperatorStageCookie, type OperatorStage } from "./operatorStage";
import { readOperatorRunwayCookie, type RunwayBand } from "./operatorRunway";

export type CompanyStage = OperatorStage;

export interface OperatorContext {
  companyStage: CompanyStage | null;
  companyRunway: RunwayBand | null;
  ticker: string | null;
}

const COOKIE_TICKER = "whether-ticker";

const parseCookieValue = (cookieHeader: string, name: string): string | null => {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const EMPTY_OPERATOR_CONTEXT: OperatorContext = { companyStage: null, companyRunway: null, ticker: null };

/**
 * Parse operator context from a cookie header string (from request.headers.get("cookie")).
 * Returns a null context if cookies are missing or invalid.
 */
export const parseOperatorContextFromCookies = (
  cookieHeader: string | null,
): OperatorContext => {
  if (!cookieHeader) {
    return EMPTY_OPERATOR_CONTEXT;
  }

  const tickerRaw = parseCookieValue(cookieHeader, COOKIE_TICKER);
  const ticker: string | null = tickerRaw && tickerRaw.trim().length > 0 ? tickerRaw.trim().toUpperCase() : null;

  return {
    companyStage: readOperatorStageCookie(cookieHeader),
    companyRunway: readOperatorRunwayCookie(cookieHeader),
    ticker,
  };
};
