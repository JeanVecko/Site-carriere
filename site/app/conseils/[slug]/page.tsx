import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BellRing, CalendarDays, Clock, ListTree } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ArticleBody from "../../components/ArticleBody";
import ArticleCard from "../../components/ArticleCard";
import ShareButtons from "../../components/ShareButtons";
import { articleCallToAction, articleCoverUrl, articleDate, articleHref, articleOutline, plainText } from "../../lib/articles";
import { fetchArticle, fetchArticles, SITE_URL } from "../../lib/server";

export const revalidate = 43200;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await fetchArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await fetchArticle((await params).slug);
  if (!article) return { title: "Article introuvable — Carrières RDC" };
  const url = `${SITE_URL}${articleHref(article.slug)}`;
  const title = `${article.title} | Conseils carrière — Carrières RDC`;
  return {
    title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url,
      type: "article",
      publishedTime: article.published_at || undefined,
      modifiedTime: article.updated_at,
      images: article.has_cover ? [`${SITE_URL}${articleCoverUrl(article)}`] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const article = await fetchArticle((await params).slug);
  if (!article) notFound();
  const url = `${SITE_URL}${articleHref(article.slug)}`;
  const outline = articleOutline(article.body);
  const cta = articleCallToAction(article.category);
  const updated = article.published_at && new Date(article.updated_at).getTime() - new Date(article.published_at).getTime() > 86400000;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      articleSection: article.category,
      datePublished: article.published_at,
      dateModified: article.updated_at,
      mainEntityOfPage: url,
      inLanguage: "fr",
      wordCount: plainText(article.body).split(" ").length,
      ...(article.has_cover ? { image: [`${SITE_URL}${articleCoverUrl(article)}`] } : {}),
      author: { "@type": "Organization", name: "Carrières RDC", url: SITE_URL },
      publisher: { "@type": "Organization", name: "Carrières RDC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/og-logo.png` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Conseils carrière", item: `${SITE_URL}/conseils` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];

  return (
    <>
      <SiteHeader active="/conseils" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <main>
        <section className="pub-list-hero pub-article-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <Link href="/conseils">Conseils carrière</Link>{" "}
              <span aria-hidden="true">/</span> <span>{article.category}</span>
            </nav>
            <span className="pub-article-category">{article.category}</span>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
            <ul className="pub-article-facts">
              <li>
                <CalendarDays size={15} aria-hidden="true" /> {updated ? `Mis à jour le ${articleDate(article.updated_at)}` : `Publié le ${articleDate(article.published_at)}`}
              </li>
              <li>
                <Clock size={15} aria-hidden="true" /> {article.reading_minutes} min de lecture
              </li>
            </ul>
          </div>
        </section>

        <div className="pub-container pub-article-layout">
          <article className="pub-offer-card pub-article-main">
            {article.has_cover && (
              // eslint-disable-next-line @next/next/no-img-element -- image relayée et mise en cache par /couvertures
              <img className="pub-article-cover" src={articleCoverUrl(article)} alt="" />
            )}
            <ArticleBody body={article.body} />
            <div className="pub-article-cta">
              <div>
                <strong>{cta.title}</strong>
                <p>{cta.text}</p>
              </div>
              <Link className="pub-btn pub-btn-navy" href={cta.href}>
                {cta.label} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="pub-article-share">
              <span>Partagez ce conseil :</span>
              <ShareButtons url={url} title={article.title} />
            </div>
          </article>

          <aside className="pub-article-aside">
            {outline.length > 1 && (
              <nav className="pub-offer-card pub-article-outline" aria-label="Sommaire">
                <strong>
                  <ListTree size={16} aria-hidden="true" /> Sommaire
                </strong>
                <ol>
                  {outline.map((entry) => (
                    <li key={entry.id}>
                      <a href={`#${entry.id}`}>{entry.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <div className="pub-offer-card pub-article-alert">
              <BellRing size={22} aria-hidden="true" />
              <strong>Ne manquez aucune offre</strong>
              <p>Recevez par e-mail les nouvelles offres qui vous correspondent.</p>
              <Link className="pub-btn pub-btn-gold" href="/alertes">
                Créer une alerte
              </Link>
            </div>
          </aside>
        </div>

        {article.related.length > 0 && (
          <section className="pub-container pub-article-related" aria-labelledby="related-title">
            <h2 id="related-title">À lire aussi</h2>
            <div className="pub-article-grid">
              {article.related.map((item) => (
                <ArticleCard key={item.slug} article={item} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
