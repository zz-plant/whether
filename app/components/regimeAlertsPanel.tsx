/**
 * Panel for reviewing logged regime alert changes.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateUTC, formatTimestampUTC } from "../../lib/formatters";
import { useClipboardCopy } from "./useClipboardCopy";
import { regimeAlertsStorageKey, type RegimeAlertLogEntry } from "./regimeAlertsStorage";

type ServerAlert = {
  id: string;
  createdAt: string;
  payload: {
    previousRecordDate: string;
    currentRecordDate: string;
    previousAssessment: { regime: string };
    currentAssessment: { regime: string };
    reasons: Array<{ code: string; message: string }>;
  };
};

type DeliveryChannel = "slack" | "email" | "webhook";

type DeliveryEvent = {
  id: string;
  alertId: string;
  channel: DeliveryChannel;
  deliveredAt: string;
  status: "sent" | "skipped";
  summary: string;
};

type DeliveryPreferences = Record<DeliveryChannel, boolean>;

const formatTimestamp = (value: string) => formatTimestampUTC(value);
const formatRecordDate = (value: string) => formatDateUTC(value);

const buildAlertCopyText = (entry: RegimeAlertLogEntry) => {
  const { previous, current, reasons, loggedAt } = entry;

  return [
    "Whether Regime Alert Log",
    `Logged at: ${formatTimestamp(loggedAt)}`,
    `Previous record: ${formatRecordDate(previous.recordDate)} — ${previous.assessment.regime}`,
    `Current record: ${formatRecordDate(current.recordDate)} — ${current.assessment.regime}`,
    "Reasons:",
    ...reasons.map((reason) => `• ${reason.code}: ${reason.message}`),
  ].join("\n");
};

const mapServerAlerts = (alerts: ServerAlert[]): RegimeAlertLogEntry[] =>
  alerts.map((entry) => ({
    id: entry.id,
    loggedAt: entry.createdAt,
    previous: {
      recordDate: entry.payload.previousRecordDate,
      assessment: {
        regime: entry.payload.previousAssessment.regime,
      } as RegimeAlertLogEntry["previous"]["assessment"],
    },
    current: {
      recordDate: entry.payload.currentRecordDate,
      assessment: {
        regime: entry.payload.currentAssessment.regime,
      } as RegimeAlertLogEntry["current"]["assessment"],
    },
    reasons: entry.payload.reasons,
  }));

const createClientId = () => {
  const key = "whether-alert-client-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const created = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`;
  window.localStorage.setItem(key, created);
  return created;
};

export const RegimeAlertsPanel = () => {
  const [alerts, setAlerts] = useState<RegimeAlertLogEntry[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEvent[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("anonymous");
  const [preferences, setPreferences] = useState<DeliveryPreferences>({
    slack: true,
    email: true,
    webhook: false,
  });
  const { activeTarget, copiedTarget, status, error, copyToClipboard } = useClipboardCopy();

  const latestAlertId = useMemo(() => alerts[0]?.id, [alerts]);

  const loadAlerts = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(regimeAlertsStorageKey);
      if (!stored) {
        setAlerts([]);
        return;
      }
      const parsed = JSON.parse(stored) as RegimeAlertLogEntry[];
      setAlerts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAlerts([]);
    }
  }, []);

  const loadDeliveries = useCallback(() => {
    void fetch("/api/alert-deliveries")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { deliveries?: DeliveryEvent[] };
        setDeliveries(Array.isArray(payload.deliveries) ? payload.deliveries : []);
      })
      .catch(() => {
        setDeliveries([]);
      });
  }, []);

  useEffect(() => {
    const resolvedClientId = createClientId();
    setClientId(resolvedClientId);

    void fetch(`/api/alert-preferences?clientId=${encodeURIComponent(resolvedClientId)}`)
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { preferences?: DeliveryPreferences };
        if (payload.preferences) {
          setPreferences(payload.preferences);
        }
      })
      .catch(() => {
        // Keep defaults.
      });
  }, []);

  useEffect(() => {
    let active = true;

    void fetch("/api/regime-alerts")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { alerts?: ServerAlert[] };
        if (!active || !Array.isArray(payload.alerts) || payload.alerts.length === 0) {
          return;
        }
        setAlerts(mapServerAlerts(payload.alerts));
      })
      .catch(() => {
        loadAlerts();
      });

    loadDeliveries();
    loadAlerts();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === regimeAlertsStorageKey) {
        loadAlerts();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadAlerts, loadDeliveries]);

  const togglePreference = (channel: DeliveryChannel) => {
    const next = { ...preferences, [channel]: !preferences[channel] };
    setPreferences(next);
    void fetch("/api/alert-preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, preferences: next }),
    });
  };

  const deliverLatestAlert = () => {
    if (!latestAlertId) {
      setDeliveryStatus("No alert available to deliver.");
      return;
    }
    setDeliveryStatus("Delivering alert…");
    void fetch("/api/alert-deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, alertId: latestAlertId }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setDeliveryStatus("Delivery failed.");
          return;
        }
        const payload = (await response.json()) as { deliveries?: DeliveryEvent[] };
        const sent = (payload.deliveries ?? []).filter((item) => item.status === "sent").length;
        setDeliveryStatus(`Delivered to ${sent} channel${sent === 1 ? "" : "s"}.`);
        loadDeliveries();
      })
      .catch(() => setDeliveryStatus("Delivery failed."));
  };

  return (
    <section
      id="regime-alert-log"
      aria-labelledby="regime-alert-log-title"
      className="mt-10 border-t border-slate-800/60 pt-10"
    >
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Regime alert log</p>
            <h3 id="regime-alert-log-title" className="type-section text-slate-100">
              Alert history and copy-ready summaries
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Review regime change alerts and deliver them through Slack, email, or webhook.
            </p>
          </div>
          <div className="weather-surface space-y-2 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Delivery channels</p>
            <div className="flex flex-wrap gap-2">
              {(["slack", "email", "webhook"] as DeliveryChannel[]).map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => togglePreference(channel)}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                    preferences[channel] ? "text-emerald-200" : "text-slate-400"
                  }`}
                  aria-pressed={preferences[channel]}
                >
                  {preferences[channel] ? "✓" : "○"} {channel}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={deliverLatestAlert}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              Deliver latest alert
            </button>
            {deliveryStatus ? <p className="text-xs text-slate-300">{deliveryStatus}</p> : null}
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              No alert history yet. Open reports again after a new Treasury record lands to log the
              first alert.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {alerts.map((entry) => {
              const copyText = buildAlertCopyText(entry);
              const isCopying = status === "copying" && activeTarget === entry.id;
              const isCopied = copiedTarget === entry.id && status === "copied";

              return (
                <div key={entry.id} className="weather-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                        Alert logged {formatTimestamp(entry.loggedAt)}
                      </p>
                      <p className="mt-2 text-sm text-slate-100">
                        {entry.previous.assessment.regime} → {entry.current.assessment.regime}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Previous record: {formatRecordDate(entry.previous.recordDate)} · Current
                        record: {formatRecordDate(entry.current.recordDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(copyText, entry.id)}
                      aria-busy={isCopying}
                      className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 touch-manipulation"
                    >
                      {isCopying ? "Copying" : isCopied ? "Copied" : "Copy alert"}
                    </button>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    {entry.reasons.map((reason) => (
                      <li key={reason.code} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                        <span>
                          <span className="font-semibold text-slate-200">{reason.code}</span>: {reason.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {error ? (
                    <p className="mt-3 text-xs text-rose-300">
                      Clipboard access unavailable. Try manually selecting the alert text.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {deliveries.length > 0 ? (
          <div className="mt-6 weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">Recent deliveries</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              {deliveries.slice(0, 6).map((delivery) => (
                <li key={delivery.id}>
                  {formatTimestamp(delivery.deliveredAt)} · {delivery.channel} · {delivery.status} · {delivery.summary}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
};
