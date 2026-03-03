import { notFound } from "next/navigation";
import { findPainArticleBySlug } from "../../../lib/painArticles";
import { buildPainArticleMetadata, PainArticlePage } from "../components/painArticlePage";

const article = findPainArticleBySlug("platform-rewrites-during-capital-tightening-risk-analysis");

export const metadata = article ? buildPainArticleMetadata(article) : {};

export default function Page() {
  if (!article) notFound();
  return <PainArticlePage article={article} />;
}
