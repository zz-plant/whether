import { ADVICE_STANCE_DEFINITIONS, type AdviceStance } from "./adviceStance";
import type { RegimeKey } from "./regimeEngine";
import { DEFAULT_THRESHOLDS } from "./regimeEngineCore";
import { REGIME_ORDER, getRegimePublicLabel } from "./regimePresentation";
import type { TimeMachineRegimeEntry } from "./timeMachine/timeMachineCache";

/**
 * Widely read writing on building products and companies, placed against the
 * month-end record.
 *
 * This is the third version. The first (Feb–Mar 2026, `3e905ffd`) was deleted
 * for good reasons that are worth keeping in view, because each one is a rule
 * this module now holds:
 *
 * - **It printed a template as a reading.** Every essay carried "the guidance
 *   that month", which was the one sentence the archive stores per regime — so
 *   seventeen essays showed the identical line. The month-specific facts here are
 *   the ones the record actually varies by: the conditions that month, how long
 *   they had held, and the two scores.
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
 *
 * ## What the third version adds (2026-10-09)
 *
 * The page asks one question: does advice on money and headcount move with the
 * conditions, while advice on method does not? Three things serve it, and no
 * more.
 *
 * - **One tag per entry**, `stance`, from `lib/adviceStance.ts` (expand,
 *   conserve or craft), with `stanceBasis`: the line of the argument the tag
 *   rests on, quoted (in quotation marks) or paraphrased. The page prints it, so
 *   a reader can disagree with a tag on the evidence.
 * - **Capital-allocation texts**, because the first 24 were almost all craft and
 *   the question could not be asked of them.
 * - **A second source kind, `investorMemo`.** An entry is one when all five hold:
 *   1. it is a public primary source: the firm's or author's own copy;
 *   2. it is dated to the month;
 *   3. it is written by a venture firm, or by one of its founders or partners,
 *      and addressed to founders or portfolio companies;
 *   4. it prescribes how to allocate capital (hiring, raising, spending, pace);
 *   5. it is shown to have circulated: press coverage or wide citation.
 *   A book is `canon` whoever wrote it. So is anything written by a company for
 *   its own staff. Memos are described by what they say. Nothing here
 *   attributes a motive to the firm that wrote one.
 *
 * Capital texts added, each checked 2026-10-09 against the source linked in its
 * entry (circulation in brackets): Graham's "Startup = Growth" [TechCrunch,
 * VentureBeat] and "Default Alive or Default Dead?" [quoted in Lightspeed's
 * 2022 memo]; Agrawal's "The SaaS Adventure" [cited in Feld's Rule of 40 post];
 * Gurley's "On the Road to Recap" [CNBC, Re/code, Quartz]; Hoffman and Yeh's
 * Blitzscaling; Sequoia's "Coronavirus: The Black Swan of 2020" [TechCrunch, The
 * Next Web] and "Adapting to Endure" [TechCrunch]; Sacks's "The Burn Multiple"
 * [the metric's standard citation]; Andreessen's "It's Time to Build" [The New
 * Atlantis, Stratechery]; Lightspeed's "The Upside of a Downturn" [TechCrunch];
 * and Meta's "Update on Meta's Year of Efficiency". "It's Time to Build" is the
 * loosest fit to criterion 3: it is addressed to everyone who builds, CEOs,
 * entrepreneurs and investors among them. It stays as a deliberate
 * counterexample, an expand call in a month when risk appetite was low, because
 * a sample with its counterexamples taken out would prove nothing.
 *
 * Considered and left out:
 * - Sequoia's "R.I.P. Good Times" (October 2008). Sequoia's own page shows only
 *   the cover slide and dates it to the year; the slides' advice survives only
 *   in press copies, so the argument cannot be checked against a primary source.
 *   It would have predated the record in any case.
 * - Y Combinator's May 2022 "Economic Downturn" letter. Its text is public only
 *   as TechCrunch's reproduction, not from YC.
 * - Brad Feld's "The Rule of 40% For a Healthy SaaS Company" (February 2015). It
 *   argues both ways: hold growth plus margin to 40%, but grow first. No single
 *   tag fits it.
 * - Gurley's "Investors Beware" (February 2015). It is addressed to investors and
 *   prescribes nothing to founders.
 * - Graham's "Founder Mode" (September 2024). It is about how founders manage,
 *   not about capital.
 * - Craft Ventures' 2022 downturn slides. No dated primary copy was found.
 *
 * The original 24 were checked on 2026-09-23 against each source (author's
 * site, original publisher, or a publisher record for books). Dropped from the
 * first version: "The Most Difficult Job You'll Ever Love" and "The Two Types of
 * PMs", which do not exist under those titles; "Retention is King", which is a
 * phrase rather than an essay; the Figma half of a "career ladders" entry and
 * the "Psychology of Product Growth" and "Product Strategy vs. Product Plan"
 * titles, none of which could be found; and the "Industry synthesis" entry. Left
 * out as candidates because their month could not be confirmed: Biddle's DHM
 * essays, the Growth.Design case studies, and Doshi's LNO thread (dated, but
 * only on X).
 */

