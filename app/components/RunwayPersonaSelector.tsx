"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  DEFAULT_RUNWAY_BAND,
  RUNWAY_BAND_OPTIONS,
  type RunwayBand,
} from "../../lib/report/operatorRunway";
import { persistOperatorRunway } from "./useOperatorRunway";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";

interface RunwayPersonaSelectorProps {
  activeRunway?: RunwayBand;
  className?: string;
}

/**
 * Which cash-runway band the operating rules are scaled to.
 *
 * It was the last hand-rolled copy of the segmented control: a `role="tablist"`
 * with its own roving tabindex and arrow-key handler, in an amber fill no other
 * control on the page uses, mounted beside a stage selector that had already
 * moved to the shared radio group (`ui/segmentedControl.tsx` records the three
 * versions and why one survives). Same primitive now, so the two controls a
 * reader meets side by side agree about focus, arrows and what Back means.
 *
 * `replace`, not `push`, for the reason `StagePersonaSelector` gives: a band is
 * a setting, and it used to take four Back presses to leave the page after
 * trying the four options.
 */
export function RunwayPersonaSelector({
  activeRunway,
  className = "",
}: RunwayPersonaSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = activeRunway ?? DEFAULT_RUNWAY_BAND;

  const options: readonly SegmentedOption<RunwayBand>[] = RUNWAY_BAND_OPTIONS.map((option) => ({
    key: option.key,
    label: option.label,
    sublabel: option.sublabel,
    title: `Tailor operating rules for ${option.label} cash runway (${option.sublabel})`,
  }));

  const handleSelectRunway = (band: RunwayBand) => {
    persistOperatorRunway(band);
    const params = new URLSearchParams(searchParams.toString());
    if (band === DEFAULT_RUNWAY_BAND) {
      params.delete("runway");
    } else {
      params.set("runway", band);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="type-eyebrow mr-1">Cash runway</span>
      <SegmentedControl
        options={options}
        value={selected}
        onSelect={handleSelectRunway}
        ariaLabel="Cash runway band"
      />
    </div>
  );
}
