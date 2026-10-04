"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Calendar } from "lucide-react";
import { requestSubscription, requestSlackSubscription } from "./subscribeRequest";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { buildMondayCalendarUrl } from "./calendarButton";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";

type SubscribeChannel = "email" | "slack";

const CHANNEL_OPTIONS: readonly SegmentedOption<SubscribeChannel>[] = [
  { key: "email", label: "Email" },
  { key: "slack", label: "Slack" },
];

/**
 * One subscription, one promise: Monday's call, and a note the day it changes.
 *
 * Supports delivery directly to executive inboxes (Email) or team channels (Slack).
 *
 * `compact` is the inline row under the hero; the default is the fuller block
 * that /share and /brief/[week] mount for a recipient arriving from a link.
 */
export function SubscribeForm({ compact = false }: { compact?: boolean } = {}) {
  const pathname = usePathname() ?? "/";
  const [channel, setChannel] = useState<SubscribeChannel>("email");
  const [email, setEmail] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    if (channel === "slack") {
      const result = await requestSlackSubscription(slackWebhookUrl, { channelName });
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
      if (result.ok) {
        setSlackWebhookUrl("");
        setChannelName("");
        trackActivationEvent({ step: "committed", path: pathname, commitment: "subscribed" });
      }
    } else {
      const result = await requestSubscription(email, { alerts: true, weekly: true });
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
      if (result.ok) {
        setEmail("");
        trackActivationEvent({ step: "committed", path: pathname, commitment: "subscribed" });
      }
    }
  };

  if (status === "success") {
    return (
      <div className="weather-section-border flex flex-col items-center justify-center py-6 text-center space-y-2">
        <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-2 text-emerald-400">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <p className="text-fluid-xs font-semibold text-white">
          {channel === "slack" ? "Slack Channel Connected!" : "Subscribed!"}
        </p>
        <p className="text-fluid-micro text-white/60">{message}</p>
        {channel === "slack" ? (
          <p className="text-fluid-nano text-white/40">
            To stop delivery, delete this webhook in your Slack admin. Whether removes it automatically.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className="mt-2 text-fluid-nano text-sky-400 hover:text-sky-300 underline"
        >
          Subscribe another destination
        </button>
      </div>
    );
  }

  return (
    <div className={compact
      ? "space-y-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-4 py-3"
      : "weather-section-border space-y-3"}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-fluid-sm font-medium text-white">
            {channel === "slack"
              ? "Automate Monday brief delivery directly to Slack"
              : "Get the guidance every Monday, and a note the day it changes"}
          </p>
          {compact ? null : (
            <p className="text-fluid-xs text-slate-400 mt-0.5">
              {channel === "slack"
                ? "Every Monday at 9:00 AM ET, the brief arrives in the channel you choose."
                : "Monday morning: the conditions, the one action they call for, and a link to the evidence behind it."}
            </p>
          )}
        </div>

        {/* The one segmented control (segmentedControl.tsx): a radio group,
            so arrows move between the two channels and the pair is one tab
            stop, rather than two buttons with a hand-drawn selected state. */}
        <SegmentedControl
          ariaLabel="Delivery channel"
          options={CHANNEL_OPTIONS}
          value={channel}
          onSelect={(next) => {
            setChannel(next);
            setStatus("idle");
            setMessage("");
          }}
          className="self-start sm:self-auto"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {channel === "email" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="subscribe-email" className="sr-only">Email address</label>
            <input
              id="subscribe-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="e.g. you@company.com…"
              disabled={status === "loading"}
              aria-invalid={status === "error" ? true : undefined}
              aria-describedby={message ? "subscribe-message" : undefined}
              className="min-h-11 flex-1 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring weather-press-scale"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="weather-button-primary min-h-11 px-4 py-2 text-xs disabled:opacity-50 weather-focus-ring weather-press-scale"
            >
              {status === "loading" ? "Subscribing…" : "Subscribe"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="slack-webhook-url" className="sr-only">Slack Incoming Webhook URL</label>
            <input
              id="slack-webhook-url"
              name="slackWebhookUrl"
              type="url"
              inputMode="url"
              spellCheck={false}
              value={slackWebhookUrl}
              onChange={(e) => {
                setSlackWebhookUrl(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="https://hooks.slack.com/services/…"
              disabled={status === "loading"}
              aria-invalid={status === "error" ? true : undefined}
              aria-describedby={message ? "subscribe-message" : undefined}
              className="min-h-11 flex-1 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring weather-press-scale"
            />
            <label htmlFor="slack-channel-name" className="sr-only">Channel name</label>
            <input
              id="slack-channel-name"
              name="slackChannelName"
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="#leadership (optional)"
              disabled={status === "loading"}
              className="min-h-11 w-full sm:w-36 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="weather-button-primary min-h-11 px-4 py-2 text-xs disabled:opacity-50 weather-focus-ring weather-press-scale"
            >
              {status === "loading" ? "Connecting…" : "Connect Slack"}
            </button>
          </div>
        )}
      </form>

      {message && (
        <p id="subscribe-message" aria-live="polite" className="text-fluid-micro text-rose-400">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[color:var(--border-subtle)] text-fluid-nano text-slate-400">
        <span>
          {compact
            ? channel === "slack"
              ? "Monday mornings, and an alert the day conditions change. To stop, delete the webhook in Slack."
              : "One email a week, one more the day conditions change. Unsubscribe in one click."
            : channel === "slack"
              ? "Set a recurring Monday hold"
              : "Prefer calendar holds over email?"}
        </span>
        <a
          href={buildMondayCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="weather-hit inline-flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300 transition-colors"
        >
          <Calendar className="size-3" aria-hidden="true" />
          <span>Add Monday Calendar Hold (9:00 AM)</span>
        </a>
      </div>
    </div>
  );
}
