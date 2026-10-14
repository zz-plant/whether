"use client";

import { isMeasurementOff, setMeasurementOff } from "../../lib/telemetry/sendTelemetry";
import { createBrowserSource, useBrowserSource } from "../components/browserSource";

/* Measuring until this browser says otherwise, which is also what the server
   renders: the choice lives in local storage and arrives through hydration. */
const measurementOffSource = createBrowserSource<boolean>({
  read: isMeasurementOff,
  serverValue: false,
  refreshOnSubscribe: true,
});

/**
 * The one control for section 2.5: stop this browser sending usage measurement,
 * or start it again. Every emitter goes through `sendTelemetry`, which checks
 * the same key, so this covers all of them.
 */
export function MeasurementChoice() {
  const off = useBrowserSource(measurementOffSource);

  const choose = (nextOff: boolean) => {
    setMeasurementOff(nextOff);
    measurementOffSource.refresh();
  };

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>
        {off
          ? "Usage measurement (2.5) is off in this browser."
          : "Turn off usage measurement (2.5) in this browser. It stays off until you turn it back on here or clear site data."}
      </span>
      <button
        type="button"
        onClick={() => choose(!off)}
        className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold"
      >
        {off ? "Turn it back on" : "Turn off measurement"}
      </button>
    </span>
  );
}
