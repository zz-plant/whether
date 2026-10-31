import { stageGuides } from "./stageGuides";
import { decisionAreaOrder, type DecisionArea } from "../../lib/report/boundedDecisionRules";

/*
 * Written for the person in the role, about what they would do differently this
 * week. The first version was the register a reader now recognises as machine
 * copy: "alignment architecture", "narrative infrastructure", "planning
 * entropy", a "Promotion accelerant" block with career ladders drawn in arrows,
 * eight bullets per role that restated one idea eight ways, and a positioning
 * line per role ("Founder/CEO → Lead with clarity."). Each bullet here names a
 * thing the reader can do with a pause line, a restart line or the weekly
 * reading.
 *
 * `hearing` is the other half of the same job (2026-10-31): the questions the
 * published lines tend to bring once a reader takes them into a room, and the
 * answer each one already has. The question is written as the group asks it,
 * never as a claim about the reader's company — "How do we decide a hire is
 * safe…", not "Why are you still hiring…" — so a reader without that group, or
 * without that problem, is not told what their week looks like. The answer
 * restates a published line; it never promises an outcome.
 */
type StakeholderHearing = {
  /** Who is speaking: the function or group, never "your <role>". */
  from: string;
  /** The question, in the group's voice. Ends in a question mark. */
  question: string;
  /** What the published line says back, in one sentence. */
  answer: string;
  /**
   * The area whose line the question is about, where it is about one. The
   * homepage shows the questions whose area has a crossed pause line this week;
   * a question about the whole set of lines (or about a plan, a pack or a
   * quarter) carries none.
   */
  area?: DecisionArea;
};

type StakeholderGuide = {
  slug: string;
  title: string;
  /** Two or three characters for the thread badge; decorative, never the name. */
  avatar: string;
  tagline: string;
  bullets: readonly string[];
  hearing: readonly StakeholderHearing[];
  stageSpecificContent: readonly {
    stageSlug: (typeof stageGuides)[number]["slug"];
    guidance: string;
  }[];
};

