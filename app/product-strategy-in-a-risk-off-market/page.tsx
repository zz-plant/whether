import { redirect } from "next/navigation";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirect("/answers/product-strategy-in-a-risk-off-market");
}