type CanonSource =
  | { kind: "canon" }
  /** `firm` is the byline when the memo is signed by the firm alone, and follows the author otherwise. */
  | { kind: "investorMemo"; firm: string };

export type CanonEssay = CanonSource & {
  /** The anchor on /concepts. */
  slug: string;
  title: string;
  /** One entry per person, so each is a separate author in the page's markup. Empty only for a memo the firm signed. */
  authors: readonly string[];
  /** A book is marked up as one; everything else (essays, posts, memos, articles) as an article. */
  format: "essay" | "book";
  published: { year: number; month: number };
  /** What the date refers to, when it could mean more than one thing. */
  publishedNote?: string;
  sourceUrl: string;
  /** What it argued, in one sentence. No claim about why it spread, and no motive. */
  argument: string;
  stance: AdviceStance;
  /** The part of the argument the tag rests on: a quotation in quotation marks, or a paraphrase. */
  stanceBasis: string;
};

export const canonEssays: readonly CanonEssay[] = [
  {
    slug: "how-to-hire-a-product-manager",
    kind: "canon",
    format: "essay",
    title: "How to Hire a Product Manager",
    authors: ["Ken Norton"],
    published: { year: 2005, month: 6 },
    sourceUrl: "https://www.bringthedonuts.com/essays/productmanager.html",
    argument:
      "Hire product managers for raw intelligence, technical grounding, product instinct, leadership through influence and a record of shipping, over domain pedigree.",
    stance: "craft",
    stanceBasis: "About whom to hire, not how many or how fast.",
  },
  {
    slug: "the-only-thing-that-matters",
    kind: "canon",
    format: "essay",
    title: "The only thing that matters",
    authors: ["Marc Andreessen"],
    published: { year: 2007, month: 6 },
    sourceUrl: "https://pmarchive.com/guide_to_startups_part4.html",
    argument:
      "Market matters more than team or product, and until a startup has product/market fit, reaching it comes ahead of everything else.",
    stance: "craft",
    stanceBasis: "Puts product/market fit first and sets no budget for reaching it.",
  },
  {
    slug: "the-startup-pyramid",
    kind: "canon",
    format: "essay",
    title: "The Startup Pyramid",
    authors: ["Sean Ellis"],
    published: { year: 2009, month: 7 },
    sourceUrl: "https://www.startup-marketing.com/2009/07/",
    argument:
      "A product has fit when at least 40% of its users would be very disappointed to lose it, and a startup should reach that before it spends on scaling.",
    stance: "conserve",
    stanceBasis: "Holds back spending on scaling until the 40% test is met.",
  },
  {
    slug: "what-exactly-is-a-product-manager",
    kind: "canon",
    format: "essay",
    title: "What, exactly, is a Product Manager?",
    authors: ["Martin Eriksson"],
    published: { year: 2011, month: 10 },
    sourceUrl: "https://www.mindtheproduct.com/what-exactly-is-a-product-manager/",
    argument:
      "Product management sits where business, technology and user experience overlap, and a product manager should be experienced in one, passionate about all three and fluent with people in each.",
    stance: "craft",
    stanceBasis: "Defines the role.",
  },
  {
    slug: "how-to-manufacture-desire",
    kind: "canon",
    format: "essay",
    title: "How To Manufacture Desire",
    authors: ["Nir Eyal"],
    published: { year: 2012, month: 3 },
    publishedNote: "The essay. It became the book Hooked, self-published in December 2013.",
    sourceUrl: "https://techcrunch.com/2012/03/04/how-to-manufacture-desire/",
    argument: "Products become habits through repeated cycles of trigger, action, variable reward and investment.",
    stance: "craft",
    stanceBasis: "About product design.",
  },
  {
    slug: "good-product-manager-bad-product-manager",
    kind: "canon",
    format: "essay",
    title: "Good Product Manager/Bad Product Manager",
    authors: ["Ben Horowitz", "David Weiden"],
    published: { year: 2012, month: 6 },
    publishedNote:
      "The date is its publication on the open web. It was written as a Netscape training memo in the late 1990s.",
    sourceUrl: "https://a16z.com/good-product-manager-bad-product-manager/",
    argument:
      "Contrasts good and bad habits line by line, and casts the product manager as the one who owns the product's outcome and makes no excuses for it.",
    stance: "craft",
    stanceBasis: "About a product manager's habits.",
  },
  {
    slug: "startup-equals-growth",
    kind: "investorMemo",
    firm: "Y Combinator",
    format: "essay",
    title: "Startup = Growth",
    authors: ["Paul Graham"],
    published: { year: 2012, month: 9 },
    sourceUrl: "https://paulgraham.com/growth.html",
    argument:
      "A startup is defined by fast growth, so founders should pick a weekly growth rate they can reach and hit it every week.",
    stance: "expand",
    stanceBasis: "“A startup is a company designed to grow fast.”",
  },
  {
    slug: "product-strategy-means-saying-no",
    kind: "canon",
    format: "essay",
    title: "Product strategy means saying no",
    authors: ["Des Traynor"],
    published: { year: 2013, month: 7 },
    sourceUrl: "https://www.intercom.com/blog/product-strategy-means-saying-no/",
    argument:
      "A good product is a focused, coherent whole, so a product manager has to turn down the usual reasons for adding a feature, good ideas included.",
    stance: "craft",
    stanceBasis: "Says no to features, not to spending.",
  },
  {
    slug: "the-mom-test",
    kind: "canon",
    format: "book",
    title: "The Mom Test",
    authors: ["Rob Fitzpatrick"],
    published: { year: 2013, month: 9 },
    sourceUrl: "https://www.momtestbook.com/",
    argument:
      "Ask customers about what they have actually done, not about your idea, because people lie politely to protect your feelings.",
    stance: "craft",
    stanceBasis: "About interviewing customers.",
  },
  {
    slug: "the-build-trap",
    kind: "canon",
    format: "essay",
    title: "The Build Trap",
    authors: ["Melissa Perri"],
    published: { year: 2014, month: 8 },
    publishedNote: "The blog post. It became the book Escaping the Build Trap in November 2018.",
    sourceUrl: "https://melissaperri.com/blog/2014/08/05/the-build-trap",
    argument:
      "Teams that measure output ship features built on guesses; they need to organise around learning and the outcomes customers get.",
    stance: "craft",
    stanceBasis: "About what a team measures.",
  },
  {
    slug: "the-saas-adventure",
    kind: "investorMemo",
    firm: "Battery Ventures",
    format: "essay",
    title: "The SaaS Adventure",
    authors: ["Neeraj Agrawal"],
    published: { year: 2015, month: 2 },
    sourceUrl: "https://techcrunch.com/2015/02/01/the-saas-travel-adventure/",
    argument:
      "Once a software-as-a-service company reaches about $2M in annual recurring revenue, it should triple revenue twice and then double it three times, hiring a sales leader and a team of reps to get there.",
    stance: "expand",
    stanceBasis: "“triple, triple, double, double, double”",
  },
  {
    slug: "the-alternative-to-roadmaps",
    kind: "canon",
    format: "essay",
    title: "The Alternative to Roadmaps",
    authors: ["Marty Cagan"],
    published: { year: 2015, month: 9 },
    sourceUrl: "https://www.svpg.com/the-alternative-to-roadmaps/",
    argument:
      "Replace feature roadmaps with a product vision, business objectives and team autonomy, so teams answer for outcomes rather than output.",
    stance: "craft",
    stanceBasis: "About how to plan, not how much to spend.",
  },
  {
    slug: "default-alive-or-default-dead",
    kind: "investorMemo",
    firm: "Y Combinator",
    format: "essay",
    title: "Default Alive or Default Dead?",
    authors: ["Paul Graham"],
    published: { year: 2015, month: 10 },
    sourceUrl: "https://paulgraham.com/aord.html",
    argument:
      "Founders should know whether their startup reaches profitability on the money it already has, and the commonest way to fall short is hiring too fast.",
    stance: "conserve",
    stanceBasis: "“don't hire too fast”",
  },
  {
    slug: "mvpm-minimum-viable-product-manager",
    kind: "canon",
    format: "essay",
    title: "MVPM: Minimum Viable Product Manager",
    authors: ["Brandon Chu"],
    published: { year: 2016, month: 4 },
    sourceUrl: "https://blackboxofpm.substack.com/p/mvpm-minimum-viable-product-manager-e1aeb8dd421",
    argument:
      "A syllabus of the minimum a generalist product manager needs across technology, design and business. It is meant to be learned rather than mastered.",
    stance: "craft",
    stanceBasis: "About what a product manager should know.",
  },
  {
    slug: "on-the-road-to-recap",
    kind: "investorMemo",
    firm: "Benchmark",
    format: "essay",
    title: "On the Road to Recap",
    authors: ["Bill Gurley"],
    published: { year: 2016, month: 4 },
    sourceUrl: "https://abovethecrowd.com/2016/04/21/on-the-road-to-recap/",
    argument:
      "Late-stage startups should stop depending on new rounds by reaching profitability on the money they have, and should take a lower valuation over structured terms.",
    stance: "conserve",
    stanceBasis: "“Achieving profitability is the most liberating action a startup can accomplish.”",
  },
  {
    slug: "know-your-customers-jobs-to-be-done",
    kind: "canon",
    format: "essay",
    title: "Know Your Customers' “Jobs to Be Done”",
    authors: ["Clayton M. Christensen", "Taddy Hall", "Karen Dillon", "David S. Duncan"],
    published: { year: 2016, month: 9 },
    sourceUrl: "https://hbr.org/2016/09/know-your-customers-jobs-to-be-done",
    argument:
      "Innovation works better when you understand the progress a customer is trying to make in a situation than when you rely on who the customer is.",
    stance: "craft",
    stanceBasis: "About understanding customers.",
  },
  {
    slug: "why-product-market-fit-isnt-enough",
    kind: "canon",
    format: "essay",
    title: "Why Product Market Fit Isn't Enough",
    authors: ["Brian Balfour"],
    published: { year: 2017, month: 6 },
    sourceUrl: "https://brianbalfour.com/essays/product-market-fit-isnt-enough",
    argument:
      "Growing past $100M takes four fits that depend on each other, not product/market fit alone: market and product, product and channel, channel and model, and model and market.",
    stance: "craft",
    stanceBasis: "About how a growth model fits together, not how fast to fund it.",
  },
  {
    slug: "blitzscaling",
    kind: "canon",
    format: "book",
    title: "Blitzscaling",
    authors: ["Reid Hoffman", "Chris Yeh"],
    published: { year: 2018, month: 10 },
    publishedNote: "The book. Harvard Business Review ran a piece on Hoffman and the idea, by Tim Sullivan, in April 2016.",
    sourceUrl: "https://www.penguinrandomhouse.com/books/557261/blitzscaling-by-reid-hoffman-and-chris-yeh/9781524761417/",
    argument:
      "When a market will go to whoever reaches scale first, a company should put speed ahead of efficiency and grow before the uncertainty is resolved.",
    stance: "expand",
    stanceBasis: "Its publisher's summary: “speed is the only competitive advantage that matters.”",
  },
  {
    slug: "superhuman-product-market-fit-engine",
    kind: "canon",
    format: "essay",
    title: "How Superhuman Built an Engine to Find Product/Market Fit",
    authors: ["Rahul Vohra"],
    published: { year: 2018, month: 11 },
    sourceUrl: "https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/",
    argument:
      "Treat product/market fit as a number: the share of users who would be very disappointed without you. Raise it by building for the users who already love the product.",
    stance: "craft",
    stanceBasis: "About measuring fit.",
  },
  {
    slug: "the-making-of-a-manager",
    kind: "canon",
    format: "book",
    title: "The Making of a Manager",
    authors: ["Julie Zhuo"],
    published: { year: 2019, month: 3 },
    sourceUrl: "https://www.juliezhuo.com/book/manager.html",
    argument: "A working guide for new managers, built on purpose, people and process. Feedback, hiring and meetings serve those three.",
    stance: "craft",
    stanceBasis: "About managing people.",
  },
  {
    slug: "product-led-growth",
    kind: "canon",
    format: "book",
    title: "Product-Led Growth",
    authors: ["Wes Bush"],
    published: { year: 2019, month: 5 },
    sourceUrl: "https://www.amazon.com/Product-Led-Growth-Build-Product-Itself/dp/1798434520",
    argument:
      "Through free trials or a free tier, a product can carry its own acquisition, conversion and expansion instead of leaving them to a sales team.",
    stance: "craft",
    stanceBasis: "About how a product sells, not how much to spend selling it.",
  },
  {
    slug: "intercom-product-management-career-ladder",
    kind: "canon",
    format: "essay",
    title: "Steps to success: the importance of a clear career path for product managers",
    authors: ["Jane Honey", "Brian Donohue"],
    published: { year: 2019, month: 6 },
    sourceUrl: "https://www.intercom.com/blog/evolving-your-product-management-career-ladder/",
    argument:
      "Intercom published its product manager career ladder so expectations and promotion are explicit. It sets five skill areas across levels from associate to principal.",
    stance: "craft",
    stanceBasis: "About career paths.",
  },
  {
    slug: "shape-up",
    kind: "canon",
    format: "book",
    title: "Shape Up",
    authors: ["Ryan Singer"],
    published: { year: 2019, month: 7 },
    publishedNote: "The free online edition. A print edition followed.",
    sourceUrl: "https://basecamp.com/shapeup",
    argument:
      "Work in fixed six-week cycles with variable scope: shape the work first, bet on it instead of keeping a backlog, and let the team own the build.",
    stance: "craft",
    stanceBasis: "About how to schedule work.",
  },
  {
    slug: "how-to-kickstart-and-scale-a-marketplace",
    kind: "canon",
    format: "essay",
    title: "How to kickstart and scale a marketplace business",
    authors: ["Lenny Rachitsky"],
    published: { year: 2019, month: 11 },
    sourceUrl: "https://www.lennysnewsletter.com/p/how-to-kickstart-and-scale-a-marketplace",
    argument:
      "Nearly every marketplace that worked started by narrowing its geography or category until it reached critical mass, and expanded from there.",
    stance: "craft",
    stanceBasis: "An order for reaching critical mass, with no budget attached.",
  },
  {
    slug: "product-strategy-overview",
    kind: "canon",
    format: "essay",
    title: "Product Strategy – Overview",
    authors: ["Marty Cagan"],
    published: { year: 2020, month: 2 },
    sourceUrl: "https://www.svpg.com/product-strategy-overview/",
    argument:
      "Product strategy is deciding which problems to solve. It means focusing, drawing insight from data and customers, turning that insight into team objectives and managing the result.",
    stance: "craft",
    stanceBasis: "About choosing problems.",
  },
  {
    slug: "coronavirus-the-black-swan-of-2020",
    kind: "investorMemo",
    firm: "Sequoia Capital",
    format: "essay",
    title: "Coronavirus: The Black Swan of 2020",
    authors: [],
    published: { year: 2020, month: 3 },
    sourceUrl: "https://www.sequoiacap.com/article/coronavirus-the-black-swan-of-2020/",
    argument:
      "Founders and CEOs should test how long their runway really is, look for spending and headcount they could cut, and expect private funding to be harder to raise.",
    stance: "conserve",
    stanceBasis: "Asks whether the runway survives a few poor quarters and which costs could go.",
  },
  {
    slug: "the-burn-multiple",
    kind: "investorMemo",
    firm: "Craft Ventures",
    format: "essay",
    title: "The Burn Multiple",
    authors: ["David Sacks"],
    published: { year: 2020, month: 4 },
    sourceUrl: "https://sacks.substack.com/p/the-burn-multiple-51a7e43cb200",
    argument:
      "Judge capital efficiency by net burn divided by net new annual recurring revenue; a high multiple is a warning, and it should fall as a company matures.",
    stance: "conserve",
    stanceBasis: "“keep salaries and expenses low in the early days”",
  },
  {
    slug: "its-time-to-build",
    kind: "investorMemo",
    firm: "Andreessen Horowitz",
    format: "essay",
    title: "It's Time to Build",
    authors: ["Marc Andreessen"],
    published: { year: 2020, month: 4 },
    sourceUrl: "https://a16z.com/its-time-to-build/",
    argument:
      "Calls for building housing, manufacturing, health care, education and transportation, and asks the same of political leaders, CEOs, entrepreneurs and investors.",
    stance: "expand",
    stanceBasis: "Backs “aggressive investment in new products, in new industries, in new factories” over buybacks.",
  },
  {
    slug: "empowered",
    kind: "canon",
    format: "book",
    title: "Empowered",
    authors: ["Marty Cagan", "Chris Jones"],
    published: { year: 2020, month: 12 },
    sourceUrl: "https://www.wiley.com/en-us/EMPOWERED:+Ordinary+People,+Extraordinary+Products-p-9781119691297",
    argument:
      "Strong products come from teams given problems to solve rather than features to build, and from leaders who coach them.",
    stance: "craft",
    stanceBasis: "About team structure and coaching.",
  },
  {
    slug: "continuous-discovery-habits",
    kind: "canon",
    format: "book",
    title: "Continuous Discovery Habits",
    authors: ["Teresa Torres"],
    published: { year: 2021, month: 5 },
    publishedNote: "The book. The opportunity solution tree it is built around was first published in 2016.",
    sourceUrl: "https://www.producttalk.org/continuous-discovery-habits/",
    argument:
      "Talk to customers every week. Map the outcome you want to the opportunities and solutions beneath it, and test assumptions as you go.",
    stance: "craft",
    stanceBasis: "About discovery habits.",
  },
  {
    slug: "the-upside-of-a-downturn",
    kind: "investorMemo",
    firm: "Lightspeed Venture Partners",
    format: "essay",
    title: "The Upside of a Downturn",
    authors: [],
    published: { year: 2022, month: 5 },
    sourceUrl: "https://lsvp.com/stories/the-upside-of-a-downturn/",
    argument:
      "Founders should not plan on new funding in 2022 or 2023, should slow hiring and drop initiatives outside the core, and should become self-sustaining within six months.",
    stance: "conserve",
    stanceBasis: "Recommends reaching “default alive” within six months.",
  },
  {
    slug: "adapting-to-endure",
    kind: "investorMemo",
    firm: "Sequoia Capital",
    format: "essay",
    title: "Adapting to Endure",
    authors: [],
    published: { year: 2022, month: 5 },
    publishedNote: "Presented to Sequoia's founders on May 16, 2022. Sequoia posted it publicly on June 14, 2022.",
    sourceUrl: "https://www.sequoiacap.com/article/adapting-to-endure/",
    argument:
      "Founders should face the downturn early and prepare cuts to projects, R&D and marketing that they could make within 30 days.",
    stance: "conserve",
    stanceBasis: "“Do the cut exercise (projects, R&D, marketing, other expenses).”",
  },
  {
    slug: "update-on-metas-year-of-efficiency",
    kind: "canon",
    format: "essay",
    title: "Update on Meta's Year of Efficiency",
    authors: ["Mark Zuckerberg"],
    published: { year: 2023, month: 3 },
    publishedNote: "Meta named 2023 its year of efficiency in its February 2023 earnings release. This is the plan that followed.",
    sourceUrl: "https://about.fb.com/news/2023/03/mark-zuckerberg-meta-year-of-efficiency/",
    argument:
      "Meta would cut about 10,000 jobs, close about 5,000 open roles, remove layers of management and cancel lower-priority projects.",
    stance: "conserve",
    stanceBasis: "“we expect to reduce our team size by around 10,000 people”",
  },
  {
    slug: "the-product-momentum-gap",
    kind: "canon",
    format: "book",
    title: "The Product Momentum Gap",
    authors: ["Dave Martin", "Andrea Saez"],
    published: { year: 2023, month: 10 },
    sourceUrl: "https://www.amazon.com/Product-Momentum-Gap-Bringing-together/dp/B0CK9Y3V28",
    argument:
      "Momentum stalls when product strategy and customer value drift apart, and teams need practices that keep the two joined.",
    stance: "craft",
    stanceBasis: "About joining strategy to customer value.",
  },
  {
    slug: "the-ai-product-playbook",
    kind: "canon",
    format: "book",
    title: "The AI Product Playbook",
    authors: ["Marily Nika", "Diego Granados"],
    published: { year: 2025, month: 9 },
    publishedNote: "The e-book. Print followed in October 2025.",
    sourceUrl:
      "https://www.wiley.com/en-us/The+AI+Product+Playbook:+Strategies,+Skills,+and+Frameworks+for+the+AI-Driven+Product+Manager-p-00440656",
    argument: "The skills and frameworks a product manager needs to build and run products that depend on AI.",
    stance: "craft",
    stanceBasis: "About a product manager's skills.",
  },
];

