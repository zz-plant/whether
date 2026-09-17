import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { LegalPageShell } from "../components/legalPageShell";
import { publisherAuthor, publisherContactPath } from "../../lib/publisher";

/**
 * What this site holds about a reader, written from what the code does.
 *
 * It did not exist. The footer carried Terms and an Acceptable Use Policy, and
 * every use of the word "data" in both means *market* data — while the product
 * stores subscriber addresses, Stripe customer emails, a per-browser
 * identifier the server reads back, and five telemetry streams.
 *
 * The gap mattered more here than it would elsewhere, because /pricing
 * publishes a promise — "No signup, no key, no trackers" — that the code is
 * genuinely built to honour (lib/searchTelemetry.ts and lib/activationFunnel.ts
 * each cite it as a constraint on their own payloads). A claim a reader cannot
 * check is worth less than the work that went into making it true.
 *
 * So this page is an inventory, not boilerplate: every item names the thing
 * that stores it. Anything added to lib/storage/keys.ts, TELEMETRY_STREAMS, or
 * a new KV keyspace belongs here the same day — tests/privacyPolicy.test.tsx
 * fails when a storage key or a stream is not accounted for.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Privacy",
  description:
    "What Whether stores about a reader, where it is stored, and what it is used for — itemised against the code.",
  path: "/privacy",
  imageAlt: "Whether privacy policy",
});

const paragraph = "text-sm leading-7 text-slate-200 sm:text-base";
const heading = "text-xl font-semibold text-slate-50";
const subheading = "text-base font-semibold text-slate-100 sm:text-lg";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy" effectiveDate="9/17/2026">
      <section className="space-y-4">
        <p className={paragraph}>
          Whether is a weekly operating call built on public macroeconomic data. The call itself, the
          API, the MCP endpoint, and embeds need no account, so most readers are never asked for
          anything. This page lists what is stored when you do give something, where it lives, and
          what it is used for.
        </p>
        <p className={paragraph}>
          It is written against the code rather than from a template. Where it names a store, that is
          the store.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>1. What this site does not do</h2>
        <ul className={`list-disc space-y-2 pl-5 ${paragraph}`}>
          <li>
            No third-party analytics, tag manager, advertising network, or social pixel. There is no
            such script on any page.
          </li>
          <li>
            No web fonts fetched from anyone else. Fonts are served from this site, so loading a page
            tells no third party that you did.
          </li>
          <li>
            No account, key, or email is required to read the weekly call, call the API, use the MCP
            endpoint, or embed the brief.
          </li>
          <li>
            Text you type into the search box is never sent. The search measurement carries which
            kind of result the query routed to, how many things matched, and whether it matched
            nothing — the payload has no field that could hold the words, so it cannot carry them by
            mistake.
          </li>
          <li>Nothing here is sold, rented, or shared for advertising, and no profile is built across sites.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>2. What is stored, and where</h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className={subheading}>2.1 Your email address, if you subscribe</h3>
            <p className={paragraph}>
              Subscribing stores your address, the time you subscribed, whether you have confirmed
              it, whether you opted in to regime-change alerts as well as the Monday brief, and a
              random token that makes the confirmation and unsubscribe links work. It is held in
              Cloudflare KV and used to send you those emails and nothing else. Nothing is sent until
              you click the confirmation link. Every email carries an unsubscribe link, and using it
              deactivates the record immediately.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.2 Payment details, if you buy a plan</h3>
            <p className={paragraph}>
              Payment is handled by Stripe. Card details are entered on Stripe&apos;s checkout page and
              never reach this site. When a payment completes, Stripe tells us the plan, its own
              session and customer identifiers, and the email address you gave it; we store those so
              your browser can be told the subscription is active. Stripe&apos;s own handling of your
              data is covered by Stripe&apos;s privacy policy.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.3 A random identifier for your browser</h3>
            <p className={paragraph}>
              The first time you use a feature that saves something — recording a decision, saving a
              Decision Shield preset — your browser generates a random identifier and keeps it in
              local storage. It is sent with those requests so that what one browser saved can only
              be read back by that browser.
            </p>
            <p className={paragraph}>
              It is not derived from anything about you, is never joined to your email address or
              payment record, and is not part of any measurement. Clearing site data in your browser
              removes it; the next thing you save gets a new one, and the old records become
              unreachable.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.4 Things you deliberately save</h3>
            <p className={paragraph}>
              Decisions you record are stored in Cloudflare KV against the identifier above, with the
              regime reading at the time so a later week can be compared against the decision&apos;s
              own assumptions. Everything else you set stays in your browser and is never sent: your
              operator profile, Decision Shield presets, threshold drafts, the last call this browser
              saw, the theme, and which one-time explainers you have dismissed.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.5 One cookie, set only if you choose a stage</h3>
            <p className={paragraph}>
              Picking a company stage writes a cookie so the panels on a page agree with each other
              and the call is calibrated the same way everywhere. It holds the stage you picked, is
              read only by this site, and is set by no other action.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.6 Usage measurement</h3>
            <p className={paragraph}>
              Pages report how fast they loaded, which route was moved to from which, a coarse bucket
              for where a visit arrived from (a search engine, a link, typed directly — never the
              referring URL), the steps of the checkout funnel, and the shape of a search as
              described above. These go to Cloudflare Analytics Engine.
            </p>
            <p className={paragraph}>
              What is written is the event and nothing around it: no IP address, no user-agent
              string, and none of the identifiers above. The intake refuses any payload carrying a
              field it does not expect, so a stream cannot quietly start carrying more than it says.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.6a Pages saved for offline reading</h3>
            <p className={paragraph}>
              Your browser keeps a copy of the pages you have opened, and of the fonts and scripts they
              need, so the brief still opens without a connection. It is a copy of what this site already
              sent you — no record of what you read is made here or anywhere else, and nothing about it is
              sent back. When you are offline the page says which reading it is showing you rather than
              letting an old one pass for the current one. Clearing site data removes it.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.7 Abuse limits and server logs</h3>
            <p className={paragraph}>
              Endpoints that send email or accept public writes are rate-limited against the network
              address Cloudflare reports for the request. That address is used as a counter key
              inside Cloudflare&apos;s rate limiter; this site does not store it.
            </p>
            <p className={paragraph}>
              This site runs on Cloudflare, so Cloudflare processes every request in order to serve
              it, and request-level logging and tracing are enabled for debugging. Cloudflare acts as
              our infrastructure provider and handles that data under its own terms.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>3. Who else is involved</h2>
        <p className={paragraph}>
          Cloudflare hosts the site and provides its storage, email sending, logging, and
          measurement. Stripe processes payments. Those are the only two services that receive
          anything about a reader.
        </p>
        <p className={paragraph}>
          The data the product is built on — Treasury, FRED, and market quote providers — is fetched
          by our servers on a schedule. Those requests carry nothing about you, and are made whether
          or not anyone is reading.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>4. How long things are kept</h2>
        <p className={paragraph}>
          A subscription is kept until you unsubscribe. An entitlement record is kept while the
          subscription is active and is cancelled when Stripe reports that it ended. Saved decisions
          are kept until you ask for them to be deleted or the browser that owns them is cleared.
          Measurement is retained by Cloudflare Analytics Engine on its own schedule and is read back
          only in aggregate, over a trailing window, for the operational history published on{" "}
          <Link href="/trust" className="text-sky-300 underline-offset-2 hover:underline">
            the readiness page
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>5. Your choices</h2>
        <ul className={`list-disc space-y-2 pl-5 ${paragraph}`}>
          <li>Stop the emails with the unsubscribe link in any of them. No reply or account needed.</li>
          <li>
            Remove everything held in your browser — the identifier, presets, drafts, the stage
            cookie — by clearing site data for this site.
          </li>
          <li>
            Ask for a copy of what is held against your address, or for it to be deleted, by emailing{" "}
            <a
              href={`mailto:${publisherAuthor.email}`}
              className="text-sky-300 underline-offset-2 hover:underline"
            >
              {publisherAuthor.email}
            </a>
            . It is one person reading that inbox, so say which address to look up.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>6. Changes</h2>
        <p className={paragraph}>
          This site is open source, so changes to this page are visible in its history alongside the
          code that made them necessary. Material changes will move the effective date above. Reach
          the editor through the{" "}
          <Link href={publisherContactPath} className="text-sky-300 underline-offset-2 hover:underline">
            contact page
          </Link>{" "}
          with anything this page does not answer.
        </p>
      </section>
    </LegalPageShell>
  );
}
