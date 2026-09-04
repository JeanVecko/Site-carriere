import { Suspense } from "react";
import SiteHeader from "../components/SiteHeader";
import DetailContent from "../components/DetailContent";
import CategoryFooter from "../components/CategoryFooter";

export default function Page() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={null}>
        <DetailContent />
      </Suspense>
      <CategoryFooter />
    </>
  );
}
