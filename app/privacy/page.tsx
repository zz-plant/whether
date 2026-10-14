import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { LegalPageShell } from "../components/legalPageShell";
import { MeasurementChoice } from "./MeasurementChoice";
import { publisherAuthor, publisherContactPath } from "../../lib/publisher";

/**
 * What this site holds about a reader, written from what the code does.
 *
 * It did not exist. The footer carried Terms and an Acceptable Use Policy, and
 * every use of the word "data" in both means *market* data — while the product
 * stores subscriber addresses, a per-browser identifier the server reads back,
 * and five telemetry streams.
 *
 * The gap mattered more here than it would elsewhere, because the product
 * promises no signup, no key and no trackers (section 1 states each), and the
 * code is genuinely built to honour that (lib/searchTelemetry.ts and
 * lib/activationFunnel.ts each cite it as a constraint on their own payloads). A claim a reader cannot
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
    "What Whether stores about a reader, where it is stored and what it is used for, itemised against the code.",
  path: "/privacy",
  imageAlt: "Whether privacy policy",
});

const paragraph = "text-sm leading-7 text-slate-200 sm:text-base";
const heading = "text-xl font-semibold text-slate-50";
const subheading = "text-base font-semibold text-slate-100 sm:text-lg";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy" effectiveDate="10/14/2026">
      <section className="space-y-4">
        <p className={paragraph}>
          Whether is weekly operating guidance built on public macroeconomic data. The guidance itself, the
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
            No account, key, or email is required to read the weekly guidance, call the API, use the MCP
            endpoint, or embed the brief.
          </li>
          <li>
            Text you type into the search box is never sent. The search measurement carries which
            kind of result the query routed to, how many things matched, and whether it matched
            nothing. The record has no field that could hold the words, so it cannot carry them by
            mistake.
          </li>
          <li>Nothing here is sold, rented, or shared for advertising, and no profile is built across sites.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>2. What is stored and where it is kept</h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className={subheading}>2.1 Your email address, if you subscribe</h3>
            <p className={paragraph}>
              Subscribing stores your address, the time you subscribed and whether you have confirmed it.
              It records whether you want the Monday brief itself and whether you opted in to alerts between
              Mondays: conditions changing, a score crossing its line, or an outsized move in a market input.
              If you set pause and resume lines for your own plan on the planning page, it stores them as
              numbers on the two scores for each area you chose, held unconfirmed until you click the link.
              If you left that box ticked, it also stores the runway band you had chosen when you set those
              lines, and the date. The band is one of four, such as 12–24 months, and never a cash or runway
              figure. It is replaced or cleared with the lines. Finally, it stores a random token for the
              unsubscribe link and, while a request is waiting for you, a separate one-time code for its
              confirmation link. It keeps the times of any confirmation emails sent to your address in the
              last day, so that no one can send it more than three in an hour or six in a day. It is held in
              Cloudflare KV and used to send you those emails and nothing else. Nothing is sent until you
              confirm. Any later request for your address changes nothing until you open the link it sends
              and press Confirm on the page that link shows. That holds for turning alerts or the Monday brief
              on or off, setting plan lines, and subscribing again after leaving. The email and that page say
              what the request would change. A confirmation link works once, for 7 days, and stops working
              when a newer request is made for your address. Every email carries an unsubscribe link. It
              opens a page with one button, so a mail filter that opens links to scan them cannot unsubscribe
              you. Pressing it deactivates the record immediately and drops any request still waiting.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.2 A random identifier for your browser</h3>
            <p className={paragraph}>
              Your browser generates a random identifier and keeps it in local storage the first time
              you use a feature that saves something: recording a decision, or saving a Decision Shield
              preset. It is sent with those requests so that what one browser saved can only
              be read back by that browser.
            </p>
            <p className={paragraph}>
              It is not derived from anything about you, is never joined to your email address, and is
              not part of any measurement. Clearing site data in your browser
              removes it. The next thing you save gets a new one, and the old records become
              unreachable.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.3 Things you deliberately save</h3>
            <p className={paragraph}>
              Decisions you record are stored in Cloudflare KV against the identifier above, with the
              reading at the time so a later week can be compared against the decision&apos;s
              own assumptions. Everything else you set stays in your browser and is never sent: your
              operator profile, Decision Shield presets, drafts of your own pause and resume lines, the last
              guidance this browser saw, the number of decisions you last recorded, the theme, and the
              one-time explainers you have dismissed. The brief reads that number so it asks for your record
              only when there is one. A Decision Shield link you copy is the exception. The plan you typed is
              written into the link, so whoever opens it sends that text to this site. There it can appear in
              the request logs described in 2.6.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.4 Two cookies, set only if you calibrate the guidance</h3>
            <p className={paragraph}>
              Picking a company stage writes a cookie so the panels on a page agree with each other
              and the guidance is calibrated the same way everywhere. Picking a cash runway band writes a
              second one for the same reason. Each holds only the band you picked, never a cash figure.
              Each is read only by this site and set by no other action.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.5 Usage measurement</h3>
            <p className={paragraph}>
              Pages report how fast they loaded, which route was moved to from which, whether a
              subscription was made, and whether the brief was copied and in which format. They also
              report the shape of a search, described above. A visit
              to the brief also reports where it arrived from, as a coarse bucket: a search engine, a link
              or typed directly, never the referring URL. It reports whether this browser had opened the
              brief before, and whether the visit used any control on the page, though not which one.
              These go to Cloudflare Analytics Engine, and section 5 turns them off for one browser.
            </p>
            <p className={paragraph}>
              What is written is the event and nothing around it: no IP address, no user-agent
              string, and none of the identifiers above. The intake refuses any record carrying a
              field it does not expect, so a stream cannot quietly start carrying more than it says.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.5a Pages saved for offline reading</h3>
            <p className={paragraph}>
              Your browser keeps a copy of the pages you have opened, and of the fonts and scripts they
              need, so the brief still opens without a connection. It is a copy of what this site already
              sent you. No record of what you read is made here or anywhere else, and nothing about it is
              sent back. When you are offline the page says which reading it is showing you rather than
              letting an old one pass for the current one. Clearing site data removes it.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.5b Browser notifications, if you turn them on</h3>
            <p className={paragraph}>
              If you ask this browser to notify you when conditions change, your browser generates a
              subscription: an address its own push service assigned, and two keys it made. We store those
              three things against the random identifier above. That is the whole record: no email
              address, no reading, and no history of what was sent. It is used to wake this browser when conditions change (a handful of times a year), and for nothing else.
            </p>
            <p className={paragraph}>
              The notification itself carries no content. What it says is fetched by your browser when it is
              shown, so it cannot deliver a stale reading. Turning notifications off in the page removes the
              stored subscription; blocking them in your browser stops them arriving either way.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={subheading}>2.6 Abuse limits and server logs</h3>
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
          measurement. It is the only service that receives anything about a reader.
        </p>
        <p className={paragraph}>
          Our servers fetch the data the product is built on from Treasury, the St. Louis Fed (FRED) and
          market quote providers, on a schedule. Those requests carry nothing about you, and are made whether
          or not anyone is reading.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className={heading}>4. How long things are kept</h2>
        <p className={paragraph}>
          A subscription is kept until you unsubscribe. Saved decisions are kept until you ask for
          them to be deleted or the browser that owns them is cleared. Measurement is retained by Cloudflare Analytics Engine on its own schedule and is read back
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
            <MeasurementChoice />
          </li>
          <li>
            Clear site data for this site to remove everything held in your browser: the identifier,
            presets, drafts, and the stage and runway cookies.
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
