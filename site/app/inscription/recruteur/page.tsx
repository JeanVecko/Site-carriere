import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import RecruiterRegister from "../../components/RecruiterRegister";

export default function InscriptionRecruteurPage() {
  return (
    <>
      <SiteHeader active="inscription" />
      <RecruiterRegister />
      <SiteFooter />
    </>
  );
}
