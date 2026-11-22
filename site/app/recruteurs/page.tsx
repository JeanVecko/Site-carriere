import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  CircleCheck,
  Clock,
  FileText,
  Gift,
  Globe,
  Inbox,
  Mail,
  Megaphone,
  MessagesSquare,
  Phone,
  Search,
  Star,
} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { SOCIAL_NETWORKS } from "../components/SocialLinks";
import { CONTACT_EMAIL, CONTACT_PHONE, FEATURED_PLANS } from "../lib/api";

export const metadata: Metadata = {
  title: "Recruteurs et partenaires — Carrières RDC",
  description:
    "Publiez vos offres d’emploi, annonces et appels d’offres sur Carrières RDC : mise en ligne en moins de 24 h, relais sur nos réseaux, publication offerte jusqu’au 31 décembre 2026.",
  alternates: { canonical: "/recruteurs" },
};

const PHONE_DIGITS = CONTACT_PHONE.replace(/\D/g, "");
const WHATSAPP_HREF = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(
  "Bonjour Carrières RDC, je souhaite publier une offre sur votre plateforme."
)}`;
const MAIL_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Publication d’une offre sur Carrières RDC")}`;
const WHATSAPP_PATH = SOCIAL_NETWORKS.find((network) => network.name === "WhatsApp")?.path || "";

const BENEFITS = [
  { icon: Globe, title: "Une page dédiée", text: "Votre offre a sa propre page sur www.carrieresrdc.com, référencée sur Google." },
  { icon: Megaphone, title: "Un relais sur nos réseaux", text: "Diffusion sur TikTok, Facebook et notre chaîne WhatsApp." },
  { icon: FileText, title: "Une présentation soignée", text: "Poste, profil recherché et conditions de candidature présentés clairement." },
  { icon: Inbox, title: "Les candidatures chez vous", text: "Envoyées directement à votre e-mail, votre WhatsApp ou votre plateforme de recrutement." },
];

const STEPS = [
  { icon: Mail, title: "Envoyez votre avis", text: "Votre avis de recrutement en PDF ou Word, par e-mail ou par WhatsApp." },
  { icon: Search, title: "Nous le vérifions", text: "Nous nous assurons qu’il est complet et que la manière de postuler est claire." },
  { icon: MessagesSquare, title: "Nous convenons ensemble", text: "Des canaux de diffusion et, s’il y a lieu, des conditions de publication." },
  { icon: CalendarCheck, title: "Nous le publions", text: "En moins de 24 h après réception d’un dossier complet." },
];

function WhatsAppIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={WHATSAPP_PATH} />
    </svg>
  );
}

