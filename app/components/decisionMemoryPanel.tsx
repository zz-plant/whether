/**
 * Decision Memory panel for logging regime context and constraints at decision time.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RegimeAssessment } from "../../lib/regimeEngine";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";

type DecisionMemoryEntry = {
  id: string;
  title: string;
  note: string;
  regime: RegimeAssessment["regime"];
  constraints: string[];
  confidence: string;
  recordDate: string;
  loggedAt: string;
  sourceLabel: string;
  sourceUrl: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return dateFormatter.format(parsed);
};

const buildSnapshotText = (entry: DecisionMemoryEntry) => {
  return [
    "Decision Memory — Whether Report",
    `Decision: ${entry.title}`,
    entry.note ? `Notes: ${entry.note}` : null,
    `Regime: ${entry.regime}`,
    `Confidence: ${entry.confidence}`,
    `Record date: ${entry.recordDate}`,
    `Logged at: ${formatTimestamp(entry.loggedAt)}`,
    "",
    "Constraints in force:",
    ...entry.constraints.map((constraint) => `• ${constraint}`),
    "",
    `Source: ${entry.sourceLabel}`,
    entry.sourceUrl ? `Source URL: ${entry.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

const escapeCsvValue = (value: string) => {
  const normalized = value.replace(/"/g, "\"\"");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized}"`;
  }
  return normalized;
};

const buildCsvRows = (entries: DecisionMemoryEntry[]) => {
  const header = [
    "title",
    "note",
    "regime",
    "confidence",
    "recordDate",
    "loggedAt",
    "constraints",
    "sourceLabel",
    "sourceUrl",
  ];
  const rows = entries.map((entry) => [
    entry.title,
    entry.note,
    entry.regime,
    entry.confidence,
    entry.recordDate,
    entry.loggedAt,
    entry.constraints.join(" | "),
    entry.sourceLabel,
    entry.sourceUrl ?? "",
  ]);

  return [
    header.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");
};

type DecisionMemoryEntryCardProps = {
  entry: DecisionMemoryEntry;
  isFocused: boolean;
  isCopying: boolean;
  copyTarget: string | null;
  onCopy: (text: string, label: string) => void;
  onCopyLink: (entry: DecisionMemoryEntry) => void;
  onAttach: (entry: DecisionMemoryEntry) => void;
  onFocus: (entryId: string) => void;
};

const DecisionMemoryEntryCard = ({
  entry,
  isFocused,
  isCopying,
  copyTarget,
  onCopy,
  onCopyLink,
  onAttach,
  onFocus,
}: DecisionMemoryEntryCardProps) => {
  const snapshotText = buildSnapshotText(entry);
  const textTarget = `text-${entry.id}`;
  const linkTarget = `link-${entry.id}`;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isFocused ? "border-sky-500/60 bg-slate-950/80" : "border-slate-800/60 bg-slate-950/60"
      }`}
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{entry.title}</p>
      <p className="mt-2 text-sm text-slate-200">
        {entry.regime} · {entry.confidence}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Logged {formatTimestamp(entry.loggedAt)} · Record {entry.recordDate}
      </p>
      {entry.note ? <p className="mt-3 text-sm text-slate-300">{entry.note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onCopy(snapshotText, textTarget)}
          disabled={isCopying}
          aria-busy={isCopying && copyTarget === textTarget}
          className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
        >
          {isCopying && copyTarget === textTarget ? "Copying" : "Copy snapshot"}
        </button>
        <button
          type="button"
          onClick={() => onCopyLink(entry)}
          disabled={isCopying}
          aria-busy={isCopying && copyTarget === linkTarget}
          className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
        >
          {isCopying && copyTarget === linkTarget ? "Copying" : "Copy snapshot link"}
        </button>
        <button
          type="button"
          onClick={() => onAttach(entry)}
          className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
        >
          Attach to URL
        </button>
        <button
          type="button"
          onClick={() => onFocus(entry.id)}
          className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-slate-500/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 touch-manipulation"
        >
          Focus entry
        </button>
      </div>
    </div>
  );
};

export const DecisionMemoryPanel = ({
  assessment,
  provenance,
  recordDateLabel,
}: {
  assessment: RegimeAssessment;
  provenance: DataProvenance;
  recordDateLabel: string;
}) => {
  const [entries, setEntries] = useState<DecisionMemoryEntry[]>([]);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [copyTarget, setCopyTarget] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [fallbackCopyText, setFallbackCopyText] = useState("");
  const storageKey = "whether.decisionMemory";
  const draftKey = "whether.decisionMemoryDraft";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const snapshotParam = searchParams.get("decisionSnapshot");
  const focusedId = searchParams.get("decisionId");
  const safeRecordLabel = recordDateLabel.replace(/[^a-zA-Z0-9-_]+/g, "-");
  const defaultRecordLabel = new Date().toISOString().slice(0, 10);
  const exportLabel = safeRecordLabel || defaultRecordLabel;

  const attachedSnapshot = useMemo(() => {
    if (!snapshotParam) {
      return null;
    }
    try {
      const parsed = JSON.parse(snapshotParam) as DecisionMemoryEntry;
      if (!parsed.title || !parsed.regime) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, [snapshotParam]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as DecisionMemoryEntry[];
      if (Array.isArray(parsed)) {
        setEntries(parsed);
      }
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [storageKey]);

  useEffect(() => {
    const storedDraft = window.localStorage.getItem(draftKey);
    if (!storedDraft) {
      return;
    }
    try {
      const parsed = JSON.parse(storedDraft) as { title?: string; note?: string };
      if (parsed.title) {
        setDecisionTitle(parsed.title);
      }
      if (parsed.note) {
        setDecisionNote(parsed.note);
      }
    } catch {
      // Intentionally ignore storage restore errors to keep console clean.
    }
  }, [draftKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [entries, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ title: decisionTitle, note: decisionNote })
      );
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [decisionNote, decisionTitle, draftKey]);

  useEffect(() => {
    if (!copyError) {
      return;
    }
    const timeout = window.setTimeout(() => setCopyError(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyError]);

  const resolveEntryId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleTitleBlur = () => {
    if (!decisionTitle.trim()) {
      setTitleError("Decision name is required to log an entry.");
    } else {
      setTitleError(null);
    }
  };

  const handleLogDecision = () => {
    if (!decisionTitle.trim()) {
      setTitleError("Decision name is required to log an entry.");
      titleInputRef.current?.focus();
      return;
    }
    const now = new Date().toISOString();
    const entry: DecisionMemoryEntry = {
      id: resolveEntryId(),
      title: decisionTitle.trim(),
      note: decisionNote.trim(),
      regime: assessment.regime,
      constraints: assessment.constraints,
      confidence: provenance.statusLabel,
      recordDate: recordDateLabel,
      loggedAt: now,
      sourceLabel: provenance.sourceLabel,
      sourceUrl: provenance.sourceUrl ?? null,
    };
    setEntries((prev) => [entry, ...prev].slice(0, 12));
    setDecisionTitle("");
    setDecisionNote("");
    setTitleError(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("decisionId", entry.id);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleAttachSnapshot = (entry: DecisionMemoryEntry) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("decisionSnapshot", JSON.stringify(entry));
    nextParams.set("decisionId", entry.id);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleClearSnapshot = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("decisionSnapshot");
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleCopy = async (text: string, label: string) => {
    if (isCopying) {
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setFallbackCopyText(text);
      setCopyError(true);
      return;
    }
    setIsCopying(true);
    setCopyTarget(label);
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(false);
    } catch {
      setFallbackCopyText(text);
      setCopyError(true);
    } finally {
      setIsCopying(false);
      setCopyTarget(null);
    }
  };

  const handleCopySnapshotLink = (entry: DecisionMemoryEntry) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("decisionSnapshot", JSON.stringify(entry));
    nextParams.set("decisionId", entry.id);
    const link = `${window.location.origin}${pathname}?${nextParams.toString()}`;
    handleCopy(link, `link-${entry.id}`);
  };

  const handleFocusEntry = (entryId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("decisionId", entryId);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleSnapshotSave = () => {
    if (!attachedSnapshot) {
      return;
    }
    const alreadySaved = entries.some((entry) => entry.id === attachedSnapshot.id);
    if (alreadySaved) {
      return;
    }
    setEntries((prev) => [attachedSnapshot, ...prev].slice(0, 12));
  };

  const handleDownload = (content: string, filename: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(entries, null, 2);
    handleDownload(payload, `whether-decision-memory-${exportLabel}.json`, "application/json");
  };

  const handleExportCsv = () => {
    const payload = buildCsvRows(entries);
    handleDownload(payload, `whether-decision-memory-${exportLabel}.csv`, "text/csv");
  };

  const handleClearLog = () => {
    if (!window.confirm("Clear the decision memory log? This cannot be undone.")) {
      return;
    }
    setEntries([]);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Intentionally ignore storage cleanup errors to keep console clean.
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("decisionId");
    nextParams.delete("decisionSnapshot");
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <section id="decision-memory" aria-labelledby="decision-memory-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-label text-slate-400">Decision memory</p>
            <h3 id="decision-memory-title" className="type-section text-slate-100">
              Lightweight audit trail for key calls
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Capture the regime, constraints, and confidence level behind each decision so teams
              can review why a call was made.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DataProvenanceStrip provenance={provenance} />
          </div>
        </div>

        {attachedSnapshot ? (
          <div className="mt-6 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-slate-100">
            <p className="text-xs font-semibold tracking-[0.12em] text-sky-200">
              Attached snapshot
            </p>
            <p className="mt-2 text-sm text-slate-100">
              {attachedSnapshot.title} · {attachedSnapshot.regime} ·{" "}
              {attachedSnapshot.confidence}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              Logged at {formatTimestamp(attachedSnapshot.loggedAt)}.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSnapshotSave}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
              >
                Save to memory
              </button>
              <button
                type="button"
                onClick={handleClearSnapshot}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center border border-slate-700/60 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-slate-500/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 touch-manipulation"
              >
                Clear snapshot link
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Log a decision</p>
            <div className="mt-4 grid gap-4">
              <div>
                <label htmlFor="decision-title" className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Decision name
                </label>
                <input
                  ref={titleInputRef}
                  id="decision-title"
                  type="text"
                  value={decisionTitle}
                  onChange={(event) => setDecisionTitle(event.target.value)}
                  onBlur={handleTitleBlur}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? "decision-title-error" : undefined}
                  className="weather-input mt-2 min-h-[44px] w-full px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
                />
                {titleError ? (
                  <p id="decision-title-error" className="mt-2 text-xs text-amber-200">
                    {titleError}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="decision-note" className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  Notes (optional)
                </label>
                <textarea
                  id="decision-note"
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  rows={4}
                  className="weather-input mt-2 w-full px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
                />
              </div>
              <button
                type="button"
                onClick={handleLogDecision}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
              >
                Log decision
              </button>
              <p className="text-xs text-slate-500">
                Logs capture the current regime, constraints, and confidence level automatically.
              </p>
            </div>
          </div>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">Latest regime context</p>
            <p className="mt-3 text-sm text-slate-200">{assessment.regime}</p>
            <p className="mt-2 text-xs text-slate-500">
              Confidence: {provenance.statusLabel} · Record date: {recordDateLabel}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {assessment.constraints.map((constraint) => (
                <li key={constraint} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span className="break-words">{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-label text-slate-400">Decision memory log</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 touch-manipulation"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleClearLog}
                className="weather-pill inline-flex min-h-[44px] items-center justify-center border border-rose-400/40 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-rose-200 transition-colors hover:border-rose-300/70 hover:text-rose-100 touch-manipulation"
              >
                Clear log
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {entries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No decisions logged yet. Log a decision to start the audit trail.
              </p>
            ) : (
              entries.map((entry) => (
                <DecisionMemoryEntryCard
                  key={entry.id}
                  entry={entry}
                  isFocused={focusedId === entry.id}
                  isCopying={isCopying}
                  copyTarget={copyTarget}
                  onCopy={handleCopy}
                  onCopyLink={handleCopySnapshotLink}
                  onAttach={handleAttachSnapshot}
                  onFocus={handleFocusEntry}
                />
              ))
            )}
          </div>
        </div>

        {copyError ? (
          <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
            <p className="text-xs font-semibold tracking-[0.12em] text-amber-200">
              Clipboard blocked
            </p>
            <p className="mt-2 text-amber-100/90">
              Select and copy the snapshot text below manually.
            </p>
            <textarea
              readOnly
              value={fallbackCopyText}
              rows={6}
              className="mt-3 w-full rounded-lg border border-amber-400/30 bg-slate-950/80 p-3 font-mono text-base text-amber-100 touch-manipulation"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
};
