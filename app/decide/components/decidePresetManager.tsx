"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "whether.decideLensPresets.v1";
const MAX_PRESETS = 6;

type DecidePresetManagerProps = {
  currentRole: string;
  currentLayer: string;
};

type DecideLensPreset = {
  id: string;
  name: string;
  role: string;
  layer: string;
};

const buildPresetHref = (role: string, layer: string) => {
  const params = new URLSearchParams();
  if (role && role !== "all") {
    params.set("role", role);
  }
  if (layer && layer !== "all") {
    params.set("layer", layer);
  }
  const query = params.toString();
  return query ? `/decide?${query}` : "/decide";
};

export const DecidePresetManager = ({
  currentRole,
  currentLayer,
}: DecidePresetManagerProps) => {
  const [presets, setPresets] = useState<DecideLensPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const activePresetLabel = useMemo(() => {
    const roleLabel = currentRole === "all" ? "All roles" : currentRole;
    const layerLabel = currentLayer === "all" ? "All layers" : currentLayer;
    return `${roleLabel} · ${layerLabel}`;
  }, [currentLayer, currentRole]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as DecideLensPreset[];
      if (Array.isArray(parsed)) {
        setPresets(parsed);
      }
    } catch {
      setStatusMessage("Could not load saved presets.");
    }
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }
    const timer = window.setTimeout(() => setStatusMessage(null), 1800);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      setStatusMessage("Could not save presets.");
    }
  }, [presets]);

  const savePreset = () => {
    if (presets.length >= MAX_PRESETS) {
      setStatusMessage(`Reached max presets (${MAX_PRESETS}). Remove one to add another.`);
      return;
    }
    const fallbackName = `${currentRole === "all" ? "All roles" : currentRole} / ${currentLayer === "all" ? "All layers" : currentLayer}`;
    const name = presetName.trim() || fallbackName;
    const nextPreset: DecideLensPreset = {
      id: `preset-${Date.now()}`,
      name,
      role: currentRole,
      layer: currentLayer,
    };
    setPresets((previous) => [nextPreset, ...previous].slice(0, MAX_PRESETS));
    setPresetName("");
    setStatusMessage("Preset saved.");
  };

  const removePreset = (id: string) => {
    setPresets((previous) => previous.filter((preset) => preset.id !== id));
    setStatusMessage("Preset removed.");
  };

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Lens presets</p>
        <p className="text-sm text-slate-200">Current lens: {activePresetLabel}</p>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="decide-preset-name" className="sr-only">
            Preset name
          </label>
          <input
            id="decide-preset-name"
            type="text"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Name this lens"
            className="min-h-[44px] flex-1 rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          />
          <button
            type="button"
            onClick={savePreset}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] hover:border-sky-400/70 hover:text-slate-100"
          >
            Save preset
          </button>
        </div>
      </div>
      {statusMessage ? (
        <p className="mt-2 text-xs text-slate-300" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2">
        {presets.length === 0 ? (
          <p className="text-xs text-slate-400">No saved presets yet.</p>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/60 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-100">{preset.name}</p>
                <p className="text-xs text-slate-400">
                  {(preset.role === "all" ? "All roles" : preset.role)} · {(preset.layer === "all" ? "All layers" : preset.layer)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={buildPresetHref(preset.role, preset.layer)}
                  className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 hover:border-sky-400/70 hover:text-slate-100"
                >
                  Apply
                </a>
                <button
                  type="button"
                  onClick={() => removePreset(preset.id)}
                  className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-300 hover:border-rose-400/70 hover:text-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
