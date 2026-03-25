"use client";

import { useEffect } from "react";

const FALLBACK_ANCHOR = "#formula-reference";
const FALLBACK_TARGET = `/method${FALLBACK_ANCHOR}`;

export default function MethodologyPage() {
  useEffect(() => {
    const { hash, search } = window.location;
    const targetHash = hash || FALLBACK_ANCHOR;
    window.location.replace(`/method${search}${targetHash}`);
  }, []);

  return (
    <noscript>
      <meta content={`0;url=${FALLBACK_TARGET}`} httpEquiv="refresh" />
      <a href={FALLBACK_TARGET}>Continue to Methodology</a>
    </noscript>
  );
}