export const stakeholderGuides: readonly StakeholderGuide[] = [
  {
    slug: "founders-ceos",
    title: "Founders and CEOs",
    avatar: "CEO",
    tagline: "Decide what to hire, spend and raise this week, and say why in one line.",
    bullets: [
      "Check the pause line before approving a hire or a large contract.",
      "Time a raise against how hard money is to get, not against the news.",
      "Give the leadership team one reading to argue from on Monday.",
      "Send investors the same guidance you are running the company on.",
    ],
    hearing: [
      {
        from: "Finance",
        question: "How do we decide a hire is safe while the hiring pause line is crossed?",
        answer: "Name the restart line the role waits on, and the date it last cleared.",
        area: "hiring",
      },
      {
        from: "Leadership team",
        question: "Which of the five areas is binding this quarter?",
        answer: "Whichever area's pause line is crossed. The others stay on their own lines.",
      },
      {
        from: "Team",
        question: "Are we stopping everything, or just hiring?",
        answer: "Each area pauses on its own line, so read that area before changing its plan.",
      },
    ],
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance:
          "Use it to time the raise and to answer \"why now\". Product and customers still decide the roadmap.",
      },
      {
        stageSlug: "series-a",
        guidance:
          "Set hiring and burn rules for the next six to eight weeks, and write down what would loosen them.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Agree one set of pause and restart lines with your finance lead, so planning arguments start from the same numbers.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Keep the same lines quarter to quarter, so board updates and large approvals are judged against a record.",
      },
    ],
  },
  {
    slug: "heads-of-product",
    title: "Heads of product",
    avatar: "Prod",
    tagline: "Pace the roadmap to how much money there is to spend.",
    bullets: [
      "Put short-payback work first while funding pressure is above its pause line.",
      "Defer long bets until the restart line clears, and say which line you are waiting on.",
      "Argue for scope with the same numbers finance is using.",
      "Cut burn through what you choose to build, not only through budget cuts.",
    ],
    hearing: [
      {
        from: "CEO",
        question: "Which roadmap work survives a tight quarter?",
        answer: "Short payback first; long bets wait for the restart line.",
        area: "product-tempo",
      },
      {
        from: "Sales",
        question: "Can we still commit to a launch date?",
        answer: "Only if the launch needs no new spend. Otherwise name the line it waits on.",
        area: "product-tempo",
      },
      {
        from: "Finance",
        question: "Why does scope keep moving when the numbers move?",
        answer: "Scope follows the spending line. Ask which line moved, and when.",
        area: "burn-discipline",
      },
    ],
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance: "Keep it simple: tie roadmap ambition to runway. Customers still set the priorities.",
      },
      {
        stageSlug: "series-a",
        guidance: "Order the work by payback: short first, long bets only once conditions improve.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Bring the pause and restart lines to roadmap reviews, so the debate is about numbers rather than people.",
      },
      {
        stageSlug: "series-c",
        guidance: "Write exit criteria into multi-quarter commitments, so they hold up when the board asks.",
      },
    ],
  },
  {
    slug: "finance-leaders",
    title: "CFOs and finance leads",
    avatar: "CFO",
    tagline: "Turn rates and risk appetite into spending rules other teams can follow.",
    bullets: [
      "Give each area a pause line and a restart line instead of a blanket freeze.",
      "Set hiring and spend limits that move when the reading moves, not when someone panics.",
      "Show the board an outside reference for why the plan is tight or loose.",
      "Replace everyone's own take on the economy with one weekly reading anyone can check.",
    ],
    hearing: [
      {
        from: "CEO",
        question: "Can we afford the plan we already approved?",
        answer: "Check it against each area's pause line, then say where spend holds and where it stops.",
        area: "burn-discipline",
      },
      {
        from: "Board",
        question: "What number would make us loosen this?",
        answer: "The restart line for that area, and the date it last cleared.",
        area: "burn-discipline",
      },
      {
        from: "Budget owners",
        question: "Why does one budget move and not the others?",
        answer: "Each area moves on its own line, and only when that line is crossed.",
        area: "burn-discipline",
      },
    ],
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance: "Keep it light. It helps with fundraising timing; don't build a model around it.",
      },
      {
        stageSlug: "series-a",
        guidance: "Set hiring and spend limits so burn does not grow ahead of repeatable revenue.",
      },
      {
        stageSlug: "series-b",
        guidance: "Agree one baseline with the CEO and the head of product, so the numbers shape the roadmap early.",
      },
      {
        stageSlug: "series-c",
        guidance: "Use the same lines and wording every quarter, so the board can compare like with like.",
      },
    ],
  },
  {
    slug: "strategy-chief-of-staff",
    title: "Strategy and chiefs of staff",
    avatar: "CoS",
    tagline: "Get the leadership team working from the same reading before planning starts.",
    bullets: [
      "Open planning with this week's guidance, so trade-offs start from agreed limits.",
      "Keep board and investor material consistent with what the company is actually doing.",
      "Note which decisions were made under which conditions, and revisit them when a line moves.",
      "Spend less time settling whose view of the market wins.",
    ],
    hearing: [
      {
        from: "CEO",
        question: "Do we need a new plan, or the same plan with new numbers?",
        answer: "Same plan, re-cut for the areas whose lines moved.",
      },
      {
        from: "Board",
        question: "What changed since the last pack?",
        answer: "One line per area, with the date each moved.",
      },
      {
        from: "Leadership team",
        question: "Who owns the decision when a line is crossed?",
        answer: "The area owner, against the line agreed before the crossing.",
      },
    ],
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance: "Keep investor updates calm and consistent with one line on market conditions.",
      },
      {
        stageSlug: "series-a",
        guidance: "Circulate a short note every six to eight weeks, before quarterly plans are drafted.",
      },
      {
        stageSlug: "series-b",
        guidance: "Use the weekly reading as the shared starting point for planning across teams.",
      },
      {
        stageSlug: "series-c",
        guidance: "Carry the same wording through executive reviews, board prep and investor updates.",
      },
    ],
  },
  {
    slug: "vps-of-engineering",
    title: "Engineering leads",
    avatar: "Eng",
    tagline: "Match hiring and infrastructure spend to what the company can afford.",
    bullets: [
      "Favour reliability and cost work when money is tight, and delivery speed when it is not.",
      "Hold off on infrastructure built for scale you have not reached.",
      "Back hiring plans with the reading finance and product also use.",
      "Change the plan when a line is crossed, not when the mood changes.",
    ],
    hearing: [
      {
        from: "Product",
        question: "Can we keep the delivery date with a smaller team?",
        answer: "Say what comes off scope first, and which line protects it.",
        area: "product-tempo",
      },
      {
        from: "Finance",
        question: "Why does reliability cost more in a tight quarter?",
        answer: "It is the spend that stays when growth spend stops.",
        area: "burn-discipline",
      },
      {
        from: "Hiring manager",
        question: "Can we add the engineers we planned?",
        answer: "Only if the hiring line has cleared, and say when it last did.",
        area: "hiring",
      },
    ],
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance: "Stay lean and ship. Spend on reliability only where customers feel it.",
      },
      {
        stageSlug: "series-a",
        guidance: "Set team-size limits that keep roadmap and reliability promises realistic.",
      },
      {
        stageSlug: "series-b",
        guidance:
          "Tie engineering spend to the same lines as the rest of the company, so growth pushes and cuts are judged against the same lines.",
      },
      {
        stageSlug: "series-c",
        guidance: "Use the lines to set hiring bars and to approve large infrastructure spend.",
      },
    ],
  },
  {
    slug: "boards-investors",
    title: "Boards and investors",
    avatar: "Bd",
    tagline: "See whether management's plan fits the conditions it is operating in.",
    bullets: [
      "Judge hiring pace and burn against how hard money is to raise right now.",
      "Ask management which line would change their plan, and check it next quarter.",
      "Judge a tightening against lines agreed before it, not against the mood in the room.",
      "Back expansion when conditions allow it, and restraint when they don't.",
    ],
    hearing: [
      {
        from: "Management",
        question: "What would make the team change this plan?",
        answer: "The restart line for the area, and the date it was last crossed.",
      },
      {
        from: "Other directors",
        question: "Is the team consistent quarter to quarter?",
        answer: "Compare the lines and the wording across quarters.",
      },
      {
        from: "Management",
        question: "Is this a market cut or a results cut?",
        answer: "The line says which. Results are the other half.",
      },
    ],
    stageSpecificContent: [
      {
        stageSlug: "seed",
        guidance: "Don't over-weight it: at seed, product and customers should set direction.",
      },
      {
        stageSlug: "series-a",
        guidance: "Watch whether management keeps to its hiring and burn limits under pressure.",
      },
      {
        stageSlug: "series-b",
        guidance: "Expect written pause and restart lines, and planning assumptions shared across teams.",
      },
      {
        stageSlug: "series-c",
        guidance: "How consistently the lines are kept over time is a fair test of how the company is run.",
      },
    ],
  },
] as const;

