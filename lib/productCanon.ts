import type { RegimeKey } from "./regimeEngine";
import { REGIME_ORDER, getRegimePublicLabel } from "./regimePresentation";
import type { TimeMachineRegimeEntry } from "./timeMachine/timeMachineCache";

/**
 * Widely read product-management writing, placed against the month-end record.
 *
 * This is the second version. The first (Feb–Mar 2026, `3e905ffd`) was deleted
 * for good reasons that are worth keeping in view, because each one is a rule
 * this module now holds:
 *
 * - **It printed a template as a reading.** Every essay carried "the guidance
 *   that month", which was the one sentence the archive stores per regime — so
 *   seventeen essays showed the identical line. The month-specific facts here are
 *   the ones the record actually varies by: the conditions that month, and how
 *   long they had held.
 * - **It implied a cause it never measured.** Each entry asked whether the idea
 *   spread *because of* the market. Most essays landed in Sunny months, and so
 *   did most months. `buildCanonBaseRate` puts the two shares side by side so the
 *   page can say that plainly instead of letting a coincidence read as a finding.
 * - **Its dates and entries were not checked.** A 2005 essay was dated 2012, a
 *   2018 book was dated to 2016, and one entry was credited to "Industry
 *   synthesis". Every entry below was checked against its source, and
 *   `publishedNote` says what the date refers to when there is more than one
 *   candidate (an essay and the book it became).
 * - **It sprawled.** Era, focus and audience taxonomies, a detail page per essay
 *   and a "which essay wins in which conditions" map. One page now, one anchor
 *   per essay.
 */

export type CanonEssay = {
  /** The anchor on /concepts. */
  slug: string;
  title: string;
  /** One entry per person, so each is a separate author in the page's markup. */
  authors: readonly string[];
  /** A book is marked up as one; everything else (essays, posts, articles) as an article. */
  format: "essay" | "book";
  published: { year: number; month: number };
  /** What the date refers to, when it could mean more than one thing. */
  publishedNote?: string;
  sourceUrl: string;
  /** What it argued, in one sentence. No claim about why it spread. */
  argument: string;
};

/*
 * Checked 2026-09-23 against each source (author's site, original publisher, or
 * a publisher record for books). Dropped from the first version: "The Most
 * Difficult Job You'll Ever Love" and "The Two Types of PMs", which do not exist
 * under those titles; "Retention is King", which is a phrase rather than an
 * essay; the Figma half of a "career ladders" entry and the "Psychology of
 * Product Growth" and "Product Strategy vs. Product Plan" titles, none of which
 * could be found; and the "Industry synthesis" entry. Left out as candidates
 * because their month could not be confirmed: Biddle's DHM essays, the
 * Growth.Design case studies, and Doshi's LNO thread (dated, but only on X).
 */
