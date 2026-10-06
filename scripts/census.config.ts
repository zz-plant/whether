/**
 * What this repository's two census checks measure, and the ceilings they hold.
 *
 * The mechanisms — `scripts/check-dead-exports.ts` and `scripts/check-suppression-census.ts`
 * — name nothing about this repo. Everything that does lives here: which directories hold
 * the code, which names Next.js and the Workers runtime consume by convention, where the
 * product's data sits, and the baselines. Lowering a baseline is an edit to this file, so it
 * lands in the same diff as the work that earned it and is visible in review, instead of
 * being a regenerated artifact nobody reads.
 */
import type { DeadExportsConfig } from "./check-dead-exports";
import type { SuppressionCensusConfig } from "./check-suppression-census";

/**
 * Build output, caches and generated captures. Neither census reads anything under these,
 * wherever they sit. One list for both: they used to differ by `.open-next` and `.vercel`,
 * neither of which exists under any root either census scans, so the union changed no
 * file either one reads.
 */
const GENERATED_DIRECTORIES = [
  ".next",
  ".open-next",
  ".vercel",
  ".wrangler",
  "artifacts",
  "coverage",
  "dist",
  "node_modules",
  "out",
];

/** Exported declarations in these roots are the population the dead-export census measures. */
const DECLARATION_ROOTS = ["app", "lib", "worker"];

/**
 * Files whose identifiers count as references. Wider than the declaration roots on purpose:
 * a script, a test, or `wrangler.toml` naming a Durable Object class is a real consumer.
 *
 * `packages` was in this list for `@whether/decision-engine`, whose entire content was
 * `export * from "../../../lib/report/index"` and which nothing imported. A star re-export
 * names no identifiers, so it inflated nothing — but the pair it formed with
 * `lib/report/index.ts` is the shape the scan structurally cannot see, and is why both are
 * gone: a namespace re-export (`export * as decisionKnobs from "./decisionKnobs"`) always
 * spells its own filename, so every other file that imports that module reads as a
 * reference to the barrel's export. A barrel is referenced by construction.
 */
const REFERENCE_ROOTS = [...DECLARATION_ROOTS, "scripts", "tests", ".github"];

/*
 * Wider than the declaration set on purpose. A symbol can be named from a `.jsx` file, an
 * ambient `.d.ts`, a nested `wrangler.toml` naming a Durable Object class, or a workflow
 * YAML — and each one the scan cannot see turns a live export into a reported orphan.
 */
const REFERENCE_EXTENSIONS = [
  ".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".jsx",
  ".json", ".jsonc", ".toml", ".yml", ".yaml",
];

export const deadExportsConfig: DeadExportsConfig = {
  declarationRoots: DECLARATION_ROOTS,
  declarationExtensions: [".ts", ".tsx"],
  referenceRoots: REFERENCE_ROOTS,
  referenceExtensions: REFERENCE_EXTENSIONS,
  rootConfigExtensions: [".ts", ".js", ".mjs", ".toml", ".jsonc", ".json"],
  /**
   * Roots a healthy checkout always has. `.github` is excluded: it can be legitimately
   * absent, and a missing one costs precision, not soundness.
   */
  requiredReferenceRoots: [...DECLARATION_ROOTS, "scripts", "tests"],
  ignoredDirectories: GENERATED_DIRECTORIES,

  /** Names Next.js and the Workers runtime consume without importing them. */
  frameworkExports: [
    "metadata",
    "generateMetadata",
    "generateStaticParams",
    "generateViewport",
    "viewport",
    "dynamic",
    "dynamicParams",
    "revalidate",
    "runtime",
    "fetchCache",
    "preferredRegion",
    "maxDuration",
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "alt",
    "size",
    "contentType",
    "config",
    "scheduled",
    "fetch",
    "queue",
    "email",
    "tail",
  ],
  /** Files Next.js and the Workers runtime load by convention; nothing imports them. */
  conventionModules:
    /^(page|layout|route|loading|error|not-found|template|default|sitemap|robots|manifest|icon|apple-icon|opengraph-image|twitter-image|global-error|middleware|instrumentation)$/,

  /** Committed data the product reads. Judged by filename, the way an import names it. */
  dataRoots: ["data", "content"],
  dataExtensions: [".json", ".csv", ".md", ".txt", ".yaml", ".yml"],
  /*
   * Prose counts for data, unlike for exports: a dataset a runbook or a routine names by
   * filename has a consumer, it is just not a compiler. So `docs/` joins the roots and the
   * prose extensions join the list.
   *
   * And a test does not count, unlike in the export census, which is the whole reason this
   * scan finds anything. `data/` is what the product ships and reads; a file there whose
   * only consumer is a suite is not product data. The cohort dataset found on 2026-09-16 —
   * 31KB of eight named operators feeding a Python script wired to nothing — was exactly
   * that: its one reader was the test for a script nothing ran, and with `tests/` counted it
   * would have passed this check the way it passed every other one. A genuine fixture
   * belongs in `tests/fixtures/`, where this scan never looks.
   */
  dataReferenceRoots: [...REFERENCE_ROOTS.filter((root) => root !== "tests"), "docs"],
  dataReferenceExtensions: [...REFERENCE_EXTENSIONS, ".md", ".mdx", ".csv", ".txt"],

  /**
   * Who counts as a consumer of a module for the test-only census: shipping code, and
   * `scripts/`, because a CLI is a consumer. A module only `tests/` imports is the finding.
   */
  consumerRoots: [...DECLARATION_ROOTS, "scripts"],
  testRoots: ["tests"],

  /**
   * Zero. The 2026-09-15 sweep that introduced the check left nothing behind, and an export
   * nothing references has no reason to exist, so the baseline is not a budget to spend.
   * Raising it is a policy change and belongs in its own PR.
   */
  baseline: 0,
};

