"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RUNWAY_BAND,
  RUNWAY_BAND_OPTIONS,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import { persistOperatorRunway, useOperatorRunway } from "./useOperatorRunway";
import { HeaderChoicePill } from "./HeaderChoicePill";

interface RunwayDropdownPillProps {
  /**
   * The band the server calibrated the page against. Left unset (the global
   * header mounts the pill with no page model in reach), the pill reads the
   * cookie itself, so a returning operator sees the band they chose rather
   * than the default.
   */
  activeRunway?: RunwayBand;
  className?: string;
}

/** The runway choice at phone width. The control itself is `HeaderChoicePill`. */
export function RunwayDropdownPill({
  activeRunway,
  className = "",
}: RunwayDropdownPillProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { runwayBand: storedRunway } = useOperatorRunway();

  const selectedRunwayKey = activeRunway ?? storedRunway ?? DEFAULT_RUNWAY_BAND;

  const handleSelectRunway = (band: RunwayBand) => {
    persistOperatorRunway(band);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (band === DEFAULT_RUNWAY_BAND) {
      params.delete("runway");
    } else {
      params.set("runway", band);
    }
    const query = params.toString();
    // `replace`, like the sm+ selector for the same setting: this is the same
    // choice at a different width, and the two must not disagree about Back.
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <HeaderChoicePill
      label="Cash runway"
      options={RUNWAY_BAND_OPTIONS}
      value={selectedRunwayKey}
      onSelect={handleSelectRunway}
      className={className}
    />
  );
}
