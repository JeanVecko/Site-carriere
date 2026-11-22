import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import ArticleIndex from "../components/ArticleIndex";
import { fetchArticles, SITE_URL } from "../lib/server";

export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Conseils carrière : CV, entretien, recherche d’emploi en RDC — Carrières RDC",
  description:
    "Guides pratiques pour trouver un emploi en RDC : rédiger un CV et une lettre de motivation, réussir un entretien d’embauche, répondre à un appel d’offres, connaître ses droits.",
  alternates: { canonical: `${SITE_URL}/conseils` },
};

export default async function Page() {
  const articles = await fetchArticles();
  return (
    <>
      <SiteHeader active="/conseils" />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>Conseils carrière</span>
            </nav>
            <h1>Conseils carrière</h1>
            <p>CV, lettre de motivation, entretien, appels d’offres : nos guides pratiques pour réussir votre recherche d’emploi en RDC.</p>
          </div>
        </section>
        <section className="pub-container pub-article-index">
          {articles.length === 0 ? <p className="pub-empty">Nos premiers conseils arrivent très bientôt.</p> : <ArticleIndex articles={articles} />}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
