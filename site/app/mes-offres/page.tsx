import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import SavedOffers from "../components/SavedOffers";

export const metadata: Metadata = {
  title: "Mes offres sauvegardées — Carrières RDC",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <SavedOffers />
      <SiteFooter />
    </>
  );
}
