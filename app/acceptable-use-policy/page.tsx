import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { LegalPageShell } from "../components/legalPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "Acceptable Use Policy — Whether",
  description:
    "Acceptable use requirements for Whether platform access, outputs, APIs, and data services.",
  path: "/acceptable-use-policy",
  imageAlt: "Whether acceptable use policy",
});

export default function AcceptableUsePolicyPage() {
  return (
    <LegalPageShell title="Acceptable Use Policy">

        <section className="space-y-4 text-sm leading-7 text-slate-200 sm:text-base">
          <p>
            This Acceptable Use Policy (&quot;Policy&quot;) governs use of the Whether software platform, APIs,
            data outputs, and related services (collectively, the &quot;Service&quot;). By accessing or using
            the Service, you agree to comply with this Policy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">1. Nature of the Service</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Whether provides analytical summaries and interpretive outputs derived from publicly
            available macroeconomic and market data. The Service is informational in nature, does not
            provide investment, legal, tax, accounting, or employment advice, does not predict future
            market conditions, and does not guarantee business outcomes. Users remain solely responsible
            for independent evaluation and decision-making.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">2. Permitted Use</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            You may use the Service for lawful internal business purposes, including strategic planning,
            capital allocation discussions, hiring and budgeting analysis, fundraising preparation, and
            board and investor communications. Subject to your agreement with Whether, outputs may be
            reproduced in internal materials.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">3. Prohibited Use</h2>
          <div className="space-y-6 text-sm leading-7 text-slate-200 sm:text-base">
            <div>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                3.1 As Regulated Professional Advice
              </h3>
              <p>
                You may not provide or represent the Service as investment advice, securities
                recommendations, legal advice, tax advice, accounting advice, or employment law
                guidance. The Service is not a registered investment adviser, broker-dealer, or
                fiduciary.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                3.2 As an Automated Decision System Affecting Individuals
              </h3>
              <p>
                The Service may not be used as the sole or determinative basis for automated decisions
                that produce legal or similarly significant effects on individuals, including hiring or
                termination decisions, layoffs, compensation determinations, promotion eligibility, and
                employment classification. Human review and independent judgment are required.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                3.3 For Unlawful, Fraudulent, or Discriminatory Activity
              </h3>
              <p>
                You may not use the Service to violate applicable laws or regulations, facilitate fraud
                or misrepresentation, engage in discriminatory or unlawful employment practices, or
                mislead investors or regulators regarding certainty of outcomes.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                3.4 To Misrepresent Certainty or Authority
              </h3>
              <p>
                You may not present Service outputs as official government guidance, deterministic or
                guaranteed forecasts, or authoritative statements binding on third parties. All outputs
                are probabilistic and interpretive in nature.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 sm:text-lg">
                3.5 To Reverse Engineer or Circumvent Controls
              </h3>
              <p>
                You may not reverse engineer underlying models or logic beyond documented APIs, attempt
                to extract proprietary scoring methodologies, scrape, copy, or replicate the Service
                outside permitted access, circumvent rate limits, access controls, or authentication
                mechanisms, or resell/white-label the Service without written authorization.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">4. Third-Party Data Sources</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            The Service relies on third-party data providers and publicly available datasets. Whether
            does not control third-party data sources and does not warrant availability, continuity,
            accuracy, timeliness, or completeness. Changes in third-party data may affect outputs
            without notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">5. No Warranty; Limitation of Reliance</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law,
            Whether disclaims all warranties, express or implied, and does not guarantee accuracy,
            fitness for a particular purpose, or uninterrupted availability. Users remain responsible
            for verifying outputs before acting on them.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">6. Regulatory and Fiduciary Disclaimer</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Nothing in the Service creates a fiduciary relationship, a duty of care beyond contractual
            obligations, an advisory or broker-dealer relationship, or a professional services
            relationship. The Service does not replace independent financial, legal, or accounting
            counsel.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">7. Suspension and Enforcement</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Whether may suspend or terminate access to the Service if this Policy is violated, the
            Service is used in a manner that creates material legal or reputational risk, or fraudulent
            or unlawful activity is detected. Remedies are cumulative and do not limit other rights
            under contract or law.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">8. Modifications</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Whether may modify this Policy upon reasonable notice. Continued use of the Service
            constitutes acceptance of any updates.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">9. Governing Agreement</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            This Policy supplements and does not replace any applicable Terms of Service, Master
            Services Agreement, or other binding contract between the parties. In the event of conflict,
            the governing agreement controls.
          </p>
        </section>
    </LegalPageShell>
  );
}
