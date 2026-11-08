import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, CalendarClock, FileText, MapPin, ShieldAlert } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import CategoryFooter from "../../components/CategoryFooter";
import { applyLink, detailHref, formatDate, isExpired, paragraphs, type Announcement } from "../../lib/api";
import { fetchAnnouncement, SITE_URL } from "../../lib/server";

type Props = { params: Promise<{ slug: string }> };

const CATEGORY_URLS: Record<string, string> = {
  "Offre d’emploi": "/offres",
  Annonce: "/annonces",
  "Appel d’offre": "/appels-offres",
};

// Valeurs attendues par Google pour employmentType.
const EMPLOYMENT_TYPES: Record<string, string> = {
  CDI: "FULL_TIME",
  CDD: "TEMPORARY",
  Stage: "INTERN",
  Consultance: "CONTRACTOR",
  "Temps partiel": "PART_TIME",
  Intérim: "TEMPORARY",
  Bénévolat: "VOLUNTEER",
  Autre: "OTHER",
};

function idFromSlug(slug: string): string {
  return decodeURIComponent(slug).split("-")[0];
}

function summary(item: Announcement): string {
  const text = paragraphs(item.description || "").join(" ");
  return text.length > 155 ? `${text.slice(0, 152)}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await fetchAnnouncement(idFromSlug((await params).slug));
  if (!item) return { title: "Publication introuvable — Carrières RDC" };
  const title = `${item.title} — ${item.company} — Carrières RDC`;
  return {
    title,
    description: summary(item),
    alternates: { canonical: `${SITE_URL}${detailHref(item)}` },
    openGraph: { title, description: summary(item), url: `${SITE_URL}${detailHref(item)}`, type: "article" },
    robots: isExpired(item) ? { index: false } : undefined,
  };
}

// Données structurées "JobPosting" : permettent à Google d'afficher l'offre dans sa recherche d'emplois.
function jobPostingJsonLd(item: Announcement) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: item.title,
    description: paragraphs(item.description || "").map((p) => `<p>${escapeForHtml(p)}</p>`).join(""),
    datePosted: item.created_at,
    hiringOrganization: { "@type": "Organization", name: item.company },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: item.location, addressCountry: "CD" },
    },
    directApply: false,
  };
  if (item.deadline) data.validThrough = `${item.deadline}T23:59:59+01:00`;
  if (item.contract_type && EMPLOYMENT_TYPES[item.contract_type]) data.employmentType = EMPLOYMENT_TYPES[item.contract_type];
  // "<" est échappé pour qu'aucun texte ne puisse fermer la balise <script>.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function escapeForHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function OfferPage({ params }: Props) {
  const { slug } = await params;
  const item = await fetchAnnouncement(idFromSlug(slug));
  if (!item) notFound();

  // Adresse canonique : /offre/12-titre-de-l-offre (redirige les anciens liens ou titres modifiés).
  const canonical = detailHref(item);
  if (decodeURIComponent(`/offre/${slug}`) !== decodeURIComponent(canonical)) permanentRedirect(canonical);

  const expired = isExpired(item);
  const applyHref = applyLink(item.apply_contact);
  const isJob = item.category === "Offre d’emploi";
  const facts: Array<[string, string]> = [
    ["Employeur", item.company],
    ["Lieu", item.location],
    ["Type de contrat", item.contract_type || ""],
    ["Salaire", item.salary || ""],
    ["Publiée le", formatDate(item.created_at)],
    ["Date limite", item.deadline ? formatDate(item.deadline) : "Non précisée"],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <>
      <SiteHeader />
      {isJob && !expired && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingJsonLd(item) }} />
      )}
      <main className="detail-page">
        <div className="detail-page-top">
          <Link className="text-button" href={CATEGORY_URLS[item.category || ""] || "/"}>
            <ArrowLeft size={15} /> Retour à la liste
          </Link>
        </div>
        <article className="detail-page-card">
          <p className="eyebrow">
            <span className="eyebrow-line"></span> Carrières RDC
          </p>
          <span className="detail-page-tag tag">{item.category}</span>
          {expired && <span className="offer-expired-badge">Offre expirée</span>}
          <h1 className="detail-page-title">{item.title}</h1>
          <p className="detail-page-company">{item.company}</p>
          <p className="detail-page-location location">
            <MapPin size={14} />
            {item.location}
          </p>

          <dl className="offer-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {item.description && (
            <div className="detail-page-description">
              {paragraphs(item.description).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}

          {item.apply_contact && (
            <section className={`offer-apply${expired ? " is-expired" : ""}`} aria-labelledby="apply-title">
              <h2 id="apply-title">
                <CalendarClock size={17} /> {item.category === "Appel d’offre" ? "Comment soumissionner" : "Comment postuler"}
              </h2>
              {expired ? (
                <p>La date limite de cette offre est dépassée.</p>
              ) : applyHref ? (
                <a href={applyHref} target={applyHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  {item.apply_contact}
                </a>
              ) : (
                <p>{item.apply_contact}</p>
              )}
            </section>
          )}

          {item.media && item.media.length > 0 && (
            <section className="announcement-media" aria-label="Documents de l’annonce">
              <div className="announcement-media-grid">
                {item.media.map((file, index) =>
                  file.type === "application/pdf" ? (
                    <a className="announcement-pdf" href={file.dataUrl} download={file.name} key={`${file.name}-${index}`}>
                      <FileText size={28} />
                      <span>{file.name}</span>
                      <small>Télécharger le PDF</small>
                    </a>
                  ) : (
                    <div className="announcement-image-frame" key={`${file.name}-${index}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- image stockée en data URL */}
                      <img className="announcement-image" src={file.dataUrl} alt={`Document de l’offre : ${file.name}`} />
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          <aside className="offer-warning">
            <ShieldAlert size={18} />
            <p>
              <strong>Aucun frais ne doit vous être demandé pour postuler.</strong> Carrières RDC relaie des offres
              publiées par des employeurs : si l’on vous réclame de l’argent, ne payez pas et signalez-le-nous
              via le formulaire de contact.
            </p>
          </aside>

          {item.source_url && (
            <p className="offer-source">
              Source :{" "}
              <a href={item.source_url} target="_blank" rel="noreferrer nofollow">
                voir la publication d’origine
              </a>
            </p>
          )}
        </article>
      </main>
      <CategoryFooter />
    </>
  );
}
