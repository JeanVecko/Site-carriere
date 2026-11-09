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
  Phone,
  Send,
  ShieldAlert,
} from "lucide-react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import ViewTracker from "./ViewTracker";
import ShareButtons from "./ShareButtons";
import OfferRow from "./OfferRow";
import { SOCIAL_NETWORKS } from "./SocialLinks";
import {
  API_BASE,
  applyTarget,
  type ApplyTarget,
  companyAvatar,
  daysLeft,
  decodeEntities,
  detailHref,
  formatDate,
  isExpired,
  paragraphs,
  type Announcement,
} from "../lib/api";
import { fetchAnnouncement, fetchAnnouncements, SITE_URL } from "../lib/server";

// Page de détail commune aux trois adresses : /offre/…, /annonce/… et /appel-offre/….
// Chaque route (app/offre, app/annonce, app/appel-offre) l'utilise avec sa propre base.

// Active la mise en cache (ISR) des pages : les publications actuelles sont préparées à la construction,
// les nouvelles le sont à leur première visite, puis toutes sont servies depuis le cache et rafraîchies
// en arrière-plan au plus toutes les 60 s.
export async function publicationStaticParams(base: string) {
  // Liste lue fraîchement (sans cache) : on ne prépare jamais une offre supprimée entre-temps.
  try {
    const response = await fetch(`${API_BASE}/announcements`, { cache: "no-store" });
    if (!response.ok) return [];
    const items = (await response.json()) as Announcement[];
    return items
      .map((item) => detailHref(item))
      .filter((href) => href.startsWith(`${base}/`))
      .map((href) => ({ slug: href.slice(base.length + 1) }));
  } catch {
    return []; // API indisponible : les pages seront préparées à leur première visite
  }
}

export type PublicationProps = { params: Promise<{ slug: string }> };

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
  const text = paragraphs(item.description || "").join(" ").replace(/\s+/g, " ").trim();
  return text.length > 155 ? `${text.slice(0, 152)}…` : text;
}

export async function publicationMetadata({ params }: PublicationProps): Promise<Metadata> {
  const item = await fetchAnnouncement(idFromSlug((await params).slug));
  if (!item) return { title: "Publication introuvable — Carrières RDC" };
  const title = `${decodeEntities(item.title)} — ${decodeEntities(item.company)} — Carrières RDC`;
  return {
    title,
    description: summary(item),
    alternates: { canonical: `${SITE_URL}${detailHref(item)}` },
    openGraph: {
      title,
      description: summary(item),
      url: `${SITE_URL}${detailHref(item)}`,
      type: "article",
      siteName: "Carrières RDC",
      locale: "fr_CD",
    },
    twitter: { card: "summary_large_image", title, description: summary(item) },
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

// Icône WhatsApp au même format que les icônes lucide (prop size), pour le bouton « Postuler sur WhatsApp ».
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  const path = SOCIAL_NETWORKS.find((network) => network.name === "WhatsApp")?.path || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={path} />
    </svg>
  );
}

function escapeForHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function PublicationPage({ params, base }: PublicationProps & { base: string }) {
  const { slug } = await params;
  const item = await fetchAnnouncement(idFromSlug(slug));
  if (!item) notFound();

  // Adresse canonique : /offre/12-titre, /annonce/12-titre ou /appel-offre/12-titre selon la catégorie
  // (redirige les anciens liens, les titres modifiés et les publications changées de catégorie).
  const canonical = detailHref(item);
  if (decodeURIComponent(`${base}/${slug}`) !== decodeURIComponent(canonical)) permanentRedirect(canonical);

  const expired = isExpired(item);
  const remaining = daysLeft(item.deadline);
  const apply = applyTarget(item.apply_contact, decodeEntities(item.title));
  const applyHref = apply?.href ?? null;
  // Lien web et WhatsApp : nouvel onglet ; e-mail et téléphone : l'application correspondante s'ouvre.
  const applyIsWeb = apply?.kind === "web" || apply?.kind === "whatsapp";
  const APPLY_TEXT: Record<ApplyTarget["kind"], string> = {
    web: "Accéder à la candidature",
    email: "Envoyer ma candidature par e-mail",
    whatsapp: "Postuler sur WhatsApp",
    phone: "Appeler pour postuler",
  };
  const ApplyIcon = !apply ? Send : apply.kind === "web" ? ExternalLink : apply.kind === "phone" ? Phone : apply.kind === "whatsapp" ? WhatsAppIcon : Send;
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

  const similar = (await fetchAnnouncements())
    .filter((entry) => entry.category === item.category && String(entry.id) !== String(item.id) && !isExpired(entry))
    .slice(0, 3);
  const countdown =
    remaining === null
      ? null
      : expired
        ? { tone: "is-closed", text: "La date limite est dépassée" }
        : remaining === 0
          ? { tone: "is-soon", text: "Dernier jour pour postuler" }
          : { tone: remaining <= 7 ? "is-soon" : "is-open", text: `Plus que ${remaining} jour${remaining > 1 ? "s" : ""} pour postuler` };
  const applyLabel = isTender ? "Soumissionner" : "Postuler";
  const canApply = !expired && Boolean(item.apply_contact);
  // Bouton « Postuler » du bandeau et de la barre mobile : lien de candidature ou messagerie directement,
  // sinon (adresse de dépôt…) il descend vers l'encadré « Postuler ».
  const ctaProps = applyHref
    ? { href: applyHref, ...(applyIsWeb ? { target: "_blank", rel: "noreferrer" } : {}) }
    : { href: "#postuler" };
  const CtaIcon = ApplyIcon;

  return (
    <>
      <SiteHeader active={categoryPage.href} />
      <ViewTracker id={String(item.id)} />
      {isJob && !expired && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingJsonLd(item) }} />
      )}

      <section className="pub-offer-hero">
        <div className="pub-container">
          <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link> <span aria-hidden="true">/</span>{" "}
            <Link href={categoryPage.href}>{categoryPage.label}</Link> <span aria-hidden="true">/</span>{" "}
            <span className="pub-breadcrumb-current">{title}</span>
          </nav>
          <div className="pub-offer-hero-main">
            <span className={`pub-avatar pub-avatar-lg tone-${avatar.tone}`} aria-hidden="true">
              {avatar.initial}
            </span>
            <div className="pub-offer-hero-text">
              <h1>{title}</h1>
              <p>
                <Building2 size={15} aria-hidden="true" /> {decodeEntities(item.company)}
                <span aria-hidden="true">·</span>
                <MapPin size={15} aria-hidden="true" /> {decodeEntities(item.location)}
              </p>
              <div className="pub-tags">
                <span className="pub-tag">{item.category}</span>
                {item.contract_type && <span className="pub-tag pub-tag-gold">{item.contract_type}</span>}
                {item.salary && <span className="pub-tag">{item.salary}</span>}
                {expired ? <span className="pub-tag pub-tag-red">Offre expirée</span> : <span className="pub-tag pub-tag-green">En cours</span>}
              </div>
            </div>
            {canApply && (
              <a className="pub-btn pub-btn-gold pub-offer-hero-cta" {...ctaProps}>
                <CtaIcon size={16} /> {applyLabel}
              </a>
            )}
          </div>
        </div>
      </section>

      <main className="pub-container pub-offer">
        <article className="pub-offer-card">
          {item.description && (
            <section className="pub-prose">
              <h2>{isTender ? "Description de l’appel d’offre" : "Description du poste"}</h2>
              {paragraphs(item.description).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          )}

          {item.media && item.media.length > 0 && (
            <section className="pub-prose pub-media" aria-label="Documents de l’offre">
              <h2>Documents</h2>
              {item.media.map((file, index) =>
                file.type === "application/pdf" ? (
                  <a className="pub-pdf" href={`${API_BASE}/announcements/${item.id}/media/${index}`} download={file.name} key={`${file.name}-${index}`}>
                    <FileText size={26} aria-hidden="true" />
                    <span>{file.name}</span>
                    <small>Télécharger</small>
                  </a>
                ) : (
                  // Image servie par l'API comme un fichier (mis en cache), et non intégrée dans la page.
                  // eslint-disable-next-line @next/next/no-img-element -- image servie par l'API
                  <img
                    key={`${file.name}-${index}`}
                    src={`${API_BASE}/announcements/${item.id}/media/${index}`}
                    alt={`Document de l’offre : ${file.name}`}
                    loading="lazy"
                    decoding="async"
                  />
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
          <section className="pub-offer-card pub-apply" id="postuler" aria-labelledby="apply-title">
            <h2 id="apply-title">{applyLabel}</h2>
            <p className="pub-apply-sub">Les candidatures sont envoyées directement à l’organisation.</p>
            {countdown && (
              <p className={`pub-countdown ${countdown.tone}`}>
                <Hourglass size={16} aria-hidden="true" /> {countdown.text}
              </p>
            )}
            {canApply ? (
              <>
                <div className="pub-apply-contact">{item.apply_contact}</div>
                {applyHref && (
                  <a
                    className="pub-btn pub-btn-gold pub-btn-block"
                    href={applyHref}
                    target={applyIsWeb ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <ApplyIcon size={16} />
                    {apply ? APPLY_TEXT[apply.kind] : "Postuler"}
                  </a>
                )}
              </>
            ) : (
              !expired && <p className="pub-apply-sub">Les modalités de candidature figurent dans la description ou le document joint.</p>
            )}
          </section>

          <section className="pub-offer-card" aria-labelledby="facts-title">
            <h3 id="facts-title" className="pub-card-title">En bref</h3>
            <dl className="pub-facts-list">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon size={17} aria-hidden="true" />
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="pub-offer-card pub-share" aria-labelledby="share-title">
            <h3 id="share-title" className="pub-card-title">Partager cette offre</h3>
            <ShareButtons url={`${SITE_URL}${canonical}`} title={title} />
          </section>

          {/* Mention anti-arnaque : seulement pour les offres d'emploi. Les appels d'offres (frais de dossier) et les
              annonces de prestataires (services payants) peuvent légitimement comporter des frais. */}
          {isJob && (
            <aside className="pub-warning">
              <ShieldAlert size={18} aria-hidden="true" />
              <p>
                <strong>Aucun frais ne doit vous être demandé pour postuler.</strong> Si l’on vous réclame de l’argent,
                ne payez pas et signalez-le-nous via le formulaire de contact.
              </p>
            </aside>
          )}
        </aside>
      </main>

      {similar.length > 0 && (
        <section className="pub-container pub-similar" aria-labelledby="similar-title">
          <div className="pub-list-head">
            <h2 id="similar-title">Offres similaires</h2>
            <Link className="pub-link-btn" href={categoryPage.href}>
              Tout voir
            </Link>
          </div>
          <ul className="pub-jobs">
            {similar.map((entry) => (
              <OfferRow key={String(entry.id)} item={entry} />
            ))}
          </ul>
        </section>
      )}

      {canApply && (
        <div className="pub-apply-bar">
          <a className="pub-btn pub-btn-gold pub-btn-block" {...ctaProps}>
            <CtaIcon size={16} /> {applyLabel}
          </a>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
