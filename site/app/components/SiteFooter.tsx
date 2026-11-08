"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { apiRequest } from "../lib/api";

export default function SiteFooter() {
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await apiRequest("/messages", { method: "POST", body: JSON.stringify(data) });
    } catch {
      // Le message n'est pas arrivé : on ne prétend pas le contraire.
      setFeedback("L’envoi a échoué. Réessayez dans un instant ou écrivez-nous par e-mail.");
      return;
    }
    form.reset();
    setFeedback("Votre message a bien été envoyé.");
  }

  return (
    <footer id="contact" className="site-footer">
      <div className="footer-contact">
        <div className="footer-message">
          <h2>
            Une <em>question ?</em>
          </h2>
          <p>Écrivez-nous, ou signalez une offre qui vous semble suspecte.</p>
        </div>
        <div className="footer-details">
          <p className="footer-label">Contactez-nous</p>
          <a href="mailto:contact@carrieresrdc.cd" className="footer-contact-link">
            <Mail size={19} />
            <span>contact@carrieresrdc.cd</span>
          </a>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Votre nom
              <input name="name" type="text" placeholder="Nom complet" required />
            </label>
            <label>
              Votre e-mail
              <input name="email" type="email" placeholder="vous@exemple.cd" required />
            </label>
            <label>
              Sujet
              <input name="subject" type="text" placeholder="Objet de votre message" required />
            </label>
            <label>
              Votre message
              <textarea
                name="message"
                rows={2}
                placeholder="Écrivez votre message ici..."
                required
              ></textarea>
            </label>
            <button className="button button-light" type="submit">
              Envoyer le message <Send size={16} />
            </button>
            <p className="form-feedback" role="status">
              {feedback}
            </p>
          </form>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          Carrière <strong>RDC</strong>
        </span>
        <span>
          © {new Date().getFullYear()} Carrières RDC ·{" "}
          <Link className="footer-legal-link" href="/mentions-legales">Mentions légales</Link>
        </span>
      </div>
    </footer>
  );
}
