"use client";

import { useEffect } from "react";

type TabNotifierProps = {
  direction: "tighten" | "ease" | "hold" | "revisit";
  tightness: number;
  reliabilityScore?: number;
};

const EMOJI: Record<string, string> = {
  tighten: "🔴",
  ease: "🟢",
  hold: "🟡",
  revisit: "🟡",
};

const PREFIX: Record<string, string> = {
  tighten: "Tightening · ",
  ease: "Easing · ",
  hold: "Holding · ",
  revisit: "Revisit · ",
};

const DOT_COLOR: Record<string, string> = {
  tighten: "#f43f5e",
  ease: "#10b981",
  hold: "#fbbf24",
  revisit: "#fbbf24",
};

function setFaviconDot(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.beginPath();
  ctx.arc(16, 16, 11, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("W", 16, 17);

  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (link) {
    link.href = canvas.toDataURL();
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "icon";
    newLink.href = canvas.toDataURL();
    document.head.appendChild(newLink);
  }
}

export function TabNotifier({ direction, tightness, reliabilityScore }: TabNotifierProps) {
  useEffect(() => {
    const originalTitle = document.title;
    const prefix = PREFIX[direction] ?? "";
    const suffix = reliabilityScore != null ? ` · ${reliabilityScore}% reliable` : "";
    document.title = `${EMOJI[direction] ?? ""} ${prefix}${tightness}${suffix} | Whether`;

    const color = DOT_COLOR[direction];
    if (color) setFaviconDot(color);

    return () => {
      document.title = originalTitle;
    };
  }, [direction, tightness, reliabilityScore]);

  return null;
}
