/**
 * Alert history for logged regime changes, with a copyable summary per alert.
 *
 * This panel used to carry a "Deliver latest alert" control. It POSTed
 * /api/alert-deliveries, whose unauthenticated branch appends a log row marked "sent" for
 * every enabled channel without contacting a single channel, and the panel then reported
 * "Delivered to N channels" and listed those rows back. Nothing was ever sent. Alert mail
 * goes out from the cron path in lib/alert/alertDelivery.ts, to verified subscribers only,
 * and there is no Slack or webhook destination stored per operator profile at all.
 *
 * What is left is what the panel can actually do: show the history that
 * /api/regime-alerts serves, let a reader copy one, and record which channels they would
 * want it on — labelled as the preference it is rather than as delivery.
 */
"use client";

import { useEffect, useState } from "react";
import { usePersistentClientId } from "./clientIdentity";
import { formatDateUTC, formatTimestampUTC } from "../../lib/formatters";
import { useClipboardCopy } from "./useClipboardCopy";
import type { RegimeChangeReason } from "../../lib/regimeEngine";

/** Only the fields /api/regime-alerts actually carries. The previous shape claimed a whole
 *  RegimeAssessment and cast a bare `{ regime }` into it at each call site. */
type AlertRecord = {
  id: string;
  loggedAt: string;
  previous: { recordDate: string; regime: string };
  current: { recordDate: string; regime: string };
  reasons: RegimeChangeReason[];
  timeMachineHref?: string;
};

type DeliveryChannel = "slack" | "email" | "webhook";
type ChannelPreferences = Record<DeliveryChannel, boolean>;

const CHANNELS: DeliveryChannel[] = ["slack", "email", "webhook"];

const formatTimestamp = (value: string) => formatTimestampUTC(value);
const formatRecordDate = (value: string) => formatDateUTC(value);

