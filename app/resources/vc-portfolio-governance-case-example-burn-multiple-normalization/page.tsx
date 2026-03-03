import { notFound } from "next/navigation";
import { findResourceArticleBySlug } from "../../../lib/resourceArticles";
import { buildResourceArticleMetadata, ResourceArticlePage } from "../components/resourceArticlePage";

const article = findResourceArticleBySlug("vc-portfolio-governance-case-example-burn-multiple-normalization");

export const metadata = article ? buildResourceArticleMetadata(article) : {};

export default function Page() {
  if (!article) notFound();
  return <ResourceArticlePage article={article} />;
}
