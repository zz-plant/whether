import { notFound } from "next/navigation";
import { findResourceArticleBySlug } from "../../../lib/resourceArticles";
import { buildResourceArticleMetadata, ResourceArticlePage } from "../components/resourceArticlePage";

const article = findResourceArticleBySlug("how-much-runway-do-we-need-tightening-market");

export const metadata = article ? buildResourceArticleMetadata(article) : {};

export default function Page() {
  if (!article) notFound();
  return <ResourceArticlePage article={article} />;
}
