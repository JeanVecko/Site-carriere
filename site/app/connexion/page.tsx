import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import CompanyAccess from "../components/CompanyAccess";

export default function ConnectionPage() {
  return (
    <>
      <SiteHeader active="connexion" />
      <CompanyAccess />
      <SiteFooter />
    </>
  );
}
