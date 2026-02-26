import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import OperationsPage from "../operations/page";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Action playbook",
  description:
    "Playbook moves, finance posture, and operator requests tuned to the current regime.",
  path: "/plan",
  imageAlt: "Whether action playbook plan view",
});

export const runtime = "edge";

export default async function PlanPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  return <OperationsPage searchParams={searchParams} />;
}
