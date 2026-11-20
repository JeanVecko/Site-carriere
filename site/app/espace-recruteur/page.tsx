import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import RecruiterSpace from "../components/RecruiterSpace";

export const metadata: Metadata = {
  title: "Espace recruteur — Carrières RDC",
  description: "Suivez les consultations et les candidatures de vos offres publiées sur Carrières RDC.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <h1>Espace recruteur</h1>
            <p>Suivez les résultats de vos offres : consultations, clics sur « Postuler » et provenance des candidats.</p>
          </div>
        </section>
        <RecruiterSpace />
      </main>
      <SiteFooter />
    </>
  );
}
