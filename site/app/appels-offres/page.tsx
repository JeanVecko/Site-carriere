import type { Metadata } from "next";
import { Suspense } from "react";
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
      <Suspense fallback={null}>
        <CategoryList category="tenders" />
      </Suspense>
      <CategoryFooter />
    </>
  );
}
