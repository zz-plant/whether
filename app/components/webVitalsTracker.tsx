"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackWebVitalMetric } from "../../lib/webVitalsTelemetry";

export function WebVitalsTracker() {
  useReportWebVitals((metric) => {
    trackWebVitalMetric({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      delta: metric.delta,
      path: window.location.pathname,
      navigationType: metric.navigationType,
    });
  });

  return null;
}
