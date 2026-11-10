import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Handshake,
  Megaphone,
  Search,
  Send,
  ShieldCheck,
  Target,
  Telescope,
} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "À propos — Carrières RDC",
  description:
    "Carrières RDC, plateforme congolaise d’information sur l’emploi portée par LogiCore Group : offres d’emploi, annonces et appels d’offres vérifiés en RDC.",
  alternates: { canonical: "/a-propos" },
};

const PUBLISHED = [
  {
    icon: BriefcaseBusiness,
    title: "Offres d’emploi",
    text: "Postes ouverts dans les entreprises, ONG, institutions et cabinets de recrutement.",
    href: "/offres",
  },
  {
    icon: Megaphone,
    title: "Annonces",
    text: "Stages, formations, programmes de renforcement des capacités et autres opportunités professionnelles.",
    href: "/annonces",
  },
  {
    icon: FileText,
    title: "Appels d’offres",
    text: "Avis de marchés, appels à cotation et consultations pour entreprises, consultants et prestataires.",
    href: "/appels-offres",
  },
];

const STEPS = [
  { icon: Search, title: "Collecte", text: "Nous recueillons les opportunités auprès des organisations ou de leurs canaux officiels." },
  { icon: BadgeCheck, title: "Vérification", text: "Nous contrôlons les informations et les modalités de candidature." },
  { icon: Megaphone, title: "Publication", text: "L’opportunité est publiée sur le site et relayée sur TikTok, Facebook et WhatsApp." },
  { icon: Send, title: "Candidature", text: "Les candidats consultent librement, sans compte, et postulent directement auprès du recruteur." },
];

const COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: "Gratuit pour les candidats",
    text: "Carrières RDC ne demande jamais d’argent pour consulter une offre ou postuler. Si quelqu’un vous en demande au nom d’un recrutement, c’est une arnaque.",
  },
  {
    icon: BadgeCheck,
    title: "Des informations vérifiées",
    text: "Chaque publication indique sa source, sa date limite et le canal officiel de candidature.",
  },
  {
    icon: Handshake,
    title: "Le respect du rôle des recruteurs",
    text: "Nous ne participons pas à la sélection : les candidatures sont envoyées directement à l’employeur.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>À propos</span>
            </nav>
            <h1>À propos de Carrières RDC</h1>
            <p>Rapprocher les talents des opportunités, partout en République démocratique du Congo.</p>
          </div>
        </section>

        <div className="pub-container pub-about">
          <section className="pub-about-intro" aria-labelledby="who-title">
            <div>
              <h2 id="who-title">Qui sommes-nous</h2>
              <p>
                Carrières RDC est une plateforme congolaise d’information sur l’emploi et les opportunités
                professionnelles en République démocratique du Congo. Créée à Kinshasa le 17&nbsp;décembre&nbsp;2025, elle
                est portée par <strong>LogiCore Group</strong>, établissement congolais de services numériques.
              </p>
              <p>
                Beaucoup de candidats peinent à trouver des offres fiables et à savoir comment postuler. De leur côté,
                les recruteurs ont besoin de canaux efficaces pour toucher les bons profils. Carrières RDC réunit ces
                opportunités en un seul endroit, clair et vérifié.
              </p>
            </div>
            <dl className="pub-about-facts">
              <div>
                <dt>Création</dt>
                <dd>17 décembre 2025, Kinshasa</dd>
              </div>
              <div>
                <dt>Porté par</dt>
                <dd>LogiCore Group</dd>
              </div>
              <div>
                <dt>Pour les candidats</dt>
                <dd>100 % gratuit, sans compte</dd>
              </div>
            </dl>
          </section>

          <section className="pub-about-grid pub-about-grid-2" aria-label="Mission et vision">
            <article className="pub-about-card">
              <span className="pub-about-icon" aria-hidden="true"><Target size={20} /></span>
              <h2>Notre mission</h2>
              <p>
                Rendre les opportunités professionnelles accessibles à tous les Congolais et donner aux organisations
                qui recrutent une visibilité à la hauteur de leurs besoins.
              </p>
            </article>
            <article className="pub-about-card">
              <span className="pub-about-icon" aria-hidden="true"><Telescope size={20} /></span>
              <h2>Notre vision</h2>
              <p>
                Devenir la référence de l’information sur l’emploi en RDC, puis connecter progressivement les talents
                congolais aux opportunités nationales et internationales.
              </p>
            </article>
          </section>

          <section aria-labelledby="published-title">
            <h2 className="pub-about-title" id="published-title">Ce que nous publions</h2>
            <div className="pub-about-grid pub-about-grid-3">
              {PUBLISHED.map(({ icon: Icon, title, text, href }) => (
                <Link key={href} className="pub-about-card is-link" href={href}>
                  <span className="pub-about-icon" aria-hidden="true"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="pub-about-more">
                    Voir les publications <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="how-title">
            <h2 className="pub-about-title" id="how-title">Comment ça fonctionne</h2>
            <ol className="pub-about-steps">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title}>
                  <span className="pub-about-step-num" aria-hidden="true">{index + 1}</span>
                  <Icon size={20} aria-hidden="true" className="pub-about-step-icon" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="commit-title">
            <h2 className="pub-about-title" id="commit-title">Nos engagements</h2>
            <div className="pub-about-grid pub-about-grid-3">
              {COMMITMENTS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="pub-about-card">
                  <span className="pub-about-icon is-gold" aria-hidden="true"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="pub-about-cta" aria-labelledby="about-cta-title">
            <div>
              <h2 id="about-cta-title">Vous recrutez ?</h2>
              <p>Confiez-nous vos offres : publication en moins de 24 h et 3 premiers mois offerts.</p>
            </div>
            <div className="pub-about-cta-buttons">
              <Link className="pub-btn pub-btn-gold" href="/recruteurs">
                Espace recruteurs <ArrowRight size={16} />
              </Link>
              <Link className="pub-btn pub-btn-light" href="/offres">
                Voir les offres
              </Link>
            </div>
          </section>

          <p className="pub-about-signature">Carrières RDC — Rapprocher les talents des opportunités.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
