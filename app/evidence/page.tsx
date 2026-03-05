import { permanentRedirect } from "next/navigation";

export const runtime = "edge";
export const revalidate = 900;

export default function EvidencePage() {
  permanentRedirect("/signals");
}
