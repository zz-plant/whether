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
  { slug: "resolve", label: "Resolve", path: "/resolve" },
  { slug: "trust", label: "Trust", path: "/trust" },
  // Added 2026-08-29. These four were never captured, so the UI facelift that
  // reviewed the five above could not have seen them — and three are now on the
  // path a launch visitor actually walks: /brief is where every shared artifact
  // links, /history carries the track record that answers "is this a horoscope",
  // and /pricing states the offer. /share is where the artifacts are copied.
  { slug: "history", label: "History", path: "/history" },
  { slug: "brief", label: "Published brief", path: "/brief/2026-w31" },
  { slug: "pricing", label: "Pricing", path: "/pricing" },
  { slug: "share", label: "Share", path: "/share" },
  // The plain-language entry point. It was a disclosure inside /trust, so the
  // one surface addressed to a reader who does not yet know the vocabulary was
  // never captured and never reviewed.
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