/** A month on the record, as the timeline needs it. */
export type RecordMonth = Pick<TimeMachineRegimeEntry, "year" | "month" | "recordDate" | "regime" | "tightness" | "riskAppetite">;

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
      /** The two scores at that month-end, 0–100. */
      fundingPressure: number;
      riskAppetite: number;
      /** Months since each score last crossed its change line; null when it had not crossed on the record. */
      monthsSinceFundingPressureCrossed: number | null;
      monthsSinceRiskAppetiteCrossed: number | null;
    };

export type CanonTimelineEntry = CanonEssay & { reading: CanonReading };
export type PlacedEntry = CanonTimelineEntry & { reading: Extract<CanonReading, { kind: "reading" }> };

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);

const byPublished = (left: CanonEssay, right: CanonEssay) =>
  monthIndex(left.published.year, left.published.month) - monthIndex(right.published.year, right.published.month)
  || left.title.localeCompare(right.title);

/* The two change lines, and the quadrant rule's sides: above a line is strictly
   above it, as in `regimeAtCoordinates` (lib/regimePhaseSpace.ts). The page's
   chart draws the same two values. */
export const canonChangeLines = {
  fundingPressure: DEFAULT_THRESHOLDS.tightnessRegime,
  riskAppetite: DEFAULT_THRESHOLDS.riskAppetiteRegime,
};