const buildAlertCopyText = (entry: AlertRecord) => {
  const { previous, current, reasons, loggedAt, timeMachineHref } = entry;

  return [
    "Whether Change Alerts",
    `Logged at: ${formatTimestamp(loggedAt)}`,
    `Previous record: ${formatRecordDate(previous.recordDate)} — ${previous.regime}`,
    `Current record: ${formatRecordDate(current.recordDate)} — ${current.regime}`,
    "Reasons:",
    ...reasons.map((reason) => `• ${reason.code}: ${reason.message}`),
    timeMachineHref ? `Time Machine: ${timeMachineHref}` : "",
  ].filter(Boolean).join("\n");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isReason = (value: unknown): value is RegimeChangeReason =>
  isRecord(value) && typeof value.code === "string" && typeof value.message === "string";

/** Narrow the wire payload instead of asserting it. An alert whose shape does not hold is
 *  dropped, so a malformed row renders as one missing entry rather than as `undefined →
 *  undefined` in the history. */
const toAlertRecord = (entry: unknown): AlertRecord | null => {
  if (!isRecord(entry) || typeof entry.id !== "string" || typeof entry.createdAt !== "string") {
    return null;
  }

  const payload = entry.payload;
  if (!isRecord(payload)) return null;

  const previous = payload.previousAssessment;
  const current = payload.currentAssessment;
  if (!isRecord(previous) || !isRecord(current)) return null;
  if (typeof previous.regime !== "string" || typeof current.regime !== "string") return null;
  if (typeof payload.previousRecordDate !== "string") return null;
  if (typeof payload.currentRecordDate !== "string") return null;

  return {
    id: entry.id,
    loggedAt: entry.createdAt,
    previous: { recordDate: payload.previousRecordDate, regime: previous.regime },
    current: { recordDate: payload.currentRecordDate, regime: current.regime },
    reasons: Array.isArray(payload.reasons) ? payload.reasons.filter(isReason) : [],
    timeMachineHref: typeof payload.timeMachineHref === "string" ? payload.timeMachineHref : undefined,
  };
};

const parseAlertRecords = (payload: unknown): AlertRecord[] => {
  if (!isRecord(payload) || !Array.isArray(payload.alerts)) return [];
  return payload.alerts.map(toAlertRecord).filter((entry): entry is AlertRecord => entry !== null);
};

const parseChannelPreferences = (payload: unknown): ChannelPreferences | null => {
  if (!isRecord(payload) || !isRecord(payload.preferences)) return null;

  const source = payload.preferences;
  const parsed: ChannelPreferences = { slack: false, email: false, webhook: false };
  for (const channel of CHANNELS) {
    const value = source[channel];
    if (typeof value !== "boolean") return null;
    parsed[channel] = value;
  }
  return parsed;
};

export const RegimeAlertsPanel = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [preferences, setPreferences] = useState<ChannelPreferences>({
    slack: false,
    email: false,
    webhook: false,
  });
  const { activeTarget, copiedTarget, status, error, copyToClipboard } = useClipboardCopy();
  const clientId = usePersistentClientId();

  useEffect(() => {
    if (!clientId) return;

    void fetch(`/api/alert-preferences?clientId=${encodeURIComponent(clientId)}`, {
      headers: { "x-whether-client-id": clientId },
    })
      .then(async (response) => {
        if (!response.ok) return;
        const parsed = parseChannelPreferences(await response.json());
        if (parsed) setPreferences(parsed);
      })
      .catch(() => {
        // Keep the defaults; an unreachable preference read is not worth a visible error.
      });
  }, [clientId]);

  useEffect(() => {
    let active = true;

    void fetch("/api/regime-alerts")
      .then(async (response) => {
        if (!response.ok) return;
        const parsed = parseAlertRecords(await response.json());
        if (active) setAlerts(parsed);
      })
      .catch(() => {
        if (active) setAlerts([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const togglePreference = (channel: DeliveryChannel) => {
    if (!clientId) return;

    const next = { ...preferences, [channel]: !preferences[channel] };
    setPreferences(next);
    void fetch("/api/alert-preferences", {
      method: "POST",
      headers: { "content-type": "application/json", "x-whether-client-id": clientId },
      body: JSON.stringify({ clientId, preferences: next }),
    }).catch(() => {
      // Keep the optimistic toggle and avoid noisy fetch errors in the console.
    });
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
            <p className="type-label text-slate-400">Change alerts</p>
            <h3 id="regime-alert-log-title" className="type-section text-slate-100">
              Alert history
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Every logged environment change and the reasons behind it. Copy one to paste into a
              thread or a board doc.
            </p>
          </div>
          <div className="weather-surface space-y-2 p-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
              Where you would want these
            </p>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => togglePreference(channel)}
                  disabled={!clientId}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] ${
                    preferences[channel] ? "text-emerald-200" : "text-slate-400"
                  }`}
                  aria-pressed={preferences[channel]}
                  data-premium-intent="integrations"
                  data-premium-cta={`toggle_alert_channel_${channel}`}
                  data-premium-detail={channel}
                >
                  {preferences[channel] ? "✓" : "○"} {channel}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Push delivery is not live yet. This records the channel against this device&apos;s
              operator profile; nothing is sent from here.
            </p>
          </div>
        </div>
        {alerts.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-800/80 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-300">
              No changes logged yet. An alert lands here when the regime shifts between records.
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
                        {entry.previous.regime} → {entry.current.regime}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Previous record: {formatRecordDate(entry.previous.recordDate)} · Current
                        record: {formatRecordDate(entry.current.recordDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(copyText, entry.id)}
                      aria-busy={isCopying}
                      className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-1 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
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
                  {entry.timeMachineHref ? (
                    <a
                      href={entry.timeMachineHref}
                      className="mt-3 inline-flex type-eyebrow text-sky-200 hover:text-sky-100"
                    >
                      View regime history →
                    </a>
                  ) : null}
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
      </div>
    </section>
  );
};
