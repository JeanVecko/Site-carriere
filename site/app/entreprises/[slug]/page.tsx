import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, Globe, MapPin, Tag } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import CompanyLogo from "../../components/CompanyLogo";
import OfferRow from "../../components/OfferRow";
import VerifiedBadge from "../../components/VerifiedBadge";
import { companyHref, companyLogoUrl, isExpired } from "../../lib/api";
import { fetchCompanies, fetchCompany, SITE_URL } from "../../lib/server";

export const revalidate = 43200;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await fetchCompanies()).map((company) => ({ slug: company.slug }));
}

const sinceLabel = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const company = await fetchCompany((await params).slug);
  if (!company) return { title: "Page introuvable — Carrières RDC" };
  const open = company.offers.filter((item) => !isExpired(item)).length;
  const title = `${company.name} : recrutement et offres d’emploi${open ? ` (${open} en cours)` : ""} | Carrières RDC`;
  const description = `${company.description.slice(0, 150)}${company.description.length > 150 ? "…" : ""}`;
  const url = `${SITE_URL}${companyHref(company.slug)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Sans offre en cours, la page reste accessible mais n'est pas proposée à Google (page « vide »).
    robots: open ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: "profile", images: company.has_logo ? [`${SITE_URL}${companyLogoUrl(company)}`] : undefined },
  };
}

export default async function Page({ params }: Props) {
  const company = await fetchCompany((await params).slug);
  if (!company) notFound();
  const open = company.offers.filter((item) => !isExpired(item));
  const website = company.website ? company.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    description: company.description,
    url: company.website || `${SITE_URL}${companyHref(company.slug)}`,
    ...(company.has_logo ? { logo: `${SITE_URL}${companyLogoUrl(company)}` } : {}),
    ...(company.city ? { address: { "@type": "PostalAddress", addressLocality: company.city, addressCountry: "CD" } } : {}),
  };

  return (
    <>
      <SiteHeader active="/offres" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="pub-list-hero pub-company-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <Link href="/entreprises">Entreprises</Link>{" "}
              <span aria-hidden="true">/</span> <span>{company.name}</span>
            </nav>
            <div className="pub-company-head">
              <CompanyLogo company={company} size={88} />
              <div>
                <h1>
                  {company.name}
                  {company.verified && <VerifiedBadge />}
                </h1>
                <ul className="pub-company-facts">
                  <li>
                    <Tag size={15} aria-hidden="true" /> {company.sector}
                  </li>
                  {company.city && (
                    <li>
                      <MapPin size={15} aria-hidden="true" /> {company.city}
                    </li>
                  )}
                  {website && (
                    <li>
                      <Globe size={15} aria-hidden="true" />{" "}
                      <a href={company.website} target="_blank" rel="noreferrer nofollow">
                        {website}
                      </a>
                    </li>
                  )}
                  {company.first_offer_at && (
                    <li>
                      <CalendarDays size={15} aria-hidden="true" /> {company.total_offers} offre{company.total_offers > 1 ? "s" : ""} publiée
                      {company.total_offers > 1 ? "s" : ""} sur Carrières RDC depuis {sinceLabel(company.first_offer_at)}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="pub-container pub-company-body">
          <section className="pub-offer-card pub-prose pub-company-about" aria-labelledby="about-title">
            <h2 id="about-title">À propos de {company.name}</h2>
            {company.description.split(/\n{2,}|\r\n\r\n/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>

          <section className="pub-company-offers" aria-labelledby="offers-title">
            <h2 id="offers-title">
              <BriefcaseBusiness size={20} aria-hidden="true" /> Offres en cours{open.length ? ` (${open.length})` : ""}
            </h2>
            {open.length > 0 ? (
              <ul className="pub-jobs">
                {open.map((item) => (
                  <OfferRow key={String(item.id)} item={item} />
                ))}
              </ul>
            ) : (
              <p className="pub-empty">
                Aucune offre en cours pour le moment. <Link href="/alertes">Créez une alerte e-mail</Link> pour être prévenu des prochaines.
              </p>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
