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
 * `hearing` is the other half of the same job (2026-10-31): the pushback,
 * competing takes, rationalizations and questions that come up once a reader
 * takes the published lines into a room, and what the line says back. The
 * prompt is written in the speaker's own voice — an objection ("This role is
 * too important to wait…"), a market take ("Public markets bounced this
 * month…") or a direct question ("Are we pausing everything, or just
 * hiring?") — so the reader is ready for what people actually say, not only for
 * polite questions about the rules. The speaker is a function, never "your
 * CFO". Every reply restates a published line and promises no outcome.
 */
type StakeholderHearing = {
  /** Who is speaking: the function or group, never "your <role>". */
  from: string;
  /** What the group tends to say in the room: pushback, a take or a question. */
  question: string;
  /** What to say back from the published line, in one or two sentences. */
  answer: string;
  /**
   * The area whose line the exchange is about, where it is about one. The
   * homepage shows the exchanges whose area has a crossed pause line this week;
   * one about the whole set of lines (or about a plan, a pack or a quarter)
   * carries none.
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
      "Check whether hiring is paused before approving a hire or a large contract.",
      "Time a raise against how hard money is to get, not against the news.",
      "Give the leadership team one reading to argue from on Monday.",
      "Send investors the same guidance you are running the company on.",
    ],
    hearing: [
      {
        from: "Hiring manager",
        question: "This role is too important to wait — leaving it open will cost us the quarter.",
        answer: "While hiring is paused, only backfills that protect current revenue go through. New roles wait until hiring restarts.",
        area: "hiring",
      },
      {
        from: "Leadership team",
        question: "Competitors are still spending on new bets. If we hold back now, we'll fall behind.",
        answer: "Let them spend pricey money. Keep new bets small and reversible until new bets restart.",
        area: "expansion-bets",
      },
      {
        from: "Team",
        question: "Are we pausing everything, or just hiring?",
        answer: "Each area pauses and restarts on its own terms, so check that area before changing its plan.",
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
          "Agree when each area pauses and restarts with your finance lead, so planning arguments start from the same numbers.",
      },
      {
        stageSlug: "series-c",
        guidance:
          "Keep the same pause and restart points quarter to quarter, so board updates and large approvals are judged against a record.",
      },
    ],
  },
  {
    slug: "heads-of-product",
    title: "Heads of product",
    avatar: "Prod",
    tagline: "Pace the roadmap to how much money there is to spend.",
    bullets: [
      "Put short-payback work first while funding pressure is high.",
      "Defer long bets until new bets restart, and say which score you are waiting on.",
      "Argue for scope with the same numbers finance is using.",
      "Cut burn through what you choose to build, not only through budget cuts.",
    ],
    hearing: [
      {
        from: "Sales",
        question: "We already promised a customer this feature for the quarter — we can't push it back.",
        answer: "If the current team can ship it with a short payback, keep it. If it needs new spend, name the score it waits on.",
        area: "product-tempo",
      },
      {
        from: "Leadership team",
        question: "We need a big new product bet on the roadmap to show growth for the next round.",
        answer: "While new bets are paused, order the roadmap by payback speed and keep new bets to small trials.",
        area: "expansion-bets",
      },
      {
        from: "Finance",
        question: "Why are we still funding product experiments when spending is on hold?",
        answer: "Long-payback bets are paused; short-payback work that protects existing revenue stays on the roadmap.",
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
          "Bring each area's pause and restart numbers to roadmap reviews, so the debate is about numbers rather than people.",
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
      "Give each area its own point to pause and to restart instead of a blanket freeze.",
      "Set hiring and spend limits that move when the reading moves, not when someone panics.",
      "Show the board an outside reference for why the plan is tight or loose.",
      "Replace everyone's own take on the economy with one weekly reading anyone can check.",
    ],
    hearing: [
      {
        from: "Investors",
        question: "Public markets bounced this month — we should go out and raise now.",
        answer: "One warm week isn't spring. Wait until both scores meet fundraising's restart condition before opening a round.",
        area: "capital-raising",
      },
      {
        from: "Budget owners",
        question: "This spend was already in the approved annual plan — why is it on hold now?",
        answer: "An approved budget sets the ceiling; the pause sets the timing. Uncommitted spend waits until spending restarts.",
        area: "burn-discipline",
      },
      {
        from: "Board",
        question: "What number would make us loosen the plan and lean back in?",
        answer: "Each area restarts on its own condition, not on a calendar date or a single headline.",
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
        guidance: "Set hiring and spend limits so burn cannot grow ahead of repeatable revenue.",
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
      "Keep board and investor material consistent with what the company is doing.",
      "Note which decisions were made under which conditions, and revisit them when an area pauses or restarts.",
      "Spend less time settling whose view of the market wins.",
    ],
    hearing: [
      {
        from: "Department leads",
        question: "Our internal numbers look fine — why let outside interest rates slow our plan?",
        answer: "Internal results set what we can afford today; the cost of money sets how hard the next dollar is to raise.",
        area: "burn-discipline",
      },
      {
        from: "Leadership team",
        question: "We just set quarterly goals three weeks ago. Changing them now will whiplash the team.",
        answer: "Keep the goals and adjust pacing only in the areas that paused, as agreed in advance.",
        area: "expansion-bets",
      },
      {
        from: "Board",
        question: "What changed since the last pack?",
        answer: "One line per area: which score moved, whether the area paused or restarted, and the date.",
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
      "Change the plan when an area pauses or restarts, not when the mood changes.",
    ],
    hearing: [
      {
        from: "Product",
        question: "Can we still keep the delivery date even though the new engineering hires are on hold?",
        answer: "Only by trimming scope to what the current team can ship cleanly. Name what comes off the list while hiring is paused.",
        area: "product-tempo",
      },
      {
        from: "Finance",
        question: "Cloud and tooling costs keep creeping up — why can't we pause reliability work this quarter?",
        answer: "Infrastructure built ahead of demand pauses; reliability work that keeps current customers paying stays.",
        area: "burn-discipline",
      },
      {
        from: "Engineers",
        question: "On-call is stretched thin. When do we open hiring again?",
        answer: "When hiring restarts. Until then, slow feature tempo rather than burning out the team.",
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
          "Tie engineering spend to the same pause and restart points as the rest of the company, so growth pushes and cuts are judged alike.",
      },
      {
        stageSlug: "series-c",
        guidance: "Use the hiring and spending pauses to set hiring bars and to approve large infrastructure spend.",
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
      "Ask management which number would change their plan, and check it next quarter.",
      "Judge a tightening against terms agreed before it, not against the mood in the room.",
      "Back expansion when conditions allow it, and restraint when they don't.",
    ],
    hearing: [
      {
        from: "Other directors",
        question: "Every portfolio company is cutting right now — should management cut 20% across the board too?",
        answer: "Blanket cuts punish working products. Check whether each area is paused, and your runway, before cutting across the board.",
        area: "burn-discipline",
      },
      {
        from: "Management",
        question: "Competitors are pulling back, so this is our chance to spend aggressively and take share.",
        answer: "Taking share works when unit economics already clear the bar and runway covers the bet. Check that new bets aren't paused first.",
        area: "expansion-bets",
      },
      {
        from: "Co-investors",
        question: "Is the team slowing down because the market tightened or because results slipped?",
        answer: "The pause says how much is the market; the company's own numbers explain the rest.",
        area: "capital-raising",
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
        guidance: "Expect written pause and restart points, and planning assumptions shared across teams.",
      },
      {
        stageSlug: "series-c",
        guidance: "How consistently those points are kept over time is a fair test of how the company is run.",
      },
    ],
  },
] as const;

export const findStakeholderGuide = (slug: string) =>
  stakeholderGuides.find((guide) => guide.slug === slug);

/**
 * Sample conversations about the requested operating areas, in decision order.
 * The picker chooses at most one exchange per area, group and speaker.
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
