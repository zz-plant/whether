import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service — Whether",
  description:
    "Terms of Service governing access to Whether software, APIs, data outputs, and related services.",
  path: "/terms-of-service",
  imageAlt: "Whether terms of service",
});

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3 border-b border-slate-800/80 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
            Whether Legal
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-300">Effective Date: 2/23/2026</p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-slate-200 sm:text-base">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Whether software
            platform, APIs, data outputs, and related services (collectively, the &quot;Service&quot;). By
            accessing or using the Service, you agree to these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">1. Eligibility and Account Responsibility</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            You represent that you have authority to bind yourself and, where applicable, your
            organization to these Terms. You are responsible for all activities occurring through your
            account credentials and for maintaining account security.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">2. License and Permitted Use</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Subject to these Terms and any applicable order form or agreement with Whether, Whether
            grants you a limited, non-exclusive, non-transferable, revocable right to access and use the
            Service for lawful internal business operations.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">3. Acceptable Use and Restrictions</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            You must comply with the Whether Acceptable Use Policy. You may not misuse the Service,
            circumvent controls, reverse engineer proprietary systems beyond documented interfaces,
            provide unauthorized resale/white-label access, or use the Service in unlawful, fraudulent,
            or discriminatory ways.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">4. Informational Nature of the Service</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            The Service provides analytical summaries and interpretive outputs based on publicly
            available macroeconomic and market data. The Service does not provide investment, legal,
            tax, accounting, employment, or other professional advice, and does not guarantee any
            outcomes. You are solely responsible for independent evaluation before taking action.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">5. Third-Party Data and Dependencies</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            The Service relies on third-party data providers and public datasets outside Whether&apos;s
            control. Whether does not warrant that third-party data will remain available, accurate,
            continuous, timely, or complete.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">6. Intellectual Property</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Whether and its licensors retain all rights, title, and interest in and to the Service,
            including underlying software, methodologies, models, and content, except for rights
            expressly granted in these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">7. Fees and Payment</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            If your use is subject to paid plans or a commercial agreement, you agree to pay applicable
            fees according to the governing order form, invoice terms, or master agreement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">8. Termination and Suspension</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Whether may suspend or terminate access to the Service for breach of these Terms, violation
            of the Acceptable Use Policy, non-payment (if applicable), or activity that creates material
            legal, security, or reputational risk.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">9. Disclaimer of Warranties</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by law,
            Whether disclaims all warranties, express or implied, including merchantability, fitness for
            a particular purpose, non-infringement, and uninterrupted availability.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">10. Limitation of Liability</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            To the maximum extent permitted by law, Whether is not liable for indirect, incidental,
            consequential, special, punitive, or exemplary damages, or for lost profits, revenues, or
            data arising from or related to use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">11. Modifications</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            Whether may update these Terms upon reasonable notice. Continued use of the Service after an
            effective update date constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-50">12. Governing Agreement and Order of Precedence</h2>
          <p className="text-sm leading-7 text-slate-200 sm:text-base">
            These Terms supplement any signed master agreement, order form, or equivalent governing
            contract between the parties. In the event of conflict, the negotiated governing agreement
            controls to the extent of the conflict.
          </p>
        </section>
      </div>
    </main>
  );
}
