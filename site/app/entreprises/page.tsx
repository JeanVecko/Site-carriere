import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, MapPin } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import CompanyLogo from "../components/CompanyLogo";
import VerifiedBadge from "../components/VerifiedBadge";
import { companyHref } from "../lib/api";
import { fetchCompanies, SITE_URL } from "../lib/server";

export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Entreprises qui recrutent en RDC — Carrières RDC",
  description: "Les entreprises, ONG et institutions qui recrutent en République démocratique du Congo : présentation, secteur et offres d’emploi en cours.",
  alternates: { canonical: `${SITE_URL}/entreprises` },
};

export default async function Page() {
  const companies = await fetchCompanies();
  return (
    <>
      <SiteHeader active="/offres" />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>Entreprises</span>
            </nav>
            <h1>Entreprises qui recrutent</h1>
            <p>Découvrez les organisations qui publient leurs offres sur Carrières RDC, et leurs postes ouverts.</p>
          </div>
        </section>
        <section className="pub-container pub-company-index">
          {companies.length === 0 ? (
            <p className="pub-empty">Les pages entreprises arrivent bientôt.</p>
          ) : (
            <ul>
              {companies.map((company) => (
                <li key={company.slug}>
                  <Link href={companyHref(company.slug)}>
                    <CompanyLogo company={company} size={56} />
                    <span className="pub-company-card-text">
                      <strong>
                        {company.name}
                        {company.verified && <VerifiedBadge compact />}
                      </strong>
                      {company.sector && <small>{company.sector}</small>}
                      <span className="pub-company-card-meta">
                        {company.city && (
                          <span>
                            <MapPin size={13} aria-hidden="true" /> {company.city}
                          </span>
                        )}
                        <span>
                          <BriefcaseBusiness size={13} aria-hidden="true" /> {company.open_offers} offre{company.open_offers > 1 ? "s" : ""} en cours
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
