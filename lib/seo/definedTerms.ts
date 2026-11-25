import { siteUrl } from "../siteUrl";
import { OPERATING_LATITUDE_LABEL, TERM_DEFINITIONS } from "../report/reportCopy";
import { REGIME_LABELS, REGIME_WEATHER_RATIONALES } from "../regimePresentation";
import type { RegimeKey } from "../types";

/**
 * The site's own vocabulary, named once (docs/seo/quality-gates.md, "Semantic gates").
 *
 * The two scores, Room to move, Room before a change and the four conditions are words
 * this site coined or uses in its own sense, so nothing in a page's text ties "funding
 * pressure 90" to anything a search or answer engine already knows. Each term is a
 * `DefinedTerm` in one `DefinedTermSet` on the method page that prints it (`/about`), and a
 * page that uses a term points at its id. There is no glossary page (feature log §1.5).
 *
 * The descriptions are sentences the site already prints, not new definitions: a score's
 * and a distance's are `TERM_DEFINITIONS` (the tap-to-define cards on the brief, and
 * llms-full.txt), a condition's is the line printed beside its word
 * (`REGIME_WEATHER_RATIONALES`). `/about` renders this list, so the markup and the page
 * read one object.
 */
export type DefinedTermSlug =
  | "funding-pressure"
  | "risk-appetite"
  | "room-to-move"
  | "room-before-a-change"
  | "sunny"
  | "cloudy"
  | "stormy"
  | "freezing";

/** The set's page: the method page, where the terms are printed. */
const TERM_PAGE = `${siteUrl}/about`;

/** The fragment the set's list sits under on `/about`. */
export const DEFINED_TERM_SET_ANCHOR = "terms";

export const DEFINED_TERM_SET_ID = `${TERM_PAGE}#${DEFINED_TERM_SET_ANCHOR}`;

/** The element id a term's `<dfn>` carries on `/about`, and the fragment of its `@id`. */
export const definedTermAnchor = (slug: DefinedTermSlug) => `term-${slug}`;

/** A term's `@id`: `https://whether.work/about#term-funding-pressure`. Other pages point here. */
export const definedTermId = (slug: DefinedTermSlug) => `${TERM_PAGE}#${definedTermAnchor(slug)}`;

const definitionOf = (value: string): string => {
  const entry = TERM_DEFINITIONS.find((candidate) => candidate.value === value);
  if (!entry) throw new Error(`[definedTerms] TERM_DEFINITIONS has no "${value}" entry`);
  return entry.summary;
};

const termNameOf = (value: string): string => {
  const entry = TERM_DEFINITIONS.find((candidate) => candidate.value === value);
  if (!entry) throw new Error(`[definedTerms] TERM_DEFINITIONS has no "${value}" entry`);
  return entry.term;
};

const CONDITION_SLUG: Record<RegimeKey, DefinedTermSlug> = {
  EXPANSION: "sunny",
  DEFENSIVE: "cloudy",
  VOLATILE: "stormy",
  SCARCITY: "freezing",
};

/** The conditions in the order the site lists them: easiest to hardest. */
const CONDITION_ORDER: readonly RegimeKey[] = ["EXPANSION", "DEFENSIVE", "VOLATILE", "SCARCITY"];

type SiteTerm = { slug: DefinedTermSlug; name: string; description: string };

/** The eight terms, in the order `/about` prints them. */
export const SITE_VOCABULARY: readonly SiteTerm[] = [
  { slug: "funding-pressure", name: termNameOf("tightness"), description: definitionOf("tightness") },
  { slug: "risk-appetite", name: termNameOf("risk-appetite"), description: definitionOf("risk-appetite") },
  { slug: "room-to-move", name: OPERATING_LATITUDE_LABEL, description: definitionOf("boldness-score") },
  { slug: "room-before-a-change", name: termNameOf("confidence"), description: definitionOf("confidence") },
  ...CONDITION_ORDER.map((regime) => ({
    slug: CONDITION_SLUG[regime],
    name: REGIME_LABELS[regime],
    description: REGIME_WEATHER_RATIONALES[regime],
  })),
];

const termOf = (slug: DefinedTermSlug): SiteTerm => {
  const term = SITE_VOCABULARY.find((candidate) => candidate.slug === slug);
  if (!term) throw new Error(`[definedTerms] no term "${slug}"`);
  return term;
};

/** A condition's term slug, from its engine key. */
export const conditionTermSlug = (regime: RegimeKey): DefinedTermSlug => CONDITION_SLUG[regime];

/**
 * A page's pointer at a term: its id, its name and its set. An `@id` alone resolves only
 * against a node on the same page, so the name travels with it.
 */
export const definedTermReference = (slug: DefinedTermSlug) => ({
  "@type": "DefinedTerm",
  "@id": definedTermId(slug),
  name: termOf(slug).name,
  inDefinedTermSet: { "@id": DEFINED_TERM_SET_ID },
});

/** The set itself, with every term in full, for the page that prints them. */
export const buildDefinedTermSet = () => ({
  "@type": "DefinedTermSet",
  "@id": DEFINED_TERM_SET_ID,
  name: "The words on the brief",
  url: DEFINED_TERM_SET_ID,
  hasDefinedTerm: SITE_VOCABULARY.map((term) => ({
    "@type": "DefinedTerm",
    "@id": definedTermId(term.slug),
    name: term.name,
    description: term.description,
    url: definedTermId(term.slug),
    inDefinedTermSet: { "@id": DEFINED_TERM_SET_ID },
  })),
});
