import { stageGuides } from "./stageGuides";

/*
 * Written for the person in the role, about what they would do differently this
 * week. The first version was the register a reader now recognises as machine
 * copy: "alignment architecture", "narrative infrastructure", "planning
 * entropy", a "Promotion accelerant" block with career ladders drawn in arrows,
 * eight bullets per role that restated one idea eight ways, and a positioning
 * line per role ("Founder/CEO → Lead with clarity."). Each bullet here names a
 * thing the reader can do with a pause line, a resume line or the weekly
 * reading.
 */
type StakeholderGuide = {
  slug: string;
  title: string;
  tagline: string;
  bullets: readonly string[];
  stageSpecificContent: readonly {
    stageSlug: (typeof stageGuides)[number]["slug"];
    guidance: string;
  }[];
};

export const stakeholderGuides: readonly StakeholderGuide[] = [
  {
    slug: "founders-ceos",
    title: "Founders and CEOs",
    tagline: "Decide what to hire, spend and raise this week, and say why in one line.",
    bullets: [
      "Check the pause line before approving a hire or a large contract.",
      "Time a raise against how hard money is to get, not against the news.",
      "Give the leadership team one reading to argue from on Monday.",
      "Send investors the same guidance you are running the company on.",
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
          "Agree one set of pause and resume lines with your finance lead, so planning arguments start from the same numbers.",
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
    tagline: "Pace the roadmap to how much money there is to spend.",
    bullets: [
      "Put short-payback work first while funding pressure is above its pause line.",
      "Defer long bets until the resume line clears, and say which line you are waiting on.",
      "Argue for scope with the same numbers finance is using.",
      "Cut burn through what you choose to build, not only through budget cuts.",
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
          "Bring the pause and resume lines to roadmap reviews, so the debate is about numbers rather than people.",
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
    tagline: "Turn rates and risk appetite into spending rules other teams can follow.",
    bullets: [
      "Give each area a pause line and a resume line instead of a blanket freeze.",
      "Set hiring and spend limits that move when the reading moves, not when someone panics.",
      "Show the board an outside reference for why the plan is tight or loose.",
      "Replace everyone's own take on the economy with one weekly reading anyone can check.",
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
    tagline: "Get the leadership team working from the same reading before planning starts.",
    bullets: [
      "Open planning with this week's guidance, so trade-offs start from agreed limits.",
      "Keep board and investor material consistent with what the company is actually doing.",
      "Note which decisions were made under which conditions, and revisit them when a line moves.",
      "Spend less time settling whose view of the market wins.",
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
    tagline: "Match hiring and infrastructure spend to what the company can afford.",
    bullets: [
      "Favour reliability and cost work when money is tight, and delivery speed when it is not.",
      "Hold off on infrastructure built for scale you have not reached.",
      "Back hiring plans with the reading finance and product also use.",
      "Change the plan when a line is crossed, not when the mood changes.",
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
    tagline: "See whether management's plan fits the conditions it is operating in.",
    bullets: [
      "Judge hiring pace and burn against how hard money is to raise right now.",
      "Ask management which line would change their plan, and check it next quarter.",
      "Judge a tightening against lines agreed before it, not against the mood in the room.",
      "Back expansion when conditions allow it, and restraint when they don't.",
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
        guidance: "Expect written pause and resume lines, and planning assumptions shared across teams.",
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
