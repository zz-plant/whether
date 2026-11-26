"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { requestSubscription, requestSlackSubscription } from "./subscribeRequest";
import { trackActivationEvent } from "../../lib/activationFunnel";
import { CalendarReviewActions } from "./CalendarReviewActions";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";
import { useOperatorStage } from "./useOperatorStage";
import { useOperatorRunway } from "./useOperatorRunway";

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
 * The subscription form, in two shapes.
 *
 * `inline` (2026-11-26) is one field and one button: the Monday email, with an
 * alert the day conditions change. It sits under the call on `/` and under
 * "What changed" on `/brief/[week]`, and asks nothing else, because every
 * choice between a reader and the email is a reason to leave without it.
 * `moreHref` adds a line linking the full form, for alerts only or Slack.
 *
 * The full form, on `/share` and at the foot of `/brief/[week]`, carries both
 * channels (Email to an inbox, Slack to a channel) and both promises: an email
 * only when the guidance changes, or Monday's brief as well. It starts on
 * Monday. It keeps the `subscribe-email` id that the README links and
 * `StickyCallStrip` watches; the inline form takes ids of its own, so a page
 * can hold both.
 */
export function SubscribeForm({
  inline = false,
  moreHref,
}: {
  /** One field and one button for the Monday email; see above. */
  inline?: boolean;
  /** With `inline`: where the full form is, for alerts only or Slack. */
  moreHref?: string;
} = {}) {
  const pathname = usePathname() ?? "/";
  /* The stage the reader already set for the on-site rules; their brief prints
     the same rules, so the signup carries it rather than asking again. */
  const { stage } = useOperatorStage();
  /* The runway band the reader already chose for the on-site notes; their brief
     prints the same one, so the signup carries it rather than asking again. */
  const { runwayBand, runwayBandFixed } = useOperatorRunway();
  const [channel, setChannel] = useState<SubscribeChannel>("email");
  const [chosenFrequency, setFrequency] = useState<EmailFrequency>("weekly");
  const frequency = inline ? "weekly" : chosenFrequency;
  const alertsOnly = channel === "email" && frequency === "alerts";
  const inlineId = useId();
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
      const result = await requestSubscription(email, { alerts: true, weekly: frequency === "weekly", ...(stage ? { stage } : {}), ...(runwayBand ? { runwayBand, runwayBandFixed } : {}) });
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
      if (result.ok) {
        setEmail("");
        trackActivationEvent({ step: "committed", path: pathname, commitment: inline ? "subscribed_inline" : "subscribed" });
      }
    }
  };

  if (inline) {
    const messageId = `${inlineId}-message`;
    if (status === "success") {
      return (
        <output className="flex items-center gap-2 text-fluid-sm text-[var(--app-text-secondary)]">
          <Check className="size-4 shrink-0 text-line-clear-fg" aria-hidden="true" />
          <span>
            <span className="font-semibold text-[var(--app-text)]">Check your inbox.</span> {message}
          </span>
        </output>
      );
    }
    return (
      <form onSubmit={handleSubmit} noValidate className="space-y-2" data-monday-email-inline>
        <div className="flex max-w-xl flex-wrap gap-2">
          {/* Named by `aria-label`, not a hidden label: the button beside it says what
              the field is for, and the homepage's word budget counts hidden text. */}
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            aria-label="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="you@company.com"
            disabled={status === "loading"}
            aria-invalid={status === "error" ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            className="min-h-11 min-w-0 grow-[999] basis-56 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-sm text-[var(--app-text)] transition-colors placeholder:text-[var(--app-text-secondary)] disabled:opacity-50 weather-focus-ring"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="weather-button-primary min-h-11 grow px-4 py-2 text-fluid-sm font-semibold disabled:opacity-50 weather-focus-ring weather-press-scale"
          >
            {status === "loading" ? "Subscribing…" : "Email me Mondays"}
          </button>
        </div>
        {message ? (
          <p id={messageId} role="alert" className="text-fluid-nano text-line-crossed-fg">
            {message}
          </p>
        ) : null}
        {moreHref ? (
          <p className="text-fluid-nano text-[var(--app-text-secondary)]">
            One email a week, one more the day conditions change. Unsubscribe in one click.{" "}
            <a href={moreHref} className="underline decoration-[color:var(--border-strong)] underline-offset-4 hover:text-[var(--app-text)]">
              Alerts only, or Slack
            </a>
          </p>
        ) : null}
      </form>
    );
  }

  if (status === "success") {
    return (
      <div className="weather-section-border flex flex-col items-center justify-center py-6 text-center space-y-2">
        <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 p-2 text-emerald-400">
          <Check className="size-5" aria-hidden="true" />
        </span>
        {/* The heading names the outcome that actually happened. "Subscribed!"
            claimed a state that only becomes true when the reader clicks the
            link in the mail. */}
        <p className="text-fluid-sm font-semibold text-slate-50">
          {channel === "slack" ? "Slack channel connected" : "Check your inbox"}
        </p>
        <p className="text-fluid-nano text-slate-300">
          {message}
          {alertsOnly ? " After that, you hear from us only when something moves." : null}
        </p>
        {channel === "slack" ? (
          <p className="text-fluid-nano text-slate-400">
            To stop delivery, delete the webhook in Slack. Whether stops posting once it is gone.
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
          {channel === "slack" ? "Connect another channel" : "Use a different address"}
        </button>
      </div>
    );
  }

  return (
    <div className="weather-section-border space-y-3">
      {/* The channel control sits on the title line so the card has no empty
          top-left corner above the description. */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <p className="text-fluid-sm font-medium text-slate-50">
            {channel === "slack"
              ? "Get the Monday brief in a Slack channel"
              : alertsOnly
                ? "Tell me when the guidance changes"
                : "Get the guidance every Monday, and a note the day it changes"}
          </p>

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
        <p className="max-w-[60ch] text-fluid-sm text-slate-400">
          {channel === "slack"
            ? "Paste the incoming webhook URL for a channel. The brief arrives there every Monday at 9:00 AM ET."
            : alertsOnly
              ? "We’ll email you the day the guidance changes, an area pauses or restarts, or a market input jumps."
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
          <div className="flex flex-wrap gap-2">
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
              className="min-h-11 min-w-0 grow-[999] basis-56 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring weather-press-scale"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="weather-button-primary min-h-11 grow px-4 py-2 text-fluid-sm font-semibold disabled:opacity-50 weather-focus-ring weather-press-scale"
            >
              {status === "loading" ? "Subscribing…" : alertsOnly ? "Email me when it changes" : "Subscribe"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <label htmlFor="slack-webhook-url" className="sr-only">Slack incoming webhook URL</label>
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
              className="min-h-11 min-w-0 grow-[999] basis-56 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring weather-press-scale"
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
              className="min-h-11 min-w-0 grow basis-36 rounded-lg border border-[color:var(--border-strong)] bg-[var(--bg-nested)] px-3 py-2 text-base sm:text-xs text-slate-100 transition-colors placeholder:text-slate-500 disabled:opacity-50 weather-focus-ring"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="weather-button-primary min-h-11 grow px-4 py-2 text-fluid-sm font-semibold disabled:opacity-50 weather-focus-ring weather-press-scale"
            >
              {status === "loading" ? "Connecting…" : "Connect Slack"}
            </button>
          </div>
        )}
      </form>

      {message && (
        <p id="subscribe-message" role="alert" className="text-fluid-nano text-rose-400">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[color:var(--border-subtle)] text-fluid-nano text-slate-400">
        <span>
          {alertsOnly
            ? "Alerts only, no Monday email. Unsubscribe in one click."
            : channel === "slack"
              ? "Set a recurring Monday hold"
              : "Prefer calendar holds over email?"}
        </span>
        {alertsOnly ? null : (
          <CalendarReviewActions variant="compact" />
        )}
      </div>
    </div>
  );
}
