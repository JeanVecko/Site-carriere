"use client";

import { useState } from "react";
import { Mail, Phone, Send } from "lucide-react";
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
      const messages = JSON.parse(localStorage.getItem("carrieres-rdc-messages") || "[]");
      messages.unshift({ ...data, date: new Date().toLocaleString("fr-FR") });
      localStorage.setItem("carrieres-rdc-messages", JSON.stringify(messages));
    }
    form.reset();
    setFeedback("Votre message a bien été envoyé.");
  }

  return (
    <footer id="contact" className="site-footer">
      <div className="footer-contact">
        <div className="footer-message">
          <p className="eyebrow eyebrow-light">
            <span className="eyebrow-line"></span> Vous avez une offre ?
          </p>
          <h2>
            Vous êtes au
            <br />
            <em>bon endroit.</em>
          </h2>
          <p>
            Besoin de publier une offre ou une annonce ? Carrières RDC vous accompagne pour toucher
            les bons profils.
          </p>
        </div>
        <div className="footer-details">
          <p className="footer-label">Contactez-nous</p>
          <a href="mailto:contact@carrieresrdc.cd" className="footer-contact-link">
            <Mail size={19} />
            <span>contact@carrieresrdc.cd</span>
          </a>
          <a href="tel:+243810000000" className="footer-contact-link">
            <Phone size={19} />
            <span>+243 81 000 00 00</span>
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
                rows={4}
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
        <span>Les opportunités sont partout.</span>
        <span>© 2026 Carrières RDC</span>
      </div>
    </footer>
  );
}