/** Months back from `index` to the month a score first sat on its current side of the line. */
const monthsSinceCrossing = (series: readonly RecordMonth[], index: number, score: (entry: RecordMonth) => number, line: number) => {
  const side = (entry: RecordMonth) => score(entry) > line;
  for (let at = index; at > 0; at -= 1) {
    if (side(series[at]) !== side(series[at - 1])) return index - at;
  }
  return null;
};

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
    fundingPressure: entry.tightness,
    riskAppetite: entry.riskAppetite,
    monthsSinceFundingPressureCrossed: monthsSinceCrossing(series, index, (month) => month.tightness, canonChangeLines.fundingPressure),
    monthsSinceRiskAppetiteCrossed: monthsSinceCrossing(series, index, (month) => month.riskAppetite, canonChangeLines.riskAppetite),
  };
};

export const buildCanonTimeline = (
  series: readonly RecordMonth[],
  essays: readonly CanonEssay[] = canonEssays,
): CanonTimelineEntry[] =>
  [...essays]
    .sort(byPublished)
    .map((essay) => ({ ...essay, reading: readingForMonth(series, essay.published.year, essay.published.month) }));

export const isPlacedCanonEntry = (entry: CanonTimelineEntry): entry is PlacedEntry => entry.reading.kind === "reading";

