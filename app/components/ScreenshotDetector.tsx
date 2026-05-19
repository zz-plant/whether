"use client";

import { useEffect } from "react";

export function ScreenshotDetector() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("screenshot") === "1") {
        document.documentElement.dataset.screenshot = "true";
      }
    } catch {}
  }, []);

  return null;
}
