import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="pub-container">
        <article className="pub-prose-page" style={{ textAlign: "center" }}>
          <h1>Page introuvable</h1>
          <p>Cette offre a peut-être été retirée, ou l’adresse est incorrecte.</p>
          <p style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <Link className="pub-btn pub-btn-navy" href="/offres">
              Voir les offres d’emploi
            </Link>
            <Link className="pub-btn pub-btn-outline" href="/">
              Retour à l’accueil
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