export const canonEssays: readonly CanonEssay[] = [
  {
    slug: "how-to-hire-a-product-manager",
    format: "essay",
    title: "How to Hire a Product Manager",
    authors: ["Ken Norton"],
    published: { year: 2005, month: 6 },
    sourceUrl: "https://www.bringthedonuts.com/essays/productmanager.html",
    argument:
      "Hire product managers for raw intelligence, technical grounding, product instinct, leadership through influence and a record of shipping, over domain pedigree.",
  },
  {
    slug: "the-only-thing-that-matters",
    format: "essay",
    title: "The only thing that matters",
    authors: ["Marc Andreessen"],
    published: { year: 2007, month: 6 },
    sourceUrl: "https://pmarchive.com/guide_to_startups_part4.html",
    argument:
      "Market matters more than team or product, and until a startup has product/market fit, reaching it comes ahead of everything else.",
  },
  {
    slug: "the-startup-pyramid",
    format: "essay",
    title: "The Startup Pyramid",
    authors: ["Sean Ellis"],
    published: { year: 2009, month: 7 },
    sourceUrl: "https://www.startup-marketing.com/2009/07/",
    argument:
      "A product has fit when at least 40% of its users would be very disappointed to lose it, and a startup should reach that before it spends on scaling.",
  },
  {
    slug: "what-exactly-is-a-product-manager",
    format: "essay",
    title: "What, exactly, is a Product Manager?",
    authors: ["Martin Eriksson"],
    published: { year: 2011, month: 10 },
    sourceUrl: "https://www.mindtheproduct.com/what-exactly-is-a-product-manager/",
    argument:
      "Product management sits where business, technology and user experience overlap, and a product manager should be experienced in one, passionate about all three and fluent with people in each.",
  },
  {
    slug: "how-to-manufacture-desire",
    format: "essay",
    title: "How To Manufacture Desire",
    authors: ["Nir Eyal"],
    published: { year: 2012, month: 3 },
    publishedNote: "The essay. It became the book Hooked, self-published in December 2013.",
    sourceUrl: "https://techcrunch.com/2012/03/04/how-to-manufacture-desire/",
    argument: "Products become habits through repeated cycles of trigger, action, variable reward and investment.",
  },
  {
    slug: "good-product-manager-bad-product-manager",
    format: "essay",
    title: "Good Product Manager/Bad Product Manager",
    authors: ["Ben Horowitz", "David Weiden"],
    published: { year: 2012, month: 6 },
    publishedNote:
      "The date is its publication on the open web. It was written as a Netscape training memo in the late 1990s.",
    sourceUrl: "https://a16z.com/good-product-manager-bad-product-manager/",
    argument:
      "Contrasts good and bad habits line by line, and casts the product manager as the one who owns the product's outcome and makes no excuses for it.",
  },
  {
    slug: "product-strategy-means-saying-no",
    format: "essay",
    title: "Product strategy means saying no",
    authors: ["Des Traynor"],
    published: { year: 2013, month: 7 },
    sourceUrl: "https://www.intercom.com/blog/product-strategy-means-saying-no/",
    argument:
      "A good product is a focused, coherent whole, so a product manager has to turn down the usual reasons for adding a feature, good ideas included.",
  },
  {
    slug: "the-mom-test",
    format: "book",
    title: "The Mom Test",
    authors: ["Rob Fitzpatrick"],
    published: { year: 2013, month: 9 },
    sourceUrl: "https://www.momtestbook.com/",
    argument:
      "Ask customers about what they have actually done, not about your idea, because people lie politely to protect your feelings.",
  },
  {
    slug: "the-build-trap",
    format: "essay",
    title: "The Build Trap",
    authors: ["Melissa Perri"],
    published: { year: 2014, month: 8 },
    publishedNote: "The blog post. It became the book Escaping the Build Trap in November 2018.",
    sourceUrl: "https://melissaperri.com/blog/2014/08/05/the-build-trap",
    argument:
      "Teams that measure output ship features built on guesses; they need to organise around learning and the outcomes customers get.",
  },
  {
    slug: "the-alternative-to-roadmaps",
    format: "essay",
    title: "The Alternative to Roadmaps",
    authors: ["Marty Cagan"],
    published: { year: 2015, month: 9 },
    sourceUrl: "https://www.svpg.com/the-alternative-to-roadmaps/",
    argument:
      "Replace feature roadmaps with a product vision, business objectives and team autonomy, so teams answer for outcomes rather than output.",
  },
  {
    slug: "mvpm-minimum-viable-product-manager",
    format: "essay",
    title: "MVPM: Minimum Viable Product Manager",
    authors: ["Brandon Chu"],
    published: { year: 2016, month: 4 },
    sourceUrl: "https://blackboxofpm.substack.com/p/mvpm-minimum-viable-product-manager-e1aeb8dd421",
    argument:
      "A syllabus of the minimum a generalist product manager needs across technology, design and business. It is meant to be learned rather than mastered.",
  },
  {
    slug: "know-your-customers-jobs-to-be-done",
    format: "essay",
    title: "Know Your Customers' “Jobs to Be Done”",
    authors: ["Clayton M. Christensen", "Taddy Hall", "Karen Dillon", "David S. Duncan"],
    published: { year: 2016, month: 9 },
    sourceUrl: "https://hbr.org/2016/09/know-your-customers-jobs-to-be-done",
    argument:
      "Innovation works better when you understand the progress a customer is trying to make in a situation than when you rely on who the customer is.",
  },
  {
    slug: "why-product-market-fit-isnt-enough",
    format: "essay",
    title: "Why Product Market Fit Isn't Enough",
    authors: ["Brian Balfour"],
    published: { year: 2017, month: 6 },
    sourceUrl: "https://brianbalfour.com/essays/product-market-fit-isnt-enough",
    argument:
      "Growing past $100M takes four fits that depend on each other, not product/market fit alone: market and product, product and channel, channel and model, and model and market.",
  },
  {
    slug: "superhuman-product-market-fit-engine",
    format: "essay",
    title: "How Superhuman Built an Engine to Find Product/Market Fit",
    authors: ["Rahul Vohra"],
    published: { year: 2018, month: 11 },
    sourceUrl: "https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/",
    argument:
      "Treat product/market fit as a number: the share of users who would be very disappointed without you. Raise it by building for the users who already love the product.",
  },
  {
    slug: "the-making-of-a-manager",
    format: "book",
    title: "The Making of a Manager",
    authors: ["Julie Zhuo"],
    published: { year: 2019, month: 3 },
    sourceUrl: "https://www.juliezhuo.com/book/manager.html",
    argument: "A working guide for new managers, built on purpose, people and process. Feedback, hiring and meetings serve those three.",
  },
  {
    slug: "product-led-growth",
    format: "book",
    title: "Product-Led Growth",
    authors: ["Wes Bush"],
    published: { year: 2019, month: 5 },
    sourceUrl: "https://www.amazon.com/Product-Led-Growth-Build-Product-Itself/dp/1798434520",
    argument:
      "Through free trials or a free tier, a product can carry its own acquisition, conversion and expansion instead of leaving them to a sales team.",
  },
  {
    slug: "intercom-product-management-career-ladder",
    format: "essay",
    title: "Steps to success: the importance of a clear career path for product managers",
    authors: ["Jane Honey", "Brian Donohue"],
    published: { year: 2019, month: 6 },
    sourceUrl: "https://www.intercom.com/blog/evolving-your-product-management-career-ladder/",
    argument:
      "Intercom published its product manager career ladder so expectations and promotion are explicit. It sets five skill areas across levels from associate to principal.",
  },
  {
    slug: "shape-up",
    format: "book",
    title: "Shape Up",
    authors: ["Ryan Singer"],
    published: { year: 2019, month: 7 },
    publishedNote: "The free online edition. A print edition followed.",
    sourceUrl: "https://basecamp.com/shapeup",
    argument:
      "Work in fixed six-week cycles with variable scope: shape the work first, bet on it instead of keeping a backlog, and let the team own the build.",
  },
  {
    slug: "how-to-kickstart-and-scale-a-marketplace",
    format: "essay",
    title: "How to kickstart and scale a marketplace business",
    authors: ["Lenny Rachitsky"],
    published: { year: 2019, month: 11 },
    sourceUrl: "https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace",
    argument:
      "Nearly every marketplace that worked started by narrowing its geography or category until it reached critical mass, and expanded from there.",
  },
  {
    slug: "product-strategy-overview",
    format: "essay",
    title: "Product Strategy – Overview",
    authors: ["Marty Cagan"],
    published: { year: 2020, month: 2 },
    sourceUrl: "https://www.svpg.com/product-strategy-overview/",
    argument:
      "Product strategy is deciding which problems to solve. It means focusing, drawing insight from data and customers, turning that insight into team objectives and managing the result.",
  },
  {
    slug: "empowered",
    format: "book",
    title: "Empowered",
    authors: ["Marty Cagan", "Chris Jones"],
    published: { year: 2020, month: 12 },
    sourceUrl: "https://www.wiley.com/en-us/EMPOWERED:+Ordinary+People,+Extraordinary+Products-p-9781119691297",
    argument:
      "Strong products come from teams given problems to solve rather than features to build, and from leaders who coach them.",
  },
  {
    slug: "continuous-discovery-habits",
    format: "book",
    title: "Continuous Discovery Habits",
    authors: ["Teresa Torres"],
    published: { year: 2021, month: 5 },
    publishedNote: "The book. The opportunity solution tree it is built around was first published in 2016.",
    sourceUrl: "https://www.producttalk.org/continuous-discovery-habits/",
    argument:
      "Talk to customers every week. Map the outcome you want to the opportunities and solutions beneath it, and test assumptions as you go.",
  },
  {
    slug: "the-product-momentum-gap",
    format: "book",
    title: "The Product Momentum Gap",
    authors: ["Dave Martin", "Andrea Saez"],
    published: { year: 2023, month: 10 },
    sourceUrl: "https://www.amazon.com/Product-Momentum-Gap-Bringing-together/dp/B0CK9Y3V28",
    argument:
      "Momentum stalls when product strategy and customer value drift apart, and teams need practices that keep the two joined.",
  },
  {
    slug: "the-ai-product-playbook",
    format: "book",
    title: "The AI Product Playbook",
    authors: ["Marily Nika", "Diego Granados"],
    published: { year: 2025, month: 9 },
    publishedNote: "The e-book. Print followed in October 2025.",
    sourceUrl:
      "https://www.wiley.com/en-us/The+AI+Product+Playbook:+Strategies,+Skills,+and+Frameworks+for+the+AI-Driven+Product+Manager-p-00440656",
    argument: "The skills and frameworks a product manager needs to build and run products that depend on AI.",
  },
];

