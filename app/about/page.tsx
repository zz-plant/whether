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
} from "../../lib/seo";
import {
  buildAuthorSchema,
  buildPublisherSchema,
  publisherAuthor,
  publisherContactPath,
  publisherProfilePath,
} from "../../lib/publisher";

import { OperatingLoopGlyph } from "../components/illustrations/OperatingLoopGlyph";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { buildTrackRecord } from "../../lib/report/trackRecord";
import { describeRecordCadence } from "../../lib/report/trackRecordCopy";
import { ContentPageShell } from "../components/ui/contentPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "About Whether",
  description:
    "What is new in the Whether Weekly Brief, who writes it, and what it is built from.",
  path: publisherProfilePath,
  imageAlt: "About Whether",
});

const inlineLinkClass =
  "py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100";

export default function AboutPage() {
  const record = buildTrackRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        url: buildCanonicalUrl(publisherProfilePath),
        name: "About Whether",
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
    ],
  };

  return (
    <ContentPageShell measure="prose">
      <JsonLdScript data={structuredData} />

      <section className="weather-panel space-y-4 px-5 max-sm:px-0 py-5 sm:px-6 sm:py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">About Whether</h1>
        <p className="text-sm text-slate-300">
          Each Monday, Whether says what interest rates and credit mean for a startup&apos;s hiring, spend and raise. Each
          week it answers three things: what should change right now, how sure we are, and what would change the guidance.
        </p>
        <div className="pt-2">
          <OperatingLoopGlyph variant="detailed" />
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What is new here</h2>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">Lines decided before they are needed.</span> Hiring, spending,
          fundraising, the roadmap and new bets each get an action, a pause line and a resume line, written down before
          either is reached. The pause and resume lines sit apart, so one noisy week does not stop a decision and
          restart it, and nobody re-argues the reasoning on Monday.
        </p>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">A record that grades itself.</span> Every week&apos;s guidance
          stays published unedited, and the{" "}
          <Link href="/history#track-record" className={inlineLinkClass}>
            track record
          </Link>{" "}
          scores the archive against what happened next, including where it falls short: changes in conditions that
          came with no warning, and a confidence figure that the{" "}
          <Link href="/calibration" className={inlineLinkClass}>
            calibration study
          </Link>{" "}
          shows measures distance from a line, not probability.
        </p>
        <p className="text-sm text-slate-300">
          The inputs are not new. Both scores start from public Treasury rates, by arithmetic short enough to check by
          hand. It is not a macro blog, and not a forecast.
        </p>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Where it fits, and where it does not</h2>
        <p className="text-sm text-slate-300">
          {record ? <>{describeRecordCadence(record)} </> : null}
          So the use is to set the lines when a plan is made, and to hear the day one is crossed.
        </p>
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
            Venture-backed U.S. companies with one to two years of runway, whose next raise depends on what capital
            costs.
          </li>
          <li>
            Investors and accelerators sending one reading to every company they back: the{" "}
            <Link href="/share" className={inlineLinkClass}>
              portfolio note
            </Link>{" "}
            says what the week means at each runway.
          </li>
        </ul>
        <p className="text-sm font-semibold text-slate-100">It does not fit</p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li>
            A single hire or purchase. The lines are a policy for a kind of decision, not a verdict on one.
          </li>
          <li>
            Under six months of runway. Cash decides before markets do, which is why the guidance leads with cash
            there.
          </li>
          <li>
            A company whose funding does not follow U.S. rates: one outside the U.S., or in a sector raising on a boom
            of its own. The scores read U.S. rates only.
          </li>
          <li>
            Which product work matters most. Rates bear on how much long-payback work a team can carry, not on what
            to build.
          </li>
        </ul>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Who writes it</h2>
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">{publisherAuthor.name}</span> — {publisherAuthor.role}
        </p>
        <p className="text-sm text-slate-300">{publisherAuthor.bio}</p>
        <p className="text-sm text-slate-300">
          The pause-and-resume structure comes from {publisherAuthor.name}&apos;s earlier work on healthcare products:
          clinical workflows, physician financial guidance and contested medical claims, where a decision with no
          stopping condition can harm a patient. That work is listed at{" "}
          <a href={publisherAuthor.sameAs[0]} className={inlineLinkClass}>
            kanav.net
          </a>
          .
        </p>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What it is built from</h2>
        <p className="text-sm text-slate-300">
          Both scores the brief leads with start from U.S. Treasury rates, read from the St. Louis Fed (FRED). Funding
          pressure comes from the one-month bill rate, how fast it has risen, and whether long rates have fallen below
          short ones; risk appetite comes from the gap between the ten-year and two-year rates. Market-stress readings
          then adjust them: the extra interest riskier companies pay to borrow, the Chicago Fed&apos;s summary of
          borrowing conditions, and the VIX, the stock market&apos;s forecast of turbulence. Where the pair lands sets
          the conditions: Sunny, Cloudy, Stormy or Freezing.
        </p>
        <p className="text-sm text-slate-300">
          Two startup-market inputs, the pace of venture funding and tech layoffs, lower risk appetite when they
          weaken. They come from a curated snapshot rather than a live feed, and every surface that uses them says so.
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
        <h2 className="text-lg font-semibold text-slate-100">Corrections and questions</h2>
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
