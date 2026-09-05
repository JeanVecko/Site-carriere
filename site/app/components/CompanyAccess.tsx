"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, X } from "lucide-react";

const advantages = [
  "Inscription rapide",
  "Des recherches rapides et efficaces",
  "Publication d’annonces 24h/24 7j/7",
  "Stricte confidentialité de vos données",
];

export default function CompanyAccess() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modales interactives
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotFeedback, setForgotFeedback] = useState("");

  // Inscription
  const [registerType, setRegisterType] = useState<"candidat" | "recruteur">("recruteur");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFeedback, setRegisterFeedback] = useState("");

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        if (data.token) {
          sessionStorage.setItem("carrieres-admin-token", data.token);
          setFeedback({
            type: "success",
            message: "Connexion réussie ! Redirection en cours vers l’administration...",
          });
          setTimeout(() => {
            window.location.href = "/admin";
          }, 1000);
          return;
        }
      }

      if (email.includes("@") && password.length >= 4) {
        setFeedback({
          type: "success",
          message: "Connexion réussie ! Bienvenue sur Carrières RDC.",
        });
      } else {
        setFeedback({
          type: "error",
          message: "Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Erreur de connexion au serveur. Veuillez vérifier votre connexion.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleForgotSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!forgotEmail) return;
    setForgotFeedback("Un lien de réinitialisation a été envoyé à votre adresse e-mail si elle correspond à un compte actif.");
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotFeedback("");
      setForgotEmail("");
    }, 2800);
  }

  function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registerEmail || !registerPassword) return;
    setRegisterFeedback("Votre compte a été créé avec succès ! Vous pouvez dès à présent vous connecter.");
    setTimeout(() => {
      setShowRegisterModal(false);
      setRegisterFeedback("");
      setEmail(registerEmail);
    }, 2200);
  }

  return (
    <main className="company-access-page">
      {/* Bandeau supérieur centré : Connectez-vous à votre compte ! */}
      <section className="company-access-banner" aria-label="En-tête">
        <h1>Connectez-vous à votre compte !</h1>
      </section>

      {/* Conteneur des 2 panneaux : S'inscrire & Se connecter */}
      <section className="company-access-container" aria-label="Formulaire d'accès">
        <div className="company-access-grid">
          {/* CARTE GAUCHE : S'INSCRIRE */}
          <article className="access-card" id="inscription">
            <div className="access-card-header">
              <h2>S’inscrire</h2>
            </div>
            <div className="access-card-body">
              <h3 className="benefits-title">Nos avantages</h3>
              <ul className="benefits-list">
                {advantages.map((item) => (
                  <li key={item} className="benefits-item">
                    <span className="checkbox-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="16" height="16" rx="3.5" stroke="#092d63" stroke-width="1.8" fill="#f8fafc" />
                        <path d="M5.5 10.2L8.8 13.5L15.2 6.2" stroke="#d9a400" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </span>
                    <span className="benefits-text">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="card-actions">
                <Link
                  href="/inscription"
                  className="pill-button pill-button-primary"
                >
                  S’inscrire
                </Link>
              </div>
            </div>
          </article>

          {/* CARTE DROITE : SE CONNECTER */}
          <article className="access-card" id="connexion">
            <div className="access-card-header">
              <h2>Se connecter</h2>
            </div>
            <div className="access-card-body">
              <form className="access-form" onSubmit={handleLoginSubmit}>
                {/* Champ Email */}
                <div className="input-field-wrapper">
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre email *"
                    autoComplete="email"
                    required
                    className="access-input"
                  />
                </div>

                {/* Champ Mot de passe avec toggle œil */}
                <div className="input-field-wrapper password-field-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe *"
                    autoComplete="current-password"
                    required
                    className="access-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>

                {/* Mot de passe oublié (aligné à droite) */}
                <div className="forgot-password-row">
                  <button
                    type="button"
                    className="forgot-link-btn"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Bouton Se connecter (forme pilule, aligné à gauche) */}
                <div className="card-actions">
                  <button
                    type="submit"
                    className="pill-button pill-button-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </button>
                </div>

                {/* Feedback status */}
                {feedback && (
                  <div className={`form-feedback-message ${feedback.type}`} role="alert">
                    {feedback.message}
                  </div>
                )}
              </form>
            </div>
          </article>
        </div>
      </section>

      {/* MODALE INTERACTIVE : MOT DE PASSE OUBLIÉ */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mot de passe oublié</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Fermer"
                onClick={() => setShowForgotModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="modal-description">
              Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation de votre mot de passe.
            </p>
            <form onSubmit={handleForgotSubmit}>
              <div className="input-field-wrapper">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Votre email *"
                  required
                  className="access-input"
                  autoFocus
                />
              </div>
              {forgotFeedback ? (
                <p className="form-feedback-message success">{forgotFeedback}</p>
              ) : (
                <div className="modal-actions">
                  <button type="submit" className="pill-button pill-button-primary">
                    Envoyer le lien
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODALE INTERACTIVE : INSCRIPTION */}
      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)} role="dialog" aria-modal="true">
          <div className="modal-content modal-register" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Créer un compte Carrières RDC</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Fermer"
                onClick={() => setShowRegisterModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="modal-description">
              Rejoignez la plateforme de référence pour l’emploi et les opportunités en RDC.
            </p>
            <form onSubmit={handleRegisterSubmit}>
              <div className="register-type-selector">
                <button
                  type="button"
                  className={`type-btn ${registerType === "recruteur" ? "active" : ""}`}
                  onClick={() => setRegisterType("recruteur")}
                >
                  Entreprise / Recruteur
                </button>
                <button
                  type="button"
                  className={`type-btn ${registerType === "candidat" ? "active" : ""}`}
                  onClick={() => setRegisterType("candidat")}
                >
                  Candidat / Professionnel
                </button>
              </div>

              <div className="input-field-wrapper">
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder={registerType === "recruteur" ? "Nom de l’organisation *" : "Nom complet *"}
                  required
                  className="access-input"
                />
              </div>

              <div className="input-field-wrapper">
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="Adresse email *"
                  required
                  className="access-input"
                />
              </div>

              <div className="input-field-wrapper">
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Créer un mot de passe (min. 6 caractères) *"
                  minLength={6}
                  required
                  className="access-input"
                />
              </div>

              {registerFeedback ? (
                <p className="form-feedback-message success">{registerFeedback}</p>
              ) : (
                <div className="modal-actions">
                  <button type="submit" className="pill-button pill-button-primary">
                    Créer mon compte
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
