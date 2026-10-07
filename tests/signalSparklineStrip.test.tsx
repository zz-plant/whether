import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SignalSparklineStrip } from "../app/signals/components/signalSparklineStrip";

/**
 * The strip prints the last point of its window as a large `NN/100`, in the
 * same shape the scorecard higher up the page uses for this week's score. The
 * series is the month-end archive, so the two genuinely differ — `/signals`
 * showed funding pressure as 77 at the top and 63 here — and a reader has no
 * way to tell a stale number from a corrected one unless the cell says which
 * period it belongs to.
 */
describe("SignalSparklineStrip", () => {
  const series = [
    {
      key: "tightness",
      label: "Funding pressure",
      points: [
        { label: "Sep 2025", value: 90 },
        { label: "Feb 2026", value: 71 },
        { label: "Aug 2026", value: 63 },
      ],
    },
  ];

  it("stamps the period of the number it prints", () => {
    const html = renderToStaticMarkup(<SignalSparklineStrip series={series} />);

    assert.ok(html.includes("63"), "does not render the last reading");
    assert.ok(
      html.includes("Aug 2026"),
      "prints a score with no period, which reads as this week's",
    );
    assert.match(html, /month-end/);
  });

  it("takes the period from the point rather than a separate prop", () => {
    /* A caller that names the period beside the series can name the wrong one,
       which is the same class of defect as the unlabelled number. Changing the
       last point must change the stamp. */
    const shifted = [
      {
        ...series[0],
        points: [...series[0].points.slice(0, -1), { label: "Jul 2026", value: 65 }],
      },
    ];

    const html = renderToStaticMarkup(<SignalSparklineStrip series={shifted} />);

    assert.ok(html.includes("Jul 2026"));
    assert.ok(!html.includes("Aug 2026"));
  });

  /*
   * The page passed twelve month-ends with a window label of "12 mo", so a move
   * from the first to the last point — eleven months, Sep 2025 to Aug 2026 —
   * printed as "-6 over 12 mo". The window's length is the gaps between its
   * points, and the strip takes it from the points rather than from a label.
   */
  it("labels the move with the months it spans, not the points it draws", () => {
    const text = renderToStaticMarkup(<SignalSparklineStrip series={series} />)
      .replace(/<!-- -->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    assert.match(text, /-27 over 2 mo/);
    assert.match(text, /2 mo · /);
    assert.doesNotMatch(text, /3 mo/, "three points span two months");
  });

  it("renders nothing for a series too short to draw", () => {
    const html = renderToStaticMarkup(
      <SignalSparklineStrip
        series={[{ key: "tightness", label: "Funding pressure", points: [{ label: "Aug 2026", value: 63 }] }]}
      />,
    );

    assert.equal(html, "");
  });
});
