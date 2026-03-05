import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { DecidePresetManager } from "./components/decidePresetManager";

export const metadata: Metadata = buildPageMetadata({
  title: "Role Lenses — reference library",
  description: "Role lens library for product, engineering, finance, and leadership decision references.",
  path: "/decide",
  imageAlt: "Whether role lens library",
});

const roleOptions = [
  { key: "all", label: "All roles" },
  { key: "founder", label: "Founder" },
  { key: "product", label: "Product" },
  { key: "engineering", label: "Engineering" },
  { key: "finance", label: "Finance" },
] as const;

const layerOptions = [
  { key: "all", label: "All layers" },
  { key: "routing", label: "Routing" },
  { key: "validation", label: "Validation" },
  { key: "decision", label: "Decision" },
  { key: "calibration", label: "Calibration" },
] as const;

type RoleFilterKey = (typeof roleOptions)[number]["key"];
type LayerFilterKey = (typeof layerOptions)[number]["key"];
type RoleCardRole = Exclude<RoleFilterKey, "all">;
type RoleCardLayer = Exclude<LayerFilterKey, "all">;

export default async function DecidePage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; layer?: string; [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedRole = resolvedSearchParams?.role;
  const requestedLayer = resolvedSearchParams?.layer;
  const activeRole: RoleFilterKey = roleOptions.some((option) => option.key === requestedRole)
    ? (requestedRole as RoleFilterKey)
    : "all";
  const activeLayer: LayerFilterKey = layerOptions.some((option) => option.key === requestedLayer)
    ? (requestedLayer as LayerFilterKey)
    : "all";
  const buildDecideHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });
    }
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });
    const query = params.toString();
    return query ? `/decide?${query}` : "/decide";
  };

  const roleLensCards: Array<{
    href: string;
    title: string;
    description: string;
    eyebrow: string;
    accentClass: string;
    roles: RoleCardRole[];
    layer: RoleCardLayer;
  }> = [
    {
      href: "/decide/use-cases",
      title: "Role and situation paths",
      description: "Choose by role or scenario to reach the right guidance quickly.",
      eyebrow: "Routing",
      accentClass: "weather-card-accent-sky",
      roles: ["founder", "product", "engineering", "finance"],
      layer: "routing",
    },
    {
      href: "/signals",
      title: "Signals evidence",
      description: "Check live evidence before committing to irreversible moves.",
      eyebrow: "Validation",
      accentClass: "weather-card-accent-teal",
      roles: ["founder", "product", "engineering", "finance"],
      layer: "validation",
    },
    {
      href: "/decide/ship-checklist",
      title: "Whether to ship checklist",
      description: "Get a go/wait/kill recommendation tied to the current regime.",
      eyebrow: "Decision",
      accentClass: "weather-card-accent-amber",
      roles: ["product", "engineering"],
      layer: "decision",
    },
    {
      href: "/decide/team-context",
      title: "Team context profile",
      description: "Personalize the mandate by stage, sector, and team size.",
      eyebrow: "Calibration",
      accentClass: "weather-card-accent-violet",
      roles: ["founder", "finance", "product"],
      layer: "calibration",
    },
  ];
  const filteredCards = roleLensCards.filter((card) => {
    const matchesRole = activeRole === "all" || card.roles.includes(activeRole);
    const matchesLayer = activeLayer === "all" || card.layer === activeLayer;
    return matchesRole && matchesLayer;
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel-hero space-y-3 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Role translation layer</p>
        <h1 className="type-section text-slate-100">Role lens library</h1>
        <p className="text-[15px] text-slate-300 sm:text-base">Command Center is the primary start page. Use this library when you need deeper role-specific references after selecting posture and situation.</p>
        <div>
          <Link href="/start" className="weather-button-primary inline-flex items-center justify-center">Back to Command Center</Link>
        </div>
      </section>
      <section className="weather-panel space-y-4 px-5 py-4">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Lens filters</p>
          <h2 className="text-lg font-semibold text-slate-100">Filter by role and layer</h2>
        </header>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Role</p>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((option) => {
              const isActive = option.key === activeRole;
              return (
                <a
                  key={option.key}
                  href={buildDecideHref({
                    role: option.key === "all" ? null : option.key,
                  })}
                  aria-current={isActive ? "page" : undefined}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] ${
                    isActive
                      ? "border-sky-300/80 text-slate-100"
                      : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                  }`}
                >
                  {option.label}
                </a>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Layer</p>
          <div className="flex flex-wrap gap-2">
            {layerOptions.map((option) => {
              const isActive = option.key === activeLayer;
              return (
                <a
                  key={option.key}
                  href={buildDecideHref({
                    layer: option.key === "all" ? null : option.key,
                  })}
                  aria-current={isActive ? "page" : undefined}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] ${
                    isActive
                      ? "border-sky-300/80 text-slate-100"
                      : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                  }`}
                >
                  {option.label}
                </a>
              );
            })}
          </div>
        </div>
        <DecidePresetManager
          currentRole={activeRole}
          currentLayer={activeLayer}
        />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filteredCards.map((card) => (
          <a key={card.href} href={card.href} className={`weather-panel weather-card-accent ${card.accentClass} space-y-2 px-4 py-3`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{card.eyebrow}</p>
            <h2 className="text-lg font-semibold text-slate-100">{card.title}</h2>
            <p className="text-[15px] text-slate-300 sm:text-base">{card.description}</p>
          </a>
        ))}
      </section>
      {filteredCards.length === 0 ? (
        <section className="weather-panel px-5 py-4 text-sm text-slate-300">
          No cards match the current filter. Reset role or layer to reopen all decision paths.
        </section>
      ) : null}
    </main>
  );
}
