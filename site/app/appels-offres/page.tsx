import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import CategoryList from "../components/CategoryList";
import CategoryFooter from "../components/CategoryFooter";

export const metadata: Metadata = {
  title: "Appels d’offres — Carrières RDC",
};

export default function Page() {
  return (
    <>
      <SiteHeader active="appels-offres" />
      <CategoryList category="tenders" />
      <CategoryFooter />
    </>
  );
}
