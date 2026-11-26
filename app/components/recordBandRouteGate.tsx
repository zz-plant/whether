"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { showsRecordBand } from "../../lib/navigation/globalHeader";

/**
 * The record band on History only, the category line everywhere else (2026-11-25).
 *
 * Both are server-drawn in the root layout and handed in as props, so the band still
 * reads only bundled data and makes no request. `usePathname()` answers during the
 * server render, so the right one is in the first paint; reading `headers()` in the
 * layout instead would make every page dynamic (see `GlobalHeaderRouteGate`).
 */
export function RecordBandRouteGate({ band, line }: { band: ReactNode; line: ReactNode }) {
  return <>{showsRecordBand(usePathname() ?? "/") ? band : line}</>;
}
