const MOBILE = { width: 430, height: 932 };
const DESKTOP = { width: 1600, height: 1400 };

/**
 * The live operator routes. These are the surfaces the product is judged on, so
 * layout work needs before/after evidence for them — the mockup targets below
 * only cover staged concepts under /mockups.
 */
const liveRoutes = [
  { slug: "home", label: "Weekly brief (/)", path: "/" },
  { slug: "evidence", label: "Evidence", path: "/signals" },
  { slug: "planning", label: "Planning", path: "/operate" },
  { slug: "resolve", label: "Resolve", path: "/answer" },
  { slug: "trust", label: "Trust", path: "/trust" },
];

const liveTargets = liveRoutes.flatMap(({ slug, label, path }) => [
  {
    id: `${slug}-mobile`,
    label: `${label} / mobile`,
    path,
    viewport: MOBILE,
    fullPage: true,
  },
  {
    id: `${slug}-desktop`,
    label: `${label} / desktop`,
    path,
    viewport: DESKTOP,
    fullPage: true,
  },
]);

export const uiCaptureTargets = [
  ...liveTargets,
  {
    id: "mockups-index-desktop",
    label: "Mockups index / desktop",
    path: "/mockups",
    viewport: { width: 1440, height: 1200 },
    fullPage: true,
  },
  {
    id: "operator-brief-mobile",
    label: "Operator brief / mobile compact",
    path: "/mockups/operator-brief?viewport=mobile&density=compact",
    viewport: { width: 430, height: 932 },
    fullPage: true,
  },
  {
    id: "operator-brief-tablet",
    label: "Operator brief / tablet comfortable",
    path: "/mockups/operator-brief?viewport=tablet&density=comfortable",
    viewport: { width: 1024, height: 1280 },
    fullPage: true,
  },
  {
    id: "operator-brief-desktop",
    label: "Operator brief / desktop comfortable",
    path: "/mockups/operator-brief?viewport=desktop&density=comfortable",
    viewport: { width: 1600, height: 1400 },
    fullPage: true,
  },
];
