import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  FileText,
  Hourglass,
  MapPin,
  Send,
  ShieldAlert,
} from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ViewTracker from "../../components/ViewTracker";
import ShareButtons from "../../components/ShareButtons";
import {
  applyLink,
  companyAvatar,
  daysLeft,
  decodeEntities,
  detailHref,
  formatDate,
  isExpired,
  paragraphs,
  type Announcement,
} from "../../lib/api";
import { fetchAnnouncement, SITE_URL } from "../../lib/server";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const CATEGORY_PAGES: Record<string, { href: string; label: string }> = {
  "Offre d’emploi": { href: "/offres", label: "Offres d’emploi" },
  Annonce: { href: "/annonces", label: "Annonces" },
  "Appel d’offre": { href: "/appels-offres", label: "Appels d’offres" },
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
  const title = `${decodeEntities(item.title)} — ${decodeEntities(item.company)} — Carrières RDC`;
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
    title: decodeEntities(item.title),
    description: paragraphs(item.description || "").map((p) => `<p>${escapeForHtml(p)}</p>`).join(""),
    datePosted: item.created_at,
    hiringOrganization: { "@type": "Organization", name: decodeEntities(item.company) },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: decodeEntities(item.location), addressCountry: "CD" },
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
  const remaining = daysLeft(item.deadline);
  const applyHref = applyLink(item.apply_contact);
  const isJob = item.category === "Offre d’emploi";
  const isTender = item.category === "Appel d’offre";
  const categoryPage = CATEGORY_PAGES[item.category || ""] || { href: "/", label: "Accueil" };
  const avatar = companyAvatar(item.company);
  const title = decodeEntities(item.title);

  const facts = [
    { icon: Building2, label: "Employeur", value: decodeEntities(item.company) },
    { icon: MapPin, label: "Lieu", value: decodeEntities(item.location) },
    { icon: BriefcaseBusiness, label: "Type de contrat", value: item.contract_type || "" },
    { icon: Banknote, label: "Salaire", value: item.salary || "" },
    { icon: CalendarDays, label: "Publiée le", value: formatDate(item.created_at) },
    { icon: CalendarClock, label: "Date d’expiration", value: item.deadline ? formatDate(item.deadline) : "Non précisée" },
  ].filter((fact) => fact.value);

  return (
    <>
      <SiteHeader />
      <ViewTracker id={String(item.id)} />
      {isJob && !expired && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingJsonLd(item) }} />
      )}
      <main className="pub-container">
        <nav className="pub-breadcrumb" aria-label="Fil d’Ariane" style={{ marginTop: 22 }}>
          <Link href="/">Accueil</Link> <span aria-hidden="true">/</span>{" "}
          <Link href={categoryPage.href}>{categoryPage.label}</Link> <span aria-hidden="true">/</span>{" "}
          <span>{title}</span>
        </nav>

        <div className="pub-offer" style={{ paddingTop: 8 }}>
          <article className="pub-offer-card">
            <header className="pub-offer-head">
              <span className={`pub-avatar tone-${avatar.tone}`} aria-hidden="true">
                {avatar.initial}
              </span>
              <div>
                <h1>{title}</h1>
                <p className="pub-offer-company">{decodeEntities(item.company)}</p>
                <div className="pub-tags">
                  <span className="pub-tag">{item.category}</span>
                  {item.contract_type && <span className="pub-tag pub-tag-gold">{item.contract_type}</span>}
                  {expired ? <span className="pub-tag pub-tag-red">Offre expirée</span> : <span className="pub-tag pub-tag-green">En cours</span>}
                </div>
              </div>
            </header>

            <dl className="pub-facts">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </span>
                </div>
              ))}
            </dl>

            {item.description && (
              <section className="pub-prose">
                <h2>{isTender ? "Description de l’appel d’offre" : "Description du poste"}</h2>
                {paragraphs(item.description).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </section>
            )}

            {item.media && item.media.length > 0 && (
              <section className="pub-media" aria-label="Documents de l’offre">
                {item.media.map((file, index) =>
                  file.type === "application/pdf" ? (
                    <a className="pub-pdf" href={file.dataUrl} download={file.name} key={`${file.name}-${index}`}>
                      <FileText size={26} aria-hidden="true" />
                      <span>{file.name}</span>
                      <small>Télécharger</small>
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- image stockée en data URL
                    <img key={`${file.name}-${index}`} src={file.dataUrl} alt={`Document de l’offre : ${file.name}`} />
                  )
                )}
              </section>
            )}

            {item.source_url && (
              <p className="pub-source">
                Source :{" "}
                <a href={item.source_url} target="_blank" rel="noreferrer nofollow">
                  voir la publication d’origine
                </a>
              </p>
            )}
          </article>

          <aside className="pub-aside">
            <section className="pub-offer-card pub-apply" aria-labelledby="apply-title">
              <h2 id="apply-title">{isTender ? "Soumissionner" : "Postuler"}</h2>
              <p className="pub-apply-sub">Les candidatures sont envoyées directement à l’organisation.</p>

              {remaining !== null && (
                <p className={`pub-countdown ${expired ? "is-closed" : remaining <= 7 ? "is-soon" : "is-open"}`}>
                  <Hourglass size={16} aria-hidden="true" />
                  {expired
                    ? "La date limite est dépassée"
                    : remaining === 0
                      ? "Dernier jour pour postuler"
                      : `Plus que ${remaining} jour${remaining > 1 ? "s" : ""} pour postuler`}
                </p>
              )}

              {item.apply_contact && !expired ? (
                <>
                  <div className="pub-apply-contact">{item.apply_contact}</div>
                  {applyHref && (
                    <a
                      className="pub-btn pub-btn-gold pub-btn-block"
                      href={applyHref}
                      target={applyHref.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                    >
                      {applyHref.startsWith("mailto:") ? <Send size={16} /> : <ExternalLink size={16} />}
                      {applyHref.startsWith("mailto:") ? "Envoyer ma candidature" : "Accéder à la candidature"}
                    </a>
                  )}
                </>
              ) : (
                !expired && <p className="pub-apply-sub">Les modalités de candidature figurent dans la description ou le document joint.</p>
              )}
            </section>

            <section className="pub-offer-card pub-share" aria-labelledby="share-title">
              <h3 id="share-title">Partager cette offre</h3>
              <ShareButtons url={`${SITE_URL}${canonical}`} title={title} />
            </section>

            <aside className="pub-warning">
              <ShieldAlert size={18} aria-hidden="true" />
              <p>
                <strong>Aucun frais ne doit vous être demandé pour postuler.</strong> Si l’on vous réclame de l’argent,
                ne payez pas et signalez-le-nous via le formulaire de contact.
              </p>
            </aside>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