export const findStakeholderGuide = (slug: string) =>
  stakeholderGuides.find((guide) => guide.slug === slug);

/**
 * The questions this week's crossed lines invite, for the homepage.
 *
 * One per area, in the order the areas print, then one per group and one per
 * speaker: two bubbles headed "Finance" in the same card read as one voice
 * asking twice. A question about the whole set of lines (a plan, a pack, a
 * quarter) carries no `area` and is never selected here — the homepage shows
 * what this week's crossed lines bring and says nothing on a week none are.
 */
export const selectHearingForAreas = (
  crossedAreas: readonly DecisionArea[],
  limit = 3,
): { guide: StakeholderGuide; hearing: StakeholderHearing }[] => {
  const crossed = new Set(crossedAreas);
  const picks: { guide: StakeholderGuide; hearing: StakeholderHearing }[] = [];
  const usedGroups = new Set<string>();
  const usedSpeakers = new Set<string>();

  for (const area of decisionAreaOrder) {
    if (!crossed.has(area)) continue;
    for (const guide of stakeholderGuides) {
      if (usedGroups.has(guide.slug)) continue;
      const hearing = guide.hearing.find((entry) => entry.area === area && !usedSpeakers.has(entry.from));
      if (!hearing) continue;
      picks.push({ guide, hearing });
      usedGroups.add(guide.slug);
      usedSpeakers.add(hearing.from);
      break;
    }
    if (picks.length >= limit) break;
  }

  return picks;
};
