"use client";

import { useState } from "react";

type AudioBriefProps = {
  text: string;
};

export function AudioBrief({ text }: AudioBriefProps) {
  const [playing, setPlaying] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  if (!supported) return null;

  const speak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.onend = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  return (
    <button
      type="button"
      onClick={playing ? stop : speak}
      className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-fluid-xs font-semibold text-slate-400 hover:border-sky-500/30 hover:text-sky-200 transition-colors inline-flex items-center gap-1.5"
      aria-label={playing ? "Stop reading" : "Listen to brief"}
    >
      {playing ? "⏸ Stop" : "▶ Listen"}
    </button>
  );
}