/** A month on the record, as the timeline needs it. */
type RecordMonth = Pick<TimeMachineRegimeEntry, "year" | "month" | "recordDate" | "regime">;

export type CanonReading =
  | { kind: "before-record" }
  | { kind: "after-record" }
  | {
      kind: "reading";
      regime: RegimeKey;
      conditions: string;
      recordDate: string;
      /** Months the conditions had held at that month-end, counting that month. */
      heldMonths: number;
      /** The run reaches back to the record's first month, so `heldMonths` is a floor. */
      heldSinceRecordStart: boolean;
    };

type CanonTimelineEntry = CanonEssay & { reading: CanonReading };

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

const byPublished = (left: CanonEssay, right: CanonEssay) =>
  monthIndex(left.published.year, left.published.month) - monthIndex(right.published.year, right.published.month)
  || left.title.localeCompare(right.title);

export const readingForMonth = (series: readonly RecordMonth[], year: number, month: number): CanonReading => {
  if (series.length === 0) return { kind: "before-record" };
  const target = monthIndex(year, month);
  if (target < monthIndex(series[0].year, series[0].month)) return { kind: "before-record" };
  const index = series.findIndex((entry) => monthIndex(entry.year, entry.month) === target);
  if (index === -1) return { kind: "after-record" };

  const entry = series[index];
  let start = index;
  while (start > 0 && series[start - 1].regime === entry.regime) start -= 1;
  return {
    kind: "reading",
    regime: entry.regime,
    conditions: getRegimePublicLabel(entry.regime),
    recordDate: entry.recordDate,
    heldMonths: index - start + 1,
    heldSinceRecordStart: start === 0,
  };
};

