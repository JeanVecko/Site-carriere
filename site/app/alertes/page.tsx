import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarClock, MailCheck, ShieldCheck } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import AlertSignup from "../components/AlertSignup";

export const metadata: Metadata = {
  title: "Alertes emploi par e-mail — Carrières RDC",
  description:
    "Recevez gratuitement par e-mail les nouvelles offres d’emploi, annonces et appels d’offres en RDC qui correspondent à votre ville, votre contrat et vos mots-clés.",
  alternates: { canonical: "/alertes" },
};

const POINTS = [
  { icon: BellRing, title: "Choisissez vos critères", text: "Type de publication, ville, contrat et mots-clés : vous ne recevez que ce qui vous intéresse." },
  { icon: MailCheck, title: "Confirmez votre adresse", text: "Un lien vous est envoyé par e-mail : un clic suffit pour activer l’alerte." },
  { icon: CalendarClock, title: "Un e-mail le matin", text: "Au plus un e-mail par jour, seulement quand de nouvelles publications correspondent." },
  { icon: ShieldCheck, title: "Gratuit et sans engagement", text: "Votre adresse sert uniquement à ces alertes. Désabonnement en un clic dans chaque e-mail." },
];

export default function AlertsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="pub-list-hero">
          <div className="pub-container">
            <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>Alertes e-mail</span>
            </nav>
            <h1>Recevez les nouvelles offres par e-mail</h1>
            <p>Indiquez ce que vous cherchez : nous vous envoyons les nouvelles publications qui correspondent, dès leur mise en ligne.</p>
          </div>
        </section>

        <div className="pub-container pub-about">
          <section className="pub-alert-card" aria-label="Créer une alerte">
            <AlertSignup />
          </section>

          <section aria-labelledby="alert-how-title">
            <h2 className="pub-about-title" id="alert-how-title">Comment ça marche</h2>
            <div className="pub-about-grid pub-about-grid-4">
              {POINTS.map(({ icon: Icon, title, text }) => (
                <article key={title} className="pub-about-card">
                  <span className="pub-about-icon" aria-hidden="true"><Icon size={20} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
