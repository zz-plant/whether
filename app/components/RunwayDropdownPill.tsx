"use client";

import {
  DEFAULT_RUNWAY_BAND,
  RUNWAY_BAND_OPTIONS,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import { choiceSublabel } from "../../lib/report/operatorStage";
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

  const { runwayBand: storedRunway } = useOperatorRunway();

  const selectedRunwayKey = activeRunway ?? storedRunway ?? DEFAULT_RUNWAY_BAND;

  const handleSelectRunway = (band: RunwayBand) => {
    // The cookie is the one place the band lives; `RunwayServerSync` re-renders
    // the page from it. This used to also write `?runway=` into the address,
    // which then outranked the cookie on the server — so an exact figure typed
    // afterwards was ignored — and handed the reader's runway band, and a
    // setting that overrode theirs, to anyone the URL was pasted to.
    persistOperatorRunway(band);
  };

  return (
    <HeaderChoicePill
      label="Cash runway"
      options={RUNWAY_BAND_OPTIONS.map((option) => ({
        ...option,
        sublabel: choiceSublabel(option.sublabel, option.key === DEFAULT_RUNWAY_BAND),
      }))}
      value={selectedRunwayKey}
      onSelect={handleSelectRunway}
      className={className}
    />
  );
}
