import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";

type DownloadableResourceMetadataConfig = {
  title: string;
  description: string;
  path: string;
  imageAlt: string;
  imageParams: {
    template: string;
    title: string;
  };
};

type ResourceLink = {
  href: string;
  label: string;
};

type CtaConfig = {
  href: string;
  label: string;
  conversionEvent: string;
};

export type DownloadableResourcePageConfig = {
  metadata: DownloadableResourceMetadataConfig;
  heroDescription: string;
  heroItems: string[];
  heroItemsOrdered?: boolean;
  downloadCta: CtaConfig;
  secondaryCta: CtaConfig;
  internalLinks: ResourceLink[];
  printModeClassNames?: {
    heroPanel?: string;
    title?: string;
    description?: string;
    list?: string;
    ctaRow?: string;
  };
};

const defaultPrintModeClassNames: NonNullable<
  DownloadableResourcePageConfig["printModeClassNames"]
> = {
  heroPanel: "",
  title: "",
  description: "",
  list: "",
  ctaRow: "",
};

export const buildDownloadableResourceMetadata = (
  config: DownloadableResourceMetadataConfig,
): Metadata => ({
  ...buildPageMetadata(config),
  robots: noindexRobots,
});

function InternalLinksPanel({ links }: { links: ResourceLink[] }) {
  return (
    <section className="weather-panel space-y-2 px-6 max-sm:px-0 py-6">
      <h2 className="text-lg font-semibold text-slate-100">Related pages</h2>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="block text-sm text-sky-200 underline underline-offset-4">
          {link.label}
        </Link>
      ))}
    </section>
  );
}

export function DownloadableResourcePage({ config }: { config: DownloadableResourcePageConfig }) {
  const printModeClassNames = {
    ...defaultPrintModeClassNames,
    ...config.printModeClassNames,
  };

  const ListTag = config.heroItemsOrdered ? "ol" : "ul";

  return (
    <ContentPageShell
      data-resource-path={config.metadata.path}
    >
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Guides", href: "/resources" },
          { label: config.metadata.title },
        ]}
      />
      <section
        className={`weather-panel space-y-3 px-6 py-6 ${printModeClassNames.heroPanel}`.trim()}
      >
        <h1 className={`text-2xl font-semibold text-slate-100 sm:text-3xl ${printModeClassNames.title}`.trim()}>
          {config.metadata.title}
        </h1>
        <p className={`text-sm text-slate-200 ${printModeClassNames.description}`.trim()}>
          {config.heroDescription}
        </p>
        <ListTag className={`space-y-1 text-sm text-slate-200 ${printModeClassNames.list}`.trim()}>
          {config.heroItems.map((item, index) => (
            <li key={item}>{config.heroItemsOrdered ? `${index + 1}. ${item}` : `• ${item}`}</li>
          ))}
        </ListTag>
        <div className={`flex flex-wrap gap-3 ${printModeClassNames.ctaRow}`.trim()}>
          <a
            href={config.downloadCta.href}
            className="weather-button inline-flex items-center justify-center"
            download
            data-conversion-event={config.downloadCta.conversionEvent}
          >
            {config.downloadCta.label}
          </a>
          <Link
            href={config.secondaryCta.href}
            className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100"
            data-conversion-event={config.secondaryCta.conversionEvent}
          >
            {config.secondaryCta.label}
          </Link>
        </div>
      </section>

      <InternalLinksPanel links={config.internalLinks} />
    </ContentPageShell>
  );
}
