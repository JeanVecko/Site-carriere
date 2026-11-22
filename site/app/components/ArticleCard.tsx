import Link from "next/link";
import { BookOpenText, Clock } from "lucide-react";
import { ArticleSummary, articleCoverUrl, articleDate, articleHref } from "../lib/articles";

// Carte d'un article (liste des conseils, accueil, « À lire aussi »).
export default function ArticleCard({ article, headingLevel = 3 }: { article: ArticleSummary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="pub-article-card">
      <Link href={articleHref(article.slug)} className="pub-article-card-link">
        <span className="pub-article-card-cover">
          {article.has_cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- image relayée et mise en cache par /couvertures
            <img src={articleCoverUrl(article)} alt="" loading="lazy" />
          ) : (
            <span className="pub-article-card-placeholder" aria-hidden="true">
              <BookOpenText size={34} />
            </span>
          )}
          <em>{article.category}</em>
        </span>
        <span className="pub-article-card-text">
          <Heading>{article.title}</Heading>
          <span className="pub-article-card-excerpt">{article.excerpt}</span>
          <span className="pub-article-card-meta">
            <span>{articleDate(article.published_at)}</span>
            <span>
              <Clock size={13} aria-hidden="true" /> {article.reading_minutes} min de lecture
            </span>
          </span>
        </span>
      </Link>
    </article>
  );
}
