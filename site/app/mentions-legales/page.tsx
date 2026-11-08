import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import CategoryFooter from "../components/CategoryFooter";

export const metadata: Metadata = {
  title: "Mentions légales et confidentialité — Carrières RDC",
  description: "Rôle de Carrières RDC, conditions de publication des offres et traitement des données personnelles.",
};

// À compléter : nom ou raison sociale de l'éditeur, adresse et contact réels.
export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <p className="eyebrow">
          <span className="eyebrow-line"></span> Informations
        </p>
        <h1>Mentions légales et confidentialité</h1>

        <h2>Rôle du site</h2>
        <p>
          Carrières RDC relaie des offres d’emploi, des annonces et des appels d’offres publiés par des
          employeurs et des organisations en République démocratique du Congo. Le site n’est pas l’employeur :
          les candidatures sont adressées directement à l’organisation indiquée dans chaque offre, selon les
          modalités qu’elle précise.
        </p>

        <h2>Fiabilité des offres</h2>
        <ul>
          <li>Chaque offre indique, lorsqu’elle est connue, sa source, sa date de publication et sa date limite.</li>
          <li>Une offre dont la date limite est dépassée est signalée comme expirée.</li>
          <li>
            Aucun frais ne doit être demandé à un candidat pour postuler. Si l’on vous réclame de l’argent,
            ne payez pas et signalez l’offre via le formulaire de contact : elle sera vérifiée et retirée si nécessaire.
          </li>
          <li>Les offres comportant des critères discriminatoires ne sont pas publiées.</li>
        </ul>

        <h2>Données personnelles</h2>
        <p>
          Le site ne propose pas de création de compte. Les seules données collectées sont celles que vous
          saisissez dans le formulaire de contact (nom, adresse e-mail, sujet et message). Elles servent
          uniquement à vous répondre, ne sont ni vendues ni transmises à des tiers, et sont supprimées une
          fois la demande traitée. Vous pouvez demander leur suppression à tout moment via ce même formulaire.
        </p>

        <h2>Contact</h2>
        <p>Pour toute question ou demande de retrait d’une offre, utilisez le formulaire de contact en bas de la page d’accueil.</p>
      </main>
      <CategoryFooter />
    </>
  );
}
