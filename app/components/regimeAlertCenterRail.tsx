"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTimestampUTC } from "../../lib/formatters";

type DeliveryChannel = "slack" | "email" | "webhook";
type DeliveryPreferences = Record<DeliveryChannel, boolean>;

type ServerAlert = {
  id: string;
  createdAt: string;
  payload: {
    previousAssessment: { regime: string };
    currentAssessment: { regime: string };
    reasons: Array<{ code: string }>;
  };
};

type DeliveryEvent = {
  id: string;
  channel: DeliveryChannel;
  deliveredAt: string;
  status: "sent" | "skipped";
  summary: string;
};

const pollIntervalMs = 30_000;
const livenessTickMs = 60_000;
const seenStorageKey = "whether-last-seen-alert-id";
const clientStorageKey = "whether-alert-client-id";

const channels: DeliveryChannel[] = ["slack", "email", "webhook"];

const createClientId = () => {
  const existing = window.localStorage.getItem(clientStorageKey);
  if (existing) {
    return existing;
  }
  const created = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`;
  window.localStorage.setItem(clientStorageKey, created);
  return created;
};

const formatRelativeAge = (value?: string) => {
  if (!value) {
    return "No alerts yet";
  }

  const createdAt = Date.parse(value);
  if (Number.isNaN(createdAt)) {
    return "Age unavailable";
  }

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "<1m ago";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const RegimeAlertCenterRail = () => {
  const [alerts, setAlerts] = useState<ServerAlert[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryEvent[]>([]);
  const [clientId, setClientId] = useState("anonymous");
  const [preferences, setPreferences] = useState<DeliveryPreferences>({
    slack: true,
    email: true,
    webhook: false,
  });
  const [latestSeenId, setLatestSeenId] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string>("");
  const [isDelivering, setIsDelivering] = useState(false);
  const [, setLivenessTick] = useState(0);

  const latestAlert = alerts[0];
  const latestAgeLabel = useMemo(() => formatRelativeAge(latestAlert?.createdAt), [latestAlert]);
  const hasUnread = Boolean(latestAlert && latestAlert.id !== latestSeenId);

  const loadAlerts = useCallback(async () => {
    const response = await fetch("/api/regime-alerts", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { alerts?: ServerAlert[] };
    setAlerts(Array.isArray(payload.alerts) ? payload.alerts : []);
  }, []);

  const loadDeliveries = useCallback(async () => {
    const response = await fetch("/api/alert-deliveries", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { deliveries?: DeliveryEvent[] };
    setDeliveries(Array.isArray(payload.deliveries) ? payload.deliveries : []);
  }, []);

  useEffect(() => {
    setClientId(createClientId());
    setLatestSeenId(window.localStorage.getItem(seenStorageKey));
  }, []);

  useEffect(() => {
    if (clientId === "anonymous") {
      return;
    }

    void fetch(`/api/alert-preferences?clientId=${encodeURIComponent(clientId)}`)
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { preferences?: DeliveryPreferences };
        if (payload.preferences) {
          setPreferences(payload.preferences);
        }
      })
      .catch(() => undefined);
  }, [clientId]);

  useEffect(() => {
    void loadAlerts();
    void loadDeliveries();

    const poll = window.setInterval(() => {
      void loadAlerts();
      void loadDeliveries();
    }, pollIntervalMs);

    const livenessTick = window.setInterval(() => {
      setLivenessTick((value) => value + 1);
    }, livenessTickMs);

    return () => {
      window.clearInterval(poll);
      window.clearInterval(livenessTick);
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

  const markLatestRead = () => {
    if (!latestAlert) {
      return;
    }
    window.localStorage.setItem(seenStorageKey, latestAlert.id);
    setLatestSeenId(latestAlert.id);
  };

  const simulateDelivery = () => {
    if (!latestAlert) {
      setDeliveryStatus("No alert available for delivery simulation.");
      return;
    }

    setIsDelivering(true);
    setDeliveryStatus("Simulating sends…");

    void fetch("/api/alert-deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, alertId: latestAlert.id }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setDeliveryStatus("Delivery simulation failed.");
          return;
        }
        const payload = (await response.json()) as { deliveries?: DeliveryEvent[] };
        const sentCount = (payload.deliveries ?? []).filter((item) => item.status === "sent").length;
        setDeliveryStatus(`Simulation complete: ${sentCount} channel${sentCount === 1 ? "" : "s"} sent.`);
        await loadDeliveries();
      })
      .catch(() => {
        setDeliveryStatus("Delivery simulation failed.");
      })
      .finally(() => {
        setIsDelivering(false);
      });
  };

  return (
    <aside className="weather-panel space-y-4 p-4 sm:p-5 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:overscroll-contain">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">Alert center</p>
        <p className="text-sm text-slate-200">Last alert age: {latestAgeLabel}</p>
        {hasUnread ? (
          <p className="inline-flex rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
            New alert
          </p>
        ) : (
          <p className="text-xs text-slate-400">All alerts read</p>
        )}
      </header>

      <section aria-label="Alert timeline" className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Recent timeline</h2>
        {alerts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700/70 bg-slate-950/50 p-3 text-sm text-slate-300">No alert events yet.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((alert, index) => {
              const isUnread = alert.id !== latestSeenId;
              return (
                <li
                  key={alert.id}
                  className={`rounded-xl border p-3 ${isUnread ? "border-emerald-400/50 bg-emerald-500/10" : "border-slate-700/70 bg-slate-900/60"}`}
                >
                  <p className="text-xs text-slate-300">{formatTimestampUTC(alert.createdAt)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {alert.payload.previousAssessment.regime} → {alert.payload.currentAssessment.regime}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Reasons: {alert.payload.reasons.map((reason) => reason.code).join(", ") || "n/a"}</p>
                  {index === 0 && hasUnread ? (
                    <button
                      type="button"
                      onClick={markLatestRead}
                      className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-slate-600/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                    >
                      Mark latest read
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Delivery simulation" className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Delivery simulation</h2>
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => (
            <button
              key={channel}
              type="button"
              onClick={() => togglePreference(channel)}
              className={`inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${preferences[channel]
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                : "border-slate-700/70 text-slate-300"
                }`}
              aria-pressed={preferences[channel]}
            >
              {preferences[channel] ? "On" : "Off"} · {channel}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={simulateDelivery}
          disabled={isDelivering}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-sky-400/70 bg-sky-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDelivering ? "Simulating…" : "Simulate latest send"}
        </button>
        {deliveryStatus ? <p className="text-xs text-slate-300">{deliveryStatus}</p> : null}
        {deliveries.length > 0 ? (
          <ul className="space-y-2 text-xs text-slate-300">
            {deliveries.slice(0, 4).map((delivery) => (
              <li key={delivery.id} className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                {delivery.channel} · {delivery.status} · {formatTimestampUTC(delivery.deliveredAt)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </aside>
  );
};