type StanceCount = { count: number; share: number };

type CanonBaseRateRow = {
  regime: RegimeKey;
  conditions: string;
  months: number;
  /** Share of months on record, 0–1. */
  monthShare: number;
  /** Texts of each kind published in these conditions, and their share of that kind's placed texts. */
  byStance: Record<AdviceStance, StanceCount>;
};

type CanonBaseRate = {
  rows: CanonBaseRateRow[];
  monthsOnRecord: number;
  /** Texts of each kind that have a reading: the denominators of `byStance`. */
  placed: Record<AdviceStance, number>;
  beforeRecord: number;
};

const stanceRecord = <T>(build: (stance: AdviceStance) => T): Record<AdviceStance, T> => ({
  expand: build("expand"),
  conserve: build("conserve"),
  craft: build("craft"),
});

/**
 * Where each kind of advice fell, beside where the months fell. The comparison
 * is the point: a share of texts means nothing without the share of time those
 * conditions held, and capital advice means nothing without craft advice beside
 * it, which is the list's own control.
 */
export const buildCanonBaseRate = (
  series: readonly RecordMonth[],
  timeline: readonly CanonTimelineEntry[],
): CanonBaseRate => {
  const placedEntries = timeline.filter(isPlacedCanonEntry);
  const placed = stanceRecord((stance) => placedEntries.filter((entry) => entry.stance === stance).length);
  const rows = REGIME_ORDER.map((regime) => {
    const months = series.filter((entry) => entry.regime === regime).length;
    return {
      regime,
      conditions: getRegimePublicLabel(regime),
      months,
      monthShare: series.length > 0 ? months / series.length : 0,
      byStance: stanceRecord((stance) => {
        const count = placedEntries.filter((entry) => entry.stance === stance && entry.reading.regime === regime).length;
        return { count, share: placed[stance] > 0 ? count / placed[stance] : 0 };
      }),
    };
  });
  return {
    rows,
    monthsOnRecord: series.length,
    placed,
    beforeRecord: timeline.filter((entry) => entry.reading.kind === "before-record").length,
  };
};

