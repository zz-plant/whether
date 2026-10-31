"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Calendar } from "lucide-react";
import { requestSubscription, requestSlackSubscription } from "./subscribeRequest";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { buildMondayCalendarUrl } from "./calendarButton";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";
import { useOperatorStage } from "./useOperatorStage";

type SubscribeChannel = "email" | "slack";
type EmailFrequency = "alerts" | "weekly";

const CHANNEL_OPTIONS: readonly SegmentedOption<SubscribeChannel>[] = [
  { key: "email", label: "Email" },
  { key: "slack", label: "Slack" },
];

const FREQUENCY_OPTIONS: readonly SegmentedOption<EmailFrequency>[] = [
  { key: "alerts", label: "Only when it changes" },
  { key: "weekly", label: "Every Monday too" },
];

/**
 * The one subscription form, with both promises on it: an email only when the
 * guidance changes, or Monday's brief as well.
 *
 * There were two forms. A first visit met "Tell me when this changes" under the
 * decision picker (alerts only, "No weekly newsletter"); a returning reader met
 * "Get the guidance every Monday" at the foot of the brief. Each was honest,
 * and on separate screens they read as two products making different claims.
 * `defaultFrequency` picks which choice starts selected: alerts on a first
 * visit, where a weekly email is the larger ask, Monday everywhere else.
 *
 * Supports delivery directly to executive inboxes (Email) or team channels (Slack).
 *
 * `compact` is the inline block on the brief; the default is the fuller block
 * that /share and /brief/[week] mount for a recipient arriving from a link.
 */
export function SubscribeForm({
  compact = false,
  defaultFrequency = "weekly",
  condition,
  showTitle = true,
}: {
  compact?: boolean;
  defaultFrequency?: EmailFrequency;
  /** The call-change line, printed as the next change to watch when the form offers alerts. */
  condition?: string;
  /** False where the section's own heading already says what the form is for. */
  showTitle?: boolean;
} = {}) {
  const pathname = usePathname() ?? "/";
  /* The stage the reader already set for the on-site rules; their brief prints
     the same rules, so the signup carries it rather than asking again. */
  const { stage } = useOperatorStage();
  const [channel, setChannel] = useState<SubscribeChannel>("email");
  const [frequency, setFrequency] = useState<EmailFrequency>(defaultFrequency);
  const alertsOnly = channel === "email" && frequency === "alerts";
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
      const result = await requestSubscription(email, { alerts: true, weekly: frequency === "weekly", ...(stage ? { stage } : {}) });
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
        <p className="text-fluid-xs font-semibold text-slate-50">
          {channel === "slack" ? "Slack Channel Connected!" : "Subscribed!"}
        </p>
        <p className="text-fluid-micro text-slate-300">
          {message}
          {alertsOnly ? " After that, you hear from us only when something moves." : null}
        </p>
        {channel === "slack" ? (
          <p className="text-fluid-nano text-slate-400">
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
      {/* The channel control sits on the title line, and the description runs
          the full width under both. Centred beside a four-line paragraph it
          floated in the card's top-right corner with the text squeezed to half. */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {showTitle ? (
            <p className="text-fluid-sm font-medium text-slate-50">
              {channel === "slack"
                ? "Automate Monday brief delivery directly to Slack"
                : alertsOnly
                  ? "Tell me when the guidance changes"
                  : "Get the guidance every Monday, and a note the day it changes"}
            </p>
          ) : (
            <span />
          )}

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
          />
        </div>
        <p className="max-w-[72ch] text-fluid-xs text-slate-400">
          {channel === "slack"
            ? "Every Monday at 9:00 AM ET, the brief arrives in the channel you choose."
            : alertsOnly
              ? <>
                  {condition ? <>Next change to watch: {condition} </> : null}
                  We&rsquo;ll email you the day the guidance changes, a score crosses one of its lines, or a market
                  input jumps.
                </>
              : "Monday morning: the conditions, the one action they call for, and a link to the evidence behind it."}
        </p>
      </div>

      {channel === "email" ? (
        <SegmentedControl
          ariaLabel="How often"
          options={FREQUENCY_OPTIONS}
          value={frequency}
          onSelect={(next) => {
            setFrequency(next);
            if (status === "error") setStatus("idle");
          }}
          className="self-start"
        />
      ) : null}

      {/* `noValidate` (2026-10-27): the browser's own check stopped a bad address before
          `handleSubmit` ran, so a reader got a bubble that vanished on the next tap, with no
          `aria-invalid` and nothing in the message line below. The request helpers check
          both fields and say what is wrong where every other failure here is said. */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
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
              className="weather-button-primary min-h-11 px-4 py-2 text-fluid-xs font-semibold disabled:opacity-50 weather-focus-ring weather-press-scale"
            >
              {status === "loading" ? "Subscribing…" : alertsOnly ? "Email me when it changes" : "Subscribe"}
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
              className="weather-button-primary min-h-11 px-4 py-2 text-fluid-xs font-semibold disabled:opacity-50 weather-focus-ring weather-press-scale"
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
          {alertsOnly
            ? "No weekly newsletter. Unsubscribe in one click."
            : compact
              ? channel === "slack"
                ? "Monday mornings, and an alert the day conditions change. To stop, delete the webhook in Slack."
                : "One email a week, one more the day conditions change. Unsubscribe in one click."
              : channel === "slack"
                ? "Set a recurring Monday hold"
                : "Prefer calendar holds over email?"}
        </span>
        {alertsOnly ? null : (
          <a
            href={buildMondayCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="weather-hit inline-flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Calendar className="size-3" aria-hidden="true" />
            <span>Add a Monday calendar hold (9:00 AM)</span>
          </a>
        )}
      </div>
    </div>
  );
}