export const buildCanonTimeline = (
  series: readonly RecordMonth[],
  essays: readonly CanonEssay[] = canonEssays,
): CanonTimelineEntry[] =>
  [...essays]
    .sort(byPublished)
    .map((essay) => ({ ...essay, reading: readingForMonth(series, essay.published.year, essay.published.month) }));

type CanonBaseRateRow = {
  regime: RegimeKey;
  conditions: string;
  months: number;
  /** Share of months on record, 0–1. */
  monthShare: number;
  essays: number;
  /** Share of the essays that have a reading, 0–1. */
  essayShare: number;
};

type CanonBaseRate = {
  rows: CanonBaseRateRow[];
  monthsOnRecord: number;
  essaysWithReading: number;
  essaysBeforeRecord: number;
};

/**
 * Where the essays fell, beside where the months fell. The comparison is the
 * point: a share of essays means nothing without the share of time those
 * conditions held.
 */
export const buildCanonBaseRate = (
  series: readonly RecordMonth[],
  timeline: readonly CanonTimelineEntry[],
): CanonBaseRate => {
  const withReading = timeline.filter(
    (entry): entry is CanonTimelineEntry & { reading: Extract<CanonReading, { kind: "reading" }> } =>
      entry.reading.kind === "reading",
  );
  const rows = REGIME_ORDER.map((regime) => {
    const months = series.filter((entry) => entry.regime === regime).length;
    const essays = withReading.filter((entry) => entry.reading.regime === regime).length;
    return {
      regime,
      conditions: getRegimePublicLabel(regime),
      months,
      monthShare: series.length > 0 ? months / series.length : 0,
      essays,
      essayShare: withReading.length > 0 ? essays / withReading.length : 0,
    };
  });
  return {
    rows,
    monthsOnRecord: series.length,
    essaysWithReading: withReading.length,
    essaysBeforeRecord: timeline.filter((entry) => entry.reading.kind === "before-record").length,
  };
};

