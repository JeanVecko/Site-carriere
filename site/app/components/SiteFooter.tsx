"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { apiRequest } from "../lib/api";
import SocialLinks from "./SocialLinks";
import { Brand } from "./SiteHeader";

// Pied de page commun. Le formulaire de contact n'est affiché que sur l'accueil (withContact).
export default function SiteFooter({ withContact = false }: { withContact?: boolean }) {
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    try {
      await apiRequest("/messages", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset();
      setFeedback("Merci ! Votre message a bien été envoyé.");
    } catch {
      setFeedback("L’envoi a échoué. Réessayez dans un instant ou écrivez-nous par e-mail.");
    } finally {
      setPending(false);
    }
  }

  return (
    <footer className="pub-footer" id="contact">
      <div className="pub-container pub-footer-grid">
        <div>
          <Brand />
          <p className="pub-footer-about">
            Offres d’emploi, annonces et appels d’offres en République démocratique du Congo, publiés chaque jour.
          </p>
          <SocialLinks dark />
        </div>

        <div>
          <h3>Explorer</h3>
          <ul className="pub-footer-links">
            <li><Link href="/offres">Offres d’emploi</Link></li>
            <li><Link href="/annonces">Annonces</Link></li>
            <li><Link href="/appels-offres">Appels d’offres</Link></li>
            <li><Link href="/#recruteurs">Publier une offre</Link></li>
          </ul>
        </div>

        <div className="pub-footer-contact">
          <h3>Nous contacter</h3>
          <a className="pub-footer-mail" href="mailto:contact@carrieresrdc.cd">
            <Mail size={16} /> contact@carrieresrdc.cd
          </a>
          {withContact ? (
            <form className="pub-contact-form" onSubmit={handleSubmit}>
              <input name="name" type="text" placeholder="Votre nom" aria-label="Votre nom" required />
              <input name="email" type="email" placeholder="Votre e-mail" aria-label="Votre e-mail" required />
              <input name="subject" type="text" placeholder="Sujet" aria-label="Sujet" required />
              <textarea className="pub-span-2" name="message" rows={2} placeholder="Votre message (publier une offre, signaler une offre…)" aria-label="Votre message" required />
              <button className="pub-btn pub-btn-gold" type="submit" disabled={pending}>
                <Send size={15} /> {pending ? "Envoi…" : "Envoyer"}
              </button>
              {feedback && (
                <p className="pub-form-feedback pub-span" role="status">
                  {feedback}
                </p>
              )}
            </form>
          ) : (
            <Link className="pub-btn pub-btn-light" href="/#contact">
              Écrire un message
            </Link>
          )}
        </div>
      </div>
      <div className="pub-footer-bottom">
        <div className="pub-container">
          <span>© {new Date().getFullYear()} Carrières RDC. Tous droits réservés.</span>
          <span>
            <Link href="/mentions-legales">Mentions légales et confidentialité</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
