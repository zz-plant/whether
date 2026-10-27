/**
 * Operator context — server-side cookie reading for personalization.
 *
 * Reads the company stage and runway from request cookies and hands them to
 * the page assembler without accounts or login. The stage is the one in
 * `operatorStage.ts`; this module used to accept a five-value list of its own,
 * alongside a "rate sensitivity" setting that no code path ever read. Both are
 * gone: a setting the product stores and never applies is a promise the
 * settings panel cannot keep.
 *
 * `ticker` comes from a query parameter only (`/api/image/brief`, `/api/embed`).
 * A `whether-ticker` cookie was read here until 2026-10-27, though its one
 * writer (`/api/config`) went on 2026-09-06 and `/` never read the result.
 */
import { readOperatorStageCookie, type OperatorStage } from "./operatorStage";
import { readOperatorRunwayCookie, type RunwayBand } from "./operatorRunway";

export type CompanyStage = OperatorStage;

export interface OperatorContext {
  companyStage: CompanyStage | null;
  companyRunway: RunwayBand | null;
  ticker: string | null;
}

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

  return {
    companyStage: readOperatorStageCookie(cookieHeader),
    companyRunway: readOperatorRunwayCookie(cookieHeader),
    ticker: null,
  };
};