export default function RecruitersPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>Recruteurs</span>
            </nav>
            <h1>Donnez plus de visibilité à vos recrutements</h1>
            <p>
              Entreprises, ONG, institutions publiques et privées, cabinets de recrutement : confiez-nous vos offres
              d’emploi, annonces et appels d’offres. Nous les diffusons sur notre site et nos réseaux pour toucher des
              candidats partout en RDC.
            </p>
            <div className="pub-about-hero-buttons">
              <a className="pub-btn pub-btn-gold" href={WHATSAPP_HREF} target="_blank" rel="noreferrer">
                <WhatsAppIcon /> Publier via WhatsApp
              </a>
              <a className="pub-btn pub-btn-light" href={MAIL_HREF}>
                <Mail size={16} /> Envoyer par e-mail
              </a>
            </div>
            <p className="rec-hero-link">
              Déjà partenaire ? <Link href="/espace-recruteur">Accédez à votre espace recruteur</Link> pour suivre les résultats de vos offres.
            </p>
            <ul className="pub-about-badges">
              <li><Clock size={15} aria-hidden="true" /> En ligne en moins de 24 h</li>
              <li><Gift size={15} aria-hidden="true" /> Offert jusqu’au 31 décembre 2026</li>
              <li><BadgeCheck size={15} aria-hidden="true" /> Sans engagement</li>
            </ul>
          </div>
        </section>

        <div className="pub-container pub-about">
          <section aria-labelledby="benefits-title">
            <h2 className="pub-about-title" id="benefits-title">Ce que nous vous offrons</h2>
            <div className="pub-about-grid pub-about-grid-4">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="pub-about-card">
                  <span className="pub-about-icon" aria-hidden="true"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="steps-title">
            <h2 className="pub-about-title" id="steps-title">Comment publier une offre</h2>
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

          <section className="pub-about-offer" aria-labelledby="price-title">
            <span className="pub-about-icon is-gold" aria-hidden="true"><Gift size={22} /></span>
            <div>
              <h2 id="price-title">Tarifs : offre de lancement</h2>
              <p>
                Carrières RDC est en pleine croissance. Pour son lancement, <strong>la publication est offerte à toutes les
                organisations pendant les 3 premiers mois d’existence du site, jusqu’au 31 décembre 2026</strong>.
              </p>
              <p>
                À partir du <strong>1er janvier 2027</strong>, la publication se fera dans le cadre d’une convention de partenariat,
                que vous êtes libre de signer ou non.
              </p>
              <p className="pub-about-note">
                <CircleCheck size={15} aria-hidden="true" /> Aucun service payant n’est engagé sans votre accord écrit.
              </p>
            </div>
          </section>

          <section className="rec-pricing" aria-labelledby="featured-title">
            <span className="pub-about-icon is-gold" aria-hidden="true"><Star size={22} /></span>
            <h2 className="pub-about-title" id="featured-title">Mettez votre offre « à la une »</h2>
            <p className="rec-pricing-lead">
              Pour un recrutement urgent ou un profil rare : votre offre passe <strong>en tête des listes</strong> de Carrières RDC,
              avec un <strong>badge doré</strong>, et <strong>en premier dans nos alertes e-mail</strong>. Le résultat apparaît dans
              votre bilan.
            </p>
            <div className="rec-pricing-grid">
              {FEATURED_PLANS.map((plan) => (
                <article key={plan.days} className={`rec-pricing-card${plan.days === 14 ? " is-popular" : ""}`}>
                  {plan.days === 14 && <span className="rec-pricing-badge">Le plus choisi</span>}
                  <h3>{plan.days} jours</h3>
                  <p className="rec-pricing-price">{plan.price} $</p>
                  <p className="rec-pricing-unit">{(plan.price / plan.days).toFixed(2).replace(".", ",")} $ par jour</p>
                </article>
              ))}
            </div>
            <p className="pub-about-note">
              <CircleCheck size={15} aria-hidden="true" /> Demandez-la depuis votre espace recruteur ou contactez-nous. Paiement par
              Mobile Money ou virement ; la mise en avant commence à réception.
            </p>
          </section>

          <section className="pub-about-contact" aria-labelledby="contact-title">
            <h2 id="contact-title">Nous contacter</h2>
            <p>Vous souhaitez publier une offre, établir un partenariat ou en savoir plus ? Notre équipe vous répond rapidement.</p>
            <div className="pub-about-grid pub-about-grid-3">
              <a className="pub-about-card is-link pub-about-channel" href={WHATSAPP_HREF} target="_blank" rel="noreferrer">
                <span className="pub-about-icon" aria-hidden="true"><WhatsAppIcon /></span>
                <h3>WhatsApp</h3>
                <p>{CONTACT_PHONE}</p>
              </a>
              <a className="pub-about-card is-link pub-about-channel" href={`tel:+${PHONE_DIGITS}`}>
                <span className="pub-about-icon" aria-hidden="true"><Phone size={20} /></span>
                <h3>Téléphone</h3>
                <p>{CONTACT_PHONE}</p>
              </a>
              <a className="pub-about-card is-link pub-about-channel" href={MAIL_HREF}>
                <span className="pub-about-icon" aria-hidden="true"><Mail size={20} /></span>
                <h3>E-mail</h3>
                <p>{CONTACT_EMAIL}</p>
              </a>
            </div>
          </section>

          <p className="pub-about-signature">
            Carrières RDC ne participe pas à la sélection des candidats : les candidatures sont transmises directement
            aux recruteurs, selon les modalités indiquées dans chaque annonce. <Link href="/a-propos">En savoir plus sur nous</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
