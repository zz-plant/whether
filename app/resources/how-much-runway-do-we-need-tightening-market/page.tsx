import { notFound } from "next/navigation";
import { findPainArticleBySlug } from "../../../lib/painArticles";
import { buildPainArticleMetadata, PainArticlePage } from "../components/painArticlePage";

const article = findPainArticleBySlug("how-much-runway-do-we-need-tightening-market");

export const metadata = article ? buildPainArticleMetadata(article) : {};

export default function Page() {
  if (!article) notFound();
  return <PainArticlePage article={article} />;
}