export const formatCanonShare = (share: number) => `${Math.round(share * 100)}%`;

/* The conditions the question pairs with each kind: expand with Sunny months,
   conserve with Freezing and Stormy ones (risk appetite under its line). */
const EXPAND_CONDITIONS: readonly RegimeKey[] = ["EXPANSION"];
const CONSERVE_CONDITIONS: readonly RegimeKey[] = ["SCARCITY", "VOLATILE"];

const shareIn = (baseRate: CanonBaseRate, regimes: readonly RegimeKey[], pick: (row: CanonBaseRateRow) => number) =>
  baseRate.rows.filter((row) => regimes.includes(row.regime)).reduce((sum, row) => sum + pick(row), 0);

/** The shares the section lead states, so a test can hold the sentence to them. */
export const summarizeCanonBaseRate = (baseRate: CanonBaseRate) => {
  const sunnyMonths = shareIn(baseRate, EXPAND_CONDITIONS, (row) => row.monthShare);
  const hardMonths = shareIn(baseRate, CONSERVE_CONDITIONS, (row) => row.monthShare);
  return {
    sunnyMonths,
    hardMonths,
    expand: { inSunny: shareIn(baseRate, EXPAND_CONDITIONS, (row) => row.byStance.expand.count), of: baseRate.placed.expand },
    conserve: { inHard: shareIn(baseRate, CONSERVE_CONDITIONS, (row) => row.byStance.conserve.count), of: baseRate.placed.conserve },
    craft: {
      inSunny: shareIn(baseRate, EXPAND_CONDITIONS, (row) => row.byStance.craft.count),
      inHard: shareIn(baseRate, CONSERVE_CONDITIONS, (row) => row.byStance.craft.count),
      of: baseRate.placed.craft,
    },
  };
};

