/**
 * The controls rationalized on 2026-11-06 (spec 1.1.104): one close key, one segmented
 * control, a selected pill that draws as selected, and buttons the size of a finger.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegimePhaseMap } from "../app/components/history/RegimePhaseMap";
import { BriefFormatPicker } from "../app/components/briefFormatPicker";
import { BRIEF_FORMATS } from "../lib/report/briefArtifact";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the phase map's window", () => {
  /* It set aria-current="true", which `.weather-pill[aria-current="page"]` never matches,
     and its sky utilities lost to the pill's unlayered paint: the window on show looked
     like the others. */
  it("marks the window on show the way the pill draws a selection", () => {
    const html = renderToStaticMarkup(
      <RegimePhaseMap
        series={[
          { recordDate: "2025-03-31", tightness: 90, riskAppetite: 51, regime: "SCARCITY" },
          { recordDate: "2025-04-30", tightness: 90, riskAppetite: 55, regime: "SCARCITY" },
        ]}
        activeSpan="5y"
        spanHref={(span) => `/history?span=${span}`}
        totalMonths={2}
        open
      />,
    );
    const current = [...html.matchAll(/<a [^>]*aria-current="([^"]+)"[^>]*>/g)];
    assert.equal(current.length, 1);
    assert.equal(current[0]?.[1], "page");
    assert.match(current[0]?.[0] ?? "", /span=5y/);
    assert.match(current[0]?.[0] ?? "", /weather-pill/);
  });
});

describe("pick-one choices", () => {
  it("draws the share formats as the site's segmented control, one chosen", () => {
    const html = renderToStaticMarkup(
      <BriefFormatPicker
        format="slack"
        activeFormat={BRIEF_FORMATS[0]}
        briefText="text"
        copiedTarget={null}
        onSelect={() => {}}
        onCopy={() => {}}
      />,
    );
    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((match) => match[0]);
    assert.equal(radios.length, BRIEF_FORMATS.length);
    assert.equal(radios.filter((radio) => / checked=""/.test(radio)).length, 1);
    assert.match(html, /weather-segment-option/);
    assert.doesNotMatch(html, /bg-sky-500\/12/, "the hand-drawn sky tint is gone");
  });

  it("keeps the share presets and the time machine's years on it too", () => {
    assert.match(source("app/components/shareRail.tsx"), /<SegmentedControl[\s\S]*?ariaLabel="Preset"/);
    assert.match(source("app/components/timeMachineDatePicker.tsx"), /<SegmentedControl[\s\S]*?ariaLabel="Year"/);
  });
});

describe("one close key", () => {
  /* Ten were written by hand, on three radii, with three hover fills; the help modal's
     was shadcn's 28px icon button. */
  const closers = [
    "app/components/toastProviderRoot.tsx",
    "app/components/shareRail.tsx",
    "app/components/timeMachineDatePicker.tsx",
    "app/components/globalHeaderNavClient.tsx",
    "app/components/commandPalette.tsx",
    "app/components/presentationFrames.tsx",
    "app/components/ui/definedTerm.tsx",
    "app/components/ui/dialog.tsx",
    "app/components/home/SinceLastVisit.tsx",
    "app/components/home/ConditionsLegend.tsx",
  ];

  it("gives every close button the shared class", () => {
    for (const path of closers) {
      assert.match(source(path), /CLOSE_CONTROL_CLASS/, `${path} draws its own close button`);
    }
  });

  it("is a 44px key on the control radius", () => {
    const shared = source("app/components/ui/closeControl.ts");
    assert.match(shared, /min-h-11 min-w-11/);
    assert.match(shared, /rounded-lg/);
    assert.doesNotMatch(shared, /rounded-md/);
  });
});

describe("buttons the size of a finger", () => {
  it("draws the browser-alert toggle as the site's secondary button, 44px tall", () => {
    const toggle = source("app/components/regimeAlertToggle.tsx");
    assert.match(toggle, /className="weather-button inline-flex min-h-11/);
    assert.doesNotMatch(toggle, /bg-slate-900 px-4 py-2/);
  });

  it("makes the share panel's switch rows the target, not the 20px switch", () => {
    const rail = source("app/components/shareRail.tsx");
    assert.equal(rail.match(/<label className="flex min-h-11 cursor-pointer/g)?.length, 2);
  });
});

describe("links that go somewhere", () => {
  it("leaves no router push behind 'Back to this week'", () => {
    for (const path of ["app/components/timeMachineDatePicker.tsx", "app/components/TimeMachineCalendarPicker.tsx"]) {
      const file = source(path);
      assert.match(file, /Back to this week/);
      assert.doesNotMatch(file, /router\.push\("\/"\)/, `${path} still pushes the router to go home`);
    }
    assert.match(
      source("app/components/TimeMachineCalendarPicker.tsx"),
      /<ActionLink href="\/" variant="inline"[^\n]*\n\s*Back to this week/,
      "the calendar picker's way home is a link, not a stamp-styled button",
    );
  });

  it("names History by its own name", () => {
    const picker = source("app/components/timeMachineDatePicker.tsx");
    assert.doesNotMatch(picker, /Go to History Dashboard/);
    assert.match(picker, /Open History &rarr;/);
  });
});
