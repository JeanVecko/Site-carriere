import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import CandidateRegister from "../../components/CandidateRegister";

export default function CandidateRegisterPage() {
  return (
    <>
      <SiteHeader active="inscription" />
      <CandidateRegister />
      <SiteFooter />
    </>
  );
}
