import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import RegisterChoice from "../components/RegisterChoice";

export default function InscriptionPage() {
  return (
    <>
      <SiteHeader active="inscription" />
      <RegisterChoice />
      <SiteFooter />
    </>
  );
}

