import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { RecruiterActivate } from "../../components/RecruiterSpace";

export const metadata: Metadata = {
  title: "Activer mon espace recruteur — Carrières RDC",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // le lien d'accès ne doit pas être transmis aux sites ouverts depuis cette page
};

// /espace-recruteur/activer?token=… : lien d'accès envoyé par l'administrateur.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { token } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <h1>Bienvenue dans votre espace recruteur</h1>
            <p>Dernière étape : choisissez le mot de passe de votre espace.</p>
          </div>
        </section>
        <RecruiterActivate token={typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? token : ""} />
      </main>
      <SiteFooter />
    </>
  );
}
