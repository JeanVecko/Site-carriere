import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AlertTokenAction from "../../components/AlertTokenAction";

export const metadata: Metadata = {
  title: "Désabonnement des alertes — Carrières RDC",
  robots: { index: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  return (
    <>
      <SiteHeader />
      <main className="pub-container pub-about">
        <section className="pub-alert-card">
          <h1 className="pub-about-title">Désabonnement</h1>
          {token ? (
            <AlertTokenAction action="unsubscribe" token={token} />
          ) : (
            <p>Ce lien est incomplet. Ouvrez-le directement depuis l’e-mail reçu.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
