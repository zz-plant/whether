import { headers } from "next/headers";
import { GlobalHeaderRouteGate } from "./globalHeaderRouteGate";

export async function GlobalHeader() {
  const requestHeaders = await headers();
  const initialPathname = requestHeaders.get("x-whether-pathname") ?? "/";

  return <GlobalHeaderRouteGate initialPathname={initialPathname} />;
}
