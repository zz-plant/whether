"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DecisionAction,
  DecisionCategory,
  LifecycleStage,
} from "../../../lib/decisionShield";
import { createOpaqueId, usePersistentClientId } from "../../components/clientIdentity";
import { createKeyedBrowserSource, useBrowserSource } from "../../components/browserSource";
import { STORAGE_KEYS } from "../../../lib/storage/keys";

type DecisionShieldPreset = {
  id: string;
  name: string;
  lifecycle: LifecycleStage;
  category: DecisionCategory;
  action: DecisionAction;
  createdAt: string;
};

const LEGACY_PRESET_STORAGE_KEY = "whether.decisionShieldPresets";
const NO_PRESETS: DecisionShieldPreset[] = [];

const isPreset = (value: unknown): value is DecisionShieldPreset => {
  if (typeof value !== "object" || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && typeof candidate.lifecycle === "string"
    && typeof candidate.category === "string"
    && typeof candidate.action === "string"
    && typeof candidate.createdAt === "string"
  );
};

const presetsSourceFor = createKeyedBrowserSource<DecisionShieldPreset[]>({
  read: (key) => {
    try {
      const stored = window.localStorage.getItem(key) ?? window.localStorage.getItem(LEGACY_PRESET_STORAGE_KEY);
      if (!stored) return NO_PRESETS;
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return NO_PRESETS;
      const presets = parsed.filter(isPreset);
      return presets.length > 0 ? presets : NO_PRESETS;
    } catch {
      return NO_PRESETS;
    }
  },
  serverValue: NO_PRESETS,
});

export interface CurrentSelection {
  lifecycle: LifecycleStage;
  category: DecisionCategory;
  action: DecisionAction;
}

export const useDecisionShieldPresets = ({
  currentSelection,
  onApplyPreset,
}: {
  currentSelection: CurrentSelection;
  onApplyPreset: (preset: CurrentSelection) => void;
}) => {
  const [editedPresets, setEditedPresets] = useState<DecisionShieldPreset[] | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetStatus, setPresetStatus] = useState<string | null>(null);
  const presetInputRef = useRef<HTMLInputElement | null>(null);

  const clientId = usePersistentClientId();
  const presetStorageKey = clientId ? STORAGE_KEYS.decisionShieldPresets(clientId) : null;
  const storedPresets = useBrowserSource(presetsSourceFor(presetStorageKey));
  const presets = editedPresets ?? storedPresets;

  useEffect(() => {
    if (!presetStorageKey) {
      return;
    }
    try {
      window.localStorage.setItem(presetStorageKey, JSON.stringify(presets));
    } catch {
      // Intentionally ignore storage persistence errors to keep console clean.
    }
  }, [presetStorageKey, presets]);

  useEffect(() => {
    if (!presetStatus) {
      return;
    }
    const timeout = window.setTimeout(() => setPresetStatus(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [presetStatus]);

  const handlePresetSave = () => {
    if (!presetName.trim()) {
      setPresetError("Name your preset so it can be reused.");
      presetInputRef.current?.focus();
      return;
    }
    const nextPreset: DecisionShieldPreset = {
      id: createOpaqueId(),
      name: presetName.trim(),
      lifecycle: currentSelection.lifecycle,
      category: currentSelection.category,
      action: currentSelection.action,
      createdAt: new Date().toISOString(),
    };
    setEditedPresets([nextPreset, ...presets].slice(0, 8));
    setPresetName("");
    setPresetError(null);
    setPresetStatus("Preset saved.");
  };

  const handlePresetApply = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    onApplyPreset({
      lifecycle: preset.lifecycle,
      category: preset.category,
      action: preset.action,
    });
    setPresetStatus("Preset applied.");
  };

  const handlePresetDelete = (presetId: string) => {
    const presetToDelete = presets.find((p) => p.id === presetId);
    if (!presetToDelete) return;

    if (confirm(`Delete preset "${presetToDelete.name}"? This cannot be undone.`)) {
      setEditedPresets(presets.filter((item) => item.id !== presetId));
      setPresetStatus(`Preset "${presetToDelete.name}" deleted.`);
    }
  };

  const handlePresetBlur = () => {
    if (!presetName.trim()) {
      setPresetError("Name your preset so it can be reused.");
    } else {
      setPresetError(null);
    }
  };

  return {
    presets,
    presetName,
    setPresetName,
    presetError,
    presetStatus,
    presetInputRef,
    handlePresetSave,
    handlePresetApply,
    handlePresetDelete,
    handlePresetBlur,
  };
};
