import type { Metadata } from "next";
import { Suspense } from "react";
import SiteHeader from "../components/SiteHeader";
import CategoryList from "../components/CategoryList";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Annonces — Carrières RDC",
};

export default function Page() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <CategoryList category="notices" />
      </Suspense>
      <SiteFooter />
    </>
  );
}
