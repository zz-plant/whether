export type SectorKey = "b2b-saas" | "consumer" | "infrastructure" | "fintech" | "healthcare" | "ai-platforms";

/* The label `/api/image/brief` prints for its `?sector=` context. The sensitivity
   multipliers that tilted a sector's posture went with the overlay on 2026-10-27:
   nothing had drawn it since 2026-08-06. */
export const SECTOR_TAXONOMY: Record<SectorKey, { label: string }> = {
  "b2b-saas": { label: "B2B SaaS" },
  consumer: { label: "Consumer" },
  infrastructure: { label: "Infrastructure" },
  fintech: { label: "Fintech" },
  healthcare: { label: "Healthcare" },
  "ai-platforms": { label: "AI Platforms" },
};
