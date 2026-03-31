"use client";

import { useEffect } from "react";
import { trackWebVitalMetric } from "../../lib/webVitalsTelemetry";

export function WebVitalsTracker() {
  useEffect(() => {
    let active = true;

    void import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      if (!active) {
        return;
      }

      const reportMetric = (metric: {
        name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
        value: number;
        rating: "good" | "needs-improvement" | "poor";
        id: string;
        delta: number;
        navigationType: string;
      }) => {
        trackWebVitalMetric({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          delta: metric.delta,
          path: window.location.pathname,
          navigationType: metric.navigationType,
        });
      };

      onCLS(reportMetric);
      onFCP(reportMetric);
      onINP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
    });

    return () => {
      active = false;
    };
  }, []);

  return null;
}