/** Ten points either way counts as a lean; anything closer is "about the same". */
const LEAN = 0.1;

/**
 * The section lead: what the shares show, in sentences, with the verdict the
 * numbers support and the sample size beside it. Never a cause.
 */
export const describeCanonBaseRate = (baseRate: CanonBaseRate): string => {
  const summary = summarizeCanonBaseRate(baseRate);
  const { expand, conserve, craft } = summary;
  if (baseRate.monthsOnRecord === 0 || expand.of + conserve.of === 0) {
    return "No capital text falls inside the record, so there is nothing to compare.";
  }
  const expandShare = expand.of > 0 ? expand.inSunny / expand.of : 0;
  const conserveShare = conserve.of > 0 ? conserve.inHard / conserve.of : 0;
  const craftSunny = craft.of > 0 ? craft.inSunny / craft.of : 0;
  const craftHard = craft.of > 0 ? craft.inHard / craft.of : 0;
  const expandLeans = expand.of > 0 && expandShare - summary.sunnyMonths >= LEAN;
  const conserveLeans = conserve.of > 0 && conserveShare - summary.hardMonths >= LEAN;
  const craftTracks = Math.abs(craftSunny - summary.sunnyMonths) < LEAN && Math.abs(craftHard - summary.hardMonths) < LEAN;

  const sentences = [
    `Sunny months make up ${formatCanonShare(summary.sunnyMonths)} of the record, and Freezing or Stormy months ${formatCanonShare(summary.hardMonths)}.`,
    expand.of > 0
      ? `Of the ${expand.of} texts tagged ${ADVICE_STANCE_DEFINITIONS.expand.label}, ${expand.inSunny} came out in a Sunny month (${formatCanonShare(expandShare)}).`
      : null,
    conserve.of > 0
      ? `Of the ${conserve.of} tagged ${ADVICE_STANCE_DEFINITIONS.conserve.label}, ${conserve.inHard} came out in a Freezing or Stormy month (${formatCanonShare(conserveShare)}).`
      : null,
    craft.of > 0
      ? `Craft texts came out ${formatCanonShare(craftSunny)} in Sunny months and ${formatCanonShare(craftHard)} in Freezing or Stormy ones${craftTracks ? ", close to the months themselves" : ""}.`
      : null,
  ];

  const smaller = Math.min(...[expand.of, conserve.of].filter((count) => count > 0));
  const larger = Math.max(expand.of, conserve.of);
  const swing =
    smaller === larger
      ? `one text more or less moves a share by ${Math.round(100 / larger)} points`
      : `one text more or less moves a share by ${Math.round(100 / larger)} to ${Math.round(100 / smaller)} points`;
  const verdict =
    expandLeans && conserveLeans && craftTracks
      ? "On this sample, capital advice leans with the conditions and craft advice does not."
      : expandLeans && conserveLeans
        ? "On this sample, capital advice leans with the conditions. Craft advice departs from the months too, so the comparison is weaker."
        : expandLeans || conserveLeans
          ? `On this sample, only ${expandLeans ? "expand" : "conserve"} advice leans with the conditions.`
          : "On this sample, capital advice does not lean with the conditions.";
  return [...sentences.filter((sentence) => sentence !== null), verdict, `With ${expand.of + conserve.of} capital texts, ${swing}.`].join(" ");
};

/** Essays written in the given conditions, oldest first. */
export const essaysWrittenIn = (timeline: readonly CanonTimelineEntry[], regime: RegimeKey) =>
  timeline.filter((entry) => entry.reading.kind === "reading" && entry.reading.regime === regime);

/** "A", "A and B", "A, B and C"; a memo the firm signed is bylined to the firm, and a partner's memo adds the firm. */
export const formatCanonAuthors = (essay: Pick<CanonEssay, "authors"> & { firm?: string }) => {
  const people =
    essay.authors.length <= 2
      ? essay.authors.join(" and ")
      : `${essay.authors.slice(0, -1).join(", ")} and ${essay.authors[essay.authors.length - 1]}`;
  if (!essay.firm) return people;
  return people ? `${people}, ${essay.firm}` : essay.firm;
};

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
