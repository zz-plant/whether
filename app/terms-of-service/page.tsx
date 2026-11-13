import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { publishedDataLicenseUrl } from "../../lib/publisher";
import { LegalPageShell } from "../components/legalPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service governing access to Whether software, APIs, data outputs, and related services.",
  path: "/terms-of-service",
  imageAlt: "Whether terms of service",
});

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" effectiveDate="11/12/2026">

        <section className="space-y-4 text-base leading-7 text-slate-200">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Whether software
            platform, APIs, data outputs, and related services (collectively, the &quot;Service&quot;). By
            accessing or using the Service, you agree to these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">1. Eligibility and Account Responsibility</h2>
          <p className="text-base leading-7 text-slate-200">
            You represent that you have authority to bind yourself and, where applicable, your
            organization to these Terms. You are responsible for all activities occurring through your
            account credentials and for maintaining account security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">2. License and Permitted Use</h2>
          <p className="text-base leading-7 text-slate-200">
            Subject to these Terms and any applicable order form or agreement with Whether, Whether
            grants you a limited, non-exclusive, non-transferable, revocable right to access and use the
            Service for lawful internal business operations.
          </p>
          <p className="text-base leading-7 text-slate-200">
            Whether&apos;s own published readings, scores, market conditions, weekly guidance and frozen
            weekly briefs are also licensed under the{" "}
            <a className="underline underline-offset-4" href={publishedDataLicenseUrl} rel="license">
              Creative Commons Attribution 4.0 International license (CC BY 4.0)
            </a>
            . You may copy, share and adapt them for any purpose, including commercially, if you credit
            Whether and link to whether.work. That license does not cover values Whether reproduces from
            its sources (Treasury and credit series from FRED, company figures from SEC filings, and
            market prices), which remain under their providers&apos; terms, nor the software, the Whether
            name or its logo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">3. Acceptable Use and Restrictions</h2>
          <p className="text-base leading-7 text-slate-200">
            You must comply with the Whether Acceptable Use Policy. You may not misuse the Service,
            circumvent controls, reverse engineer proprietary systems beyond documented interfaces,
            provide unauthorized resale/white-label access, or use the Service in unlawful, fraudulent,
            or discriminatory ways.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">4. Informational Nature of the Service</h2>
          <p className="text-base leading-7 text-slate-200">
            The Service provides analytical summaries and interpretive outputs based on publicly
            available macroeconomic and market data. The Service does not provide investment, legal,
            tax, accounting, employment, or other professional advice, and does not guarantee any
            outcomes. You are solely responsible for independent evaluation before taking action.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">5. Third-Party Data and Dependencies</h2>
          <p className="text-base leading-7 text-slate-200">
            The Service relies on third-party data providers and public datasets outside Whether&apos;s
            control. Whether does not warrant that third-party data will remain available, accurate,
            continuous, timely, or complete.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">6. Intellectual Property</h2>
          <p className="text-base leading-7 text-slate-200">
            Whether and its licensors retain all rights, title, and interest in and to the Service,
            including underlying software, methodologies, models, and content, except for rights
            expressly granted in these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">7. Fees and Payment</h2>
          <p className="text-base leading-7 text-slate-200">
            Whether is free. If your use is subject to a separate commercial agreement, you agree to pay
            applicable fees according to the governing order form, invoice terms, or master agreement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">8. Termination and Suspension</h2>
          <p className="text-base leading-7 text-slate-200">
            Whether may suspend or terminate access to the Service for breach of these Terms, violation
            of the Acceptable Use Policy, non-payment (if applicable), or activity that creates material
            legal, security, or reputational risk.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">9. Disclaimer of Warranties</h2>
          <p className="text-base leading-7 text-slate-200">
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by law,
            Whether disclaims all warranties, express or implied, including merchantability, fitness for
            a particular purpose, non-infringement, and uninterrupted availability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">10. Limitation of Liability</h2>
          <p className="text-base leading-7 text-slate-200">
            To the maximum extent permitted by law, Whether is not liable for indirect, incidental,
            consequential, special, punitive, or exemplary damages, or for lost profits, revenues, or
            data arising from or related to use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">11. Modifications</h2>
          <p className="text-base leading-7 text-slate-200">
            Whether may update these Terms upon reasonable notice. Continued use of the Service after an
            effective update date constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">12. Governing Agreement and Order of Precedence</h2>
          <p className="text-base leading-7 text-slate-200">
            These Terms supplement any signed master agreement, order form, or equivalent governing
            contract between the parties. In the event of conflict, the negotiated governing agreement
            controls to the extent of the conflict.
          </p>
        </section>
    </LegalPageShell>
  );
}
