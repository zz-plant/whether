import type { Metadata } from "next";
import Link from "next/link";
import { ActionLink } from "../components/ui/actionLink";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { JsonLdScript } from "../components/jsonLdScript";
import {
  buildBreadcrumbList,
  buildCanonicalUrl,
  buildPageMetadata,
  organizationId,
  organizationName,
  websiteId,
} from "../../lib/seo";
import { graph } from "../../lib/seo/pageStructuredData";
import {
  buildAuthorSchema,
  buildPublisherSchema,
  publisherAuthor,
  publisherContactPath,
  publisherProfilePath,
} from "../../lib/publisher";

import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildTrackRecord } from "../../lib/report/trackRecord";
import { describeRecordCadence } from "../../lib/report/trackRecordCopy";
import { ContentPageShell } from "../components/ui/contentPageShell";
import { MethodSection } from "./methodSection";

export const metadata: Metadata = buildPageMetadata({
  title: "How Whether works",
  description:
    "How Whether sets pause and restart lines for startup decisions, who writes it, and where its data comes from.",
  path: publisherProfilePath,
  imageAlt: "About Whether",
});

const inlineLinkClass =
  "py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100";

export default function AboutPage() {
  const record = buildTrackRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
  const structuredData = graph([
    {
      "@type": "AboutPage",
      url: buildCanonicalUrl(publisherProfilePath),
      name: "About Whether",
      isPartOf: { "@id": websiteId },
      // The site entity by its id, not a lookalike with a name and a URL: an
      // unlinked Organization node reads to a parser as a second publisher.
      publisher: buildPublisherSchema(organizationName),
    },
    {
      ...buildAuthorSchema(),
      description: publisherAuthor.bio,
      worksFor: { "@id": organizationId },
    },
    buildBreadcrumbList(createBreadcrumbTrail([{ path: "/" }, { path: publisherProfilePath, label: "About" }])),
  ]);

  return (
    <ContentPageShell measure="prose">
      <JsonLdScript data={structuredData} />

      <section className="weather-panel space-y-4 px-5 max-sm:px-0 py-5 sm:px-6 sm:py-6">
        <h1 className="text-fluid-2xl font-semibold leading-tight text-slate-100">How Whether works</h1>
        <p className="text-sm text-slate-300">
          Whether publishes free weekly operating guidance for startup leaders, based on interest rates and credit conditions.
        </p>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-[1.375rem] leading-tight font-semibold text-slate-100 sm:text-2xl">How it works</h2>
        <p className="text-sm text-slate-300">
          Hiring, Roadmap, Fundraising, Spending and New bets each get an action, a pause line and a restart line.
          Set the lines when you make a plan. Because the pause and restart lines are apart, a small move back
          across the pause line doesn&rsquo;t restart anything.
        </p>
        <p className="text-sm text-slate-300">
          Each published brief stays on record. The{" "}
          <Link href="/history#track-record" className={inlineLinkClass}>
            track record
          </Link>{" "}
          compares past guidance with what happened next, including where it fell short. Some changes in
          conditions came with no warning, and the{" "}
          <Link href="/calibration" className={inlineLinkClass}>
            calibration study
          </Link>{" "}
          shows the margin measures distance from a line, not probability.
        </p>
      </section>

      <MethodSection />

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-[1.375rem] leading-tight font-semibold text-slate-100 sm:text-2xl">Where it fits and where it does not</h2>
        <p className="text-sm text-slate-300">
          {record ? <>{describeRecordCadence(record)} </> : null}
          Use the brief to set your plan&apos;s lines and get an email when one is crossed.
        </p>
        {/* Two blocks, one per list: together they ran 862px, taller than a phone
            screen, so no screenshot held the answer to "does this fit us" whole. */}
        <div data-frame-block="" className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-100">It fits</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            <li>
              Commitments that run for quarters and cost money to unwind: a hiring plan, a lease or multi-year
              contract, the runway to hold before the next raise.
            </li>
            <li>
              Plans a group approves once and should not re-argue each month: a budget whose second half is released
              when a line is crossed, or an agreed floor on runway.
            </li>
            <li>
              Venture-backed companies with one to two years of runway and a next raise that depends on what capital
              costs. The test is the currency of the raise, not the address: a company in Toronto, London or Berlin
              raising from U.S. funds prices its round off the same rates this brief reads.
            </li>
            <li>
              Investors and accelerators sending one reading to every company they back: the{" "}
              <Link href="/share" className={inlineLinkClass}>
                portfolio note
              </Link>{" "}
              says what the week means at each runway.
            </li>
          </ul>
        </div>
        <div data-frame-block="" className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-100">It does not fit</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            <li>
              A single hire or purchase. The lines are a policy for a kind of decision, not a verdict on one.
            </li>
            <li>
              Under six months of runway. At that point cash matters more than the market, so the guidance starts with cash.
            </li>
            <li>
              A company whose funding does not follow U.S. rates: one raising locally in a currency whose central bank
              sets its own price of money, or one in a sector raising on a boom of its own. Where you are registered is
              not the test; a company outside the U.S. that raises from U.S. funds borrows at U.S. rates, and the scores
              are its cost of capital.
            </li>
            <li>
              Which product work matters most. Rates affect how much slow-payback work a team can afford, not what it
              should build.
            </li>
          </ul>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-[1.375rem] leading-tight font-semibold text-slate-100 sm:text-2xl">Who writes it</h2>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">{publisherAuthor.name}</span> — {publisherAuthor.role}
        </p>
        <p className="text-sm text-slate-300">{publisherAuthor.bio}</p>
        <p className="text-sm text-slate-300">
          The pause-and-resume structure comes from {publisherAuthor.name}&apos;s earlier work on healthcare products.
          That work is listed at{" "}
          <a href={publisherAuthor.sameAs[0]} className={inlineLinkClass}>
            kanav.net
          </a>
          .
        </p>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-[1.375rem] leading-tight font-semibold text-slate-100 sm:text-2xl">What it is built from</h2>
        <p className="text-sm text-slate-300">
          Both scores the brief leads with start from U.S. Treasury rates, read from the St. Louis Fed (FRED). Funding
          pressure comes from the one-month bill rate, the speed of its rise, and long rates falling below short ones.
          Risk appetite comes from the gap between the ten-year and two-year rates. Market-stress readings then adjust
          them: the extra interest riskier companies pay to borrow, the Chicago Fed&apos;s summary of borrowing
          conditions, and the VIX index of expected stock-market turbulence. Where the pair lands sets the conditions:
          Sunny, Cloudy, Stormy or Freezing.
        </p>
        <p className="text-sm text-slate-300">
          Two startup-market inputs lower risk appetite when they weaken: the pace of venture funding and tech layoffs.
          They come from a curated snapshot rather than a live feed, and every surface that uses them says so.
        </p>
        <p className="text-sm text-slate-300">
          Inflation and unemployment appear on the signals page but enter neither score. Everything that does is
          published with its formula, source and refresh schedule.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href="/trust" variant="pill">
            Sources and formulas
          </ActionLink>
          <ActionLink href="/history" variant="pill">
            All past guidance
          </ActionLink>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-[1.375rem] leading-tight font-semibold text-slate-100 sm:text-2xl">Corrections and questions</h2>
        <p className="text-sm text-slate-300">
          Whether publishes dated records that do not change after the fact. If a published brief is wrong, say so
          and it gets a correction note rather than a silent edit.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href={publisherContactPath} variant="primary">
            Contact
          </ActionLink>
          <ActionLink href="/" variant="pill">
            This week&apos;s brief
          </ActionLink>
        </div>
      </section>
    </ContentPageShell>
  );
}
