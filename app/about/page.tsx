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
        <h1 className="text-fluid-2xl font-semibold text-slate-100">How Whether works</h1>
        <p className="text-base text-slate-300">
          Whether publishes free weekly operating guidance for startup leaders, built from interest rates and credit conditions.
        </p>
        {/* One section under the h1 (2026-11-11): "How it works" was an h2 directly
            under "How Whether works", the same heading twice in a row. */}
        <p className="text-base text-slate-300">
          Hiring, Roadmap, Fundraising, Spending and New bets each get an action, a score at which to pause and a score at which to restart. The two are set apart, so a small move back does not undo a pause or a restart.
        </p>
        <p className="text-base text-slate-300">
          Every published brief stays on record: see the{" "}
          <Link href="/history#track-record" className={inlineLinkClass}>
            track record
          </Link>
          , the{" "}
          <Link href="/calibration" className={inlineLinkClass}>
            calibration study
          </Link>{" "}
          (distance, not probability), and{" "}
          <Link href="/concepts" className={inlineLinkClass}>
            advice vs. market
          </Link>
          .
        </p>
      </section>

      <MethodSection />

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="type-section">Where it fits and where it does not</h2>
        <p className="text-base text-slate-300">
          {record ? <>{describeRecordCadence(record)} </> : null}
          Set your own pause and restart lines and get an email the day one crosses.
        </p>
        {/* Two blocks, one per list: together they ran 862px, taller than a phone
            screen, so no screenshot held the answer to "does this fit us" whole. */}
        <div data-frame-block="" className="space-y-1.5">
          <p className="text-base font-semibold text-slate-100">It fits</p>
          <ul className="list-disc space-y-1.5 pl-5 text-base text-slate-300">
            <li>
              Multi-quarter, hard-to-unwind commitments: hiring plans, leases, multi-year contracts, and runway buffers.
            </li>
            <li>
              Pre-agreed budgets and runway floors you do not want to re-argue every month.
            </li>
            <li>
              Companies with 1–2 years of runway whose next raise prices off U.S. rates (by raise currency, not headquarters).
            </li>
            <li>
              Investors and accelerators sending one reading across a portfolio via the{" "}
              <Link href="/share" className={inlineLinkClass}>
                portfolio note
              </Link>
              .
            </li>
          </ul>
        </div>
        <div data-frame-block="" className="space-y-1.5">
          <p className="text-base font-semibold text-slate-100">It does not fit</p>
          <ul className="list-disc space-y-1.5 pl-5 text-base text-slate-300">
            <li>
              A single hire or purchase: the rules set a policy for a kind of decision, not an answer for one.
            </li>
            <li>
              Under six months of runway, where cash overrides market conditions.
            </li>
            <li>
              Funding outside U.S. rates (local-currency rounds or isolated sector booms).
            </li>
            <li>
              Product prioritization: rates limit how much slow-payback work to take on, not which product to build.
            </li>
          </ul>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="type-section">Who writes it</h2>
        <p className="text-base text-slate-300">
          <span className="font-semibold text-slate-100">{publisherAuthor.name}</span> — {publisherAuthor.role}
        </p>
        <p className="text-base text-slate-300">{publisherAuthor.bio}</p>
        <p className="text-base text-slate-300">
          The pause-and-restart structure comes from {publisherAuthor.name}&apos;s earlier work on healthcare products.
          That work is listed at{" "}
          <a href={publisherAuthor.sameAs[0]} className={inlineLinkClass}>
            kanav.net
          </a>
          .
        </p>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="type-section">What it is built from</h2>
        <p className="text-base text-slate-300">
          Two scores set the conditions: Sunny, Cloudy, Stormy or Freezing. Both start from U.S. Treasury rates, read from the St. Louis Fed (FRED), and are adjusted for market stress.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-base text-slate-300">
          <li>
            <span className="font-semibold text-slate-100">Funding pressure:</span> the 1-month Treasury rate, how fast it has risen and whether the yield curve is inverted, adjusted for the Chicago Fed&rsquo;s financial conditions index.
          </li>
          <li>
            <span className="font-semibold text-slate-100">Risk appetite:</span> the gap between 10-year and 2-year Treasury rates, adjusted for stock-market volatility (the VIX).
          </li>
          <li>
            <span className="font-semibold text-slate-100">Context only:</span> Inflation and unemployment appear on Signals but enter neither score. The high-yield credit spread, the venture funding pace and tech layoffs print beside the scores and are not counted.
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href="/trust" variant="pill">
            Sources and formulas
          </ActionLink>
        </div>
      </section>

      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="type-section">Corrections and questions</h2>
        <p className="text-base text-slate-300">
          Whether publishes dated records that will not change after the fact. If a published brief is wrong, say so
          and it gets a correction note rather than a silent edit.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <ActionLink href={publisherContactPath} variant="primary">
            Contact
          </ActionLink>
        </div>
      </section>
    </ContentPageShell>
  );
}
