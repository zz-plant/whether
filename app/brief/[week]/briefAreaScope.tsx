"use client";

import { useEffect, type ReactNode } from "react";
import { locationSearchSource, useBrowserSource } from "../../components/browserSource";
import type { DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { briefAreaRowId, chosenAreaFromSearch } from "./briefQuestions";

/**
 * Opens a frozen week on the area a copied link names (2026-11-25). "Copy brief" carries
 * `?decision=<area>` (`carrySharedView`), and the week's page ignored it, so a teammate sent
 * Hiring met five areas in a row and had to find it.
 *
 * Read in the browser, not from the request: a published week is generated once and never
 * revalidated (`revalidate = false`), and reading the query on the server would render it per
 * request and make every `?decision=` a variant of the page. The canonical URL stays
 * `/brief/<week>`. The scope sets `data-chosen`, and each row's classes
 * (`emphasisWhenChosen`, `quietUnlessMoves` in app/components/home/chosenAreaInk.ts) give the
 * named row the homepage's emphasis and quiet the rest, with no script per row. The week's
 * words never change. With no hash in the link, the named row is brought into view once.
 *
 * `initial` is what the server and hydration render: nothing on the page, an area in a test.
 */
export function BriefAreaScope({ children, initial = null }: { children: ReactNode; initial?: DecisionArea | null }) {
  const search = useBrowserSource(locationSearchSource);
  const area = chosenAreaFromSearch(search) ?? initial ?? undefined;
  useEffect(() => {
    if (!area || window.location.hash) return;
    document.getElementById(briefAreaRowId(area))?.scrollIntoView({ block: "center" });
  }, [area]);
  return (
    <div className="group/chosen" data-chosen={area ?? ""}>
      {children}
    </div>
  );
}
