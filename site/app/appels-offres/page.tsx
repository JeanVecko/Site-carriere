import type { Metadata } from "next";
import { Suspense } from "react";
import SiteHeader from "../components/SiteHeader";
import CategoryList from "../components/CategoryList";
import SiteFooter from "../components/SiteFooter";
import { fetchAnnouncements } from "../lib/server";

export const metadata: Metadata = {
  title: "Appels d’offres — Carrières RDC",
};

// Liste préparée côté serveur et mise en cache (affichage immédiat), rafraîchie au plus toutes les 60 s.
export const revalidate = 60;

export default async function Page() {
  const items = await fetchAnnouncements("Appel d’offre");
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <CategoryList category="tenders" initialItems={items} />
      </Suspense>
      <SiteFooter />
    </>
  );
}