export const suppressionCensusConfig: SuppressionCensusConfig = {
  /** Roots that hold code a check could be told to ignore. */
  scanRoots: ["app", "lib", "scripts", "tests", "worker"],
  scanExtensions: [".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx"],
  ignoredDirectories: GENERATED_DIRECTORIES,
  /**
   * The census and its test both contain every pattern it counts as literals, so a scan
   * that included them would count the meter as debt and rise every time the census gained
   * a category.
   */
  selfExcluded: ["scripts/check-suppression-census.ts", "tests/suppressionCensus.test.ts"],
  lintConfig: ".oxlintrc.json",
  testFileSuffixes: [".test.ts", ".test.tsx"],

  /**
   * Measured on 2026-09-03. Every entry is a ceiling: lower it when the work earns it, never
   * raise it. Raising one is a policy change and belongs in its own PR with the reason, not
   * folded into the change that needed the suppression.
   */
  baseline: {
    /*
     * 8 -> 4 on 2026-10-05, when `--report-unused-disable-directives` joined the lint
     * script: four of the eight directives silenced rules oxlint never reports
     * (no-constant-condition, ban-ts-comment, a file-level no-console block), so they
     * were suppressing nothing and are gone. The flag now makes this class of staleness
     * a lint failure directly, so what remains here is the count of live suppressions.
     */
    lintSuppressions: 4,
    typeSuppressions: 3,
    skippedTests: 0,
    /*
     * 1 -> 0 on 2026-09-17. `react/set-state-in-effect` was the last rule off,
     * with 22 findings across 19 files, and they were not one problem: about half
     * read a browser-only source on mount, three mirrored a prop into state, the
     * rest were an animation and a reset-on-condition.
     *
     * What made it "not something to flip blind" was that nothing in this suite
     * exercises a client effect, and adding a DOM to get that is a far larger
     * change than the fix. The browser reads went to `useSyncExternalStore`
     * through `app/components/browserSource.ts`, which puts the one part that can
     * fail catastrophically — a `getSnapshot` that allocates, and so never settles
     * — in a pure module `tests/browserSource.test.ts` pins without a DOM. The
     * rest needed no new machinery: a value mirrored back through an effect is a
     * value the render already had, and an edit that has to survive until a prop
     * moves is an edit stamped with the prop it was made against.
     */
    disabledLintRules: 0,
    // Two rules are enforced everywhere but one small set of files:
    // nextjs/no-html-link-for-pages is off for app/layout.tsx, where /feed.xml is a
    // route handler serving a file that <Link> would client-navigate to; and
    // jsx-a11y/prefer-tag-over-role is off for TimelineBar and scrollProgressBar,
    // whose role="region"/"progressbar" wrappers would cost a landmark or a UA-styled
    // <progress> to satisfy. Counted, because a scoped `off` is still a suppression.
    overrideDisabledRules: 2,
  },

  /**
   * A floor rather than a ceiling. Deleting tests is the other way to make the suite
   * green, and it moves no number above.
   */
  minimumTestFiles: 212,
};
