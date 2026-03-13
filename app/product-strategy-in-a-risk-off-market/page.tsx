import { redirectLegacyAnswer } from "../../lib/navigation/legacyRedirects";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirectLegacyAnswer("product-strategy-in-a-risk-off-market");
}