const percent = (share: number) => `${Math.round(share * 100)}%`;

/**
 * The one-sentence reading of the base-rate table. It names the largest gap
 * between where essays fell and where months fell, and says in so many words
 * that a list this size cannot carry a cause either way.
 */
export const describeCanonBaseRate = (baseRate: CanonBaseRate): string => {
  if (baseRate.essaysWithReading === 0 || baseRate.monthsOnRecord === 0) {
    return "None of these essays falls inside the record, so there is nothing to compare.";
  }
  const widest = [...baseRate.rows].sort(
    (left, right) => Math.abs(right.essayShare - right.monthShare) - Math.abs(left.essayShare - left.monthShare),
  )[0];
  const tooFew = `${baseRate.essaysWithReading} essays is too few to say why, and this page does not try.`;
  if (Math.abs(widest.essayShare - widest.monthShare) < 0.1) {
    return `The essays fall about where the months do: no set of conditions holds a share of this list more than ten points from its share of time. ${tooFew}`;
  }
  /* The gap leads and the two shares follow; "…of these essays, the widest gap in the
     table: more of this list came out in Stormy months than their share of time
     would suggest" restated the shares as a sentence (2026-10-09). */
  return (
    `The widest gap in the table is ${widest.conditions}: those months held ${percent(widest.monthShare)} of the record `
    + `and ${percent(widest.essayShare)} of these essays. `
    + tooFew
  );
};

/** Essays written in the given conditions, oldest first. */
export const essaysWrittenIn = (timeline: readonly CanonTimelineEntry[], regime: RegimeKey) =>
  timeline.filter((entry) => entry.reading.kind === "reading" && entry.reading.regime === regime);

/** "A", "A and B", "A, B, C and D". */
export const formatCanonAuthors = (essay: Pick<CanonEssay, "authors">) =>
  essay.authors.length <= 2
    ? essay.authors.join(" and ")
    : `${essay.authors.slice(0, -1).join(", ")} and ${essay.authors[essay.authors.length - 1]}`;

/** Essays first published inside an archive year, or one quarter of it. */
export const essaysPublishedIn = (period: { year: number; quarter?: number }, essays: readonly CanonEssay[] = canonEssays) =>
  [...essays]
    .filter(
      (essay) =>
        essay.published.year === period.year
        && (period.quarter === undefined || Math.ceil(essay.published.month / 3) === period.quarter),
    )
    .sort(byPublished);

export const formatCanonPublished = (essay: Pick<CanonEssay, "published">) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(essay.published.year, essay.published.month - 1, 1)),
  );
