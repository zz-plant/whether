"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Toast } from "@base-ui/react/toast";
import { DownloadIcon } from "../../components/uiIcons";

type DigestResponse = {
  digest: {
    summary: string;
    bullets: string[];
  };
  postureState: {
    currentState: {
      confidenceLabel: string;
      recordDate: string;
    };
  };
  alertCount: number;
  degraded: boolean;
  generatedAt: string;
  backend: string;
};

const isDigestResponse = (value: unknown): value is DigestResponse => {
  if (!value || typeof value !== "object") return false;
  const digest = Reflect.get(value, "digest");
  const postureState = Reflect.get(value, "postureState");
  const currentState = postureState && typeof postureState === "object"
    ? Reflect.get(postureState, "currentState")
    : null;

  return (
    Boolean(digest)
    && typeof digest === "object"
    && typeof Reflect.get(digest, "summary") === "string"
    && Array.isArray(Reflect.get(digest, "bullets"))
    && Boolean(currentState)
    && typeof currentState === "object"
    && typeof Reflect.get(currentState, "confidenceLabel") === "string"
    && typeof Reflect.get(currentState, "recordDate") === "string"
    && typeof Reflect.get(value, "alertCount") === "number"
    && typeof Reflect.get(value, "degraded") === "boolean"
    && typeof Reflect.get(value, "generatedAt") === "string"
    && typeof Reflect.get(value, "backend") === "string"
  );
};

const formatDigestText = (data: DigestResponse): string => {
  const { digest, generatedAt, alertCount, degraded } = data;
  const bullets = Array.isArray(digest.bullets) ? digest.bullets : [];
  const lines = [
    "Whether Weekly Digest",
    `Summary: ${digest.summary}`,
    "",
    bullets.length > 0 ? "Changes this week:" : null,
    ...bullets.map((b) => `\u2022 ${b}`),
    "",
    `Alerts this period: ${alertCount}`,
    `Status: ${degraded ? "Degraded (fallback)" : "Live"}`,
    `Generated: ${generatedAt}`,
    "---",
    "Source: Whether",
  ];
  return lines.filter(Boolean).join("\n");
};

export function WeeklyDigestDownload() {
  const { add } = Toast.useToastManager();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/weekly-digest");
      if (!response.ok) throw new Error("Digest API unavailable");
      const data = await response.json();
      if (!isDigestResponse(data)) throw new Error("Digest API returned an invalid payload");
      const text = formatDigestText(data);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const recordDate = data.postureState?.currentState?.recordDate ?? "weekly";
      anchor.download = `whether-weekly-digest-${recordDate.toLowerCase()}.txt`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      add({ title: "Digest ready", description: "Weekly digest is downloading.", type: "success" });
    } catch {
      add({ title: "Digest unavailable", description: "Could not fetch the weekly digest right now.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="weather-button inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
    >
      <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {loading ? "Loading digest…" : "Download weekly digest"}
    </Button>
  );
}
