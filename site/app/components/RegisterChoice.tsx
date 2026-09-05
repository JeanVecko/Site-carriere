"use client";

import { useState } from "react";
import Link from "next/link";
import { X, CheckCircle, ArrowRight } from "lucide-react";
import { apiRequest, saveSession, dashboardHref } from "../lib/api";

export default function RegisterChoice() {
  const [selectedRole, setSelectedRole] = useState<"candidat" | "recruteur" | null>(null);

  // Formulaire Candidat
  const [candidatName, setCandidatName] = useState("");
  const [candidatEmail, setCandidatEmail] = useState("");
  const [candidatPassword, setCandidatPassword] = useState("");
  const [candidatJob, setCandidatJob] = useState("");
  const [candidatCity, setCandidatCity] = useState("Kinshasa");
  const [candidatSuccess, setCandidatSuccess] = useState(false);
  const [candidatError, setCandidatError] = useState("");
  const [candidatBusy, setCandidatBusy] = useState(false);

  // Formulaire Recruteur
  const [recruteurCompany, setRecruteurCompany] = useState("");
  const [recruteurContact, setRecruteurContact] = useState("");
  const [recruteurEmail, setRecruteurEmail] = useState("");
  const [recruteurPassword, setRecruteurPassword] = useState("");
  const [recruteurCity, setRecruteurCity] = useState("Kinshasa");
  const [recruteurSuccess, setRecruteurSuccess] = useState(false);
  const [recruteurError, setRecruteurError] = useState("");
  const [recruteurBusy, setRecruteurBusy] = useState(false);

  async function handleCandidatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCandidatBusy(true);
    setCandidatError("");
    try {
      const result = await apiRequest<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          role: "candidat",
          email: candidatEmail,
          password: candidatPassword,
          data: { nom: candidatName, metier: candidatJob, ville: candidatCity },
        }),
      });
      saveSession({ token: result.token, role: "candidat", email: candidatEmail });
      setCandidatSuccess(true);
      setTimeout(() => {
        window.location.href = dashboardHref("candidat");
      }, 1400);
    } catch (error) {
      setCandidatError(error instanceof Error ? error.message : "L’inscription a échoué.");
    } finally {
      setCandidatBusy(false);
    }
  }

  async function handleRecruteurSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRecruteurBusy(true);
    setRecruteurError("");
    try {
      const result = await apiRequest<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          role: "recruteur",
          email: recruteurEmail,
          password: recruteurPassword,
          data: { companyName: recruteurCompany, contact: recruteurContact, ville: recruteurCity },
        }),
      });
      saveSession({ token: result.token, role: "recruteur", email: recruteurEmail });
      setRecruteurSuccess(true);
      setTimeout(() => {
        window.location.href = dashboardHref("recruteur");
      }, 1400);
    } catch (error) {
      setRecruteurError(error instanceof Error ? error.message : "L’inscription a échoué.");
    } finally {
      setRecruteurBusy(false);
    }
  }

  return (
    <main className="express-register-page">
      {/* Bandeau supérieur centré : Inscription Express */}
      <section className="express-register-banner" aria-label="En-tête Inscription Express">
        <h1>Inscription Express</h1>
      </section>

      {/* Tableau des deux colonnes : Candidat & Recruteur */}
      <section className="express-register-container" aria-label="Choix du profil d'inscription">
        <div className="express-register-grid">
          {/* CARTE GAUCHE : CANDIDAT */}
          <article className="express-card">
            <h2 className="express-card-title">Candidat</h2>

            {/* Illustration vectorielle Candidat (Design Carrières RDC) */}
            <div className="express-illustration" aria-hidden="true">
              <svg viewBox="0 0 380 250" fill="none" xmlns="http://www.w3.org/2000/svg" className="illustration-svg">
                {/* Fond décoratif doux */}
                <rect x="20" y="30" width="340" height="200" rx="16" fill="#f4f7fb" opacity="0.8" />
                <circle cx="190" cy="115" r="75" fill="#e2ecf7" />

                {/* Projecteurs du haut */}
                <path d="M75 10 L85 45 L65 45 Z" fill="#092d63" />
                <line x1="75" y1="0" x2="75" y2="10" stroke="#092d63" stroke-width="3" />
                <path d="M50 45 L100 45 L115 190 L35 190 Z" fill="#d9a400" opacity="0.12" />

                <path d="M190 10 L200 45 L180 45 Z" fill="#092d63" />
                <line x1="190" y1="0" x2="190" y2="10" stroke="#092d63" stroke-width="3" />
                <path d="M165 45 L215 45 L245 220 L135 220 Z" fill="#d9a400" opacity="0.22" />

                <path d="M305 10 L315 45 L295 45 Z" fill="#092d63" />
                <line x1="305" y1="0" x2="305" y2="10" stroke="#092d63" stroke-width="3" />
                <path d="M280 45 L330 45 L345 190 L265 190 Z" fill="#d9a400" opacity="0.12" />

                {/* Étoile dorée Carrières RDC */}
                <path d="M190 62 L193 72 L203 72 L195 78 L198 88 L190 82 L182 88 L185 78 L177 72 L187 72 Z" fill="#d9a400" />

                {/* Personnage 1 : Homme avec mallette (gauche) */}
                <circle cx="85" cy="100" r="13" fill="#092d63" />
                <path d="M72 120 C72 113 78 111 85 111 C92 111 98 113 98 120 L101 170 L91 170 L91 220 L80 220 L80 170 L70 170 Z" fill="#092d63" />
                <path d="M85 118 L87 142 L85 147 L83 142 Z" fill="#d9a400" />
                <path d="M72 125 L60 148 L65 152 L73 133 Z" fill="#092d63" />
                {/* Main saluant */}
                <circle cx="58" cy="144" r="5" fill="#f3be94" />
                {/* Mallette */}
                <rect x="98" y="162" width="16" height="20" rx="3" fill="#293c52" />
                <rect x="103" y="158" width="6" height="4" rx="1" stroke="#293c52" stroke-width="1.5" fill="none" />

                {/* Personnage 2 : Femme professionnelle sous le faisceau central */}
                <circle cx="190" cy="98" r="14" fill="#092d63" />
                {/* Cheveux */}
                <path d="M174 95 C174 85 180 82 190 82 C200 82 206 85 206 95 C206 102 201 106 200 109 L180 109 C179 106 174 102 174 95 Z" fill="#1b2a3a" />
                {/* Visage */}
                <circle cx="190" cy="98" r="10" fill="#f3be94" />
                {/* Veste rouge bordeaux / orange chic */}
                <path d="M175 114 C175 110 180 108 190 108 C200 108 205 110 205 114 L209 170 L171 170 Z" fill="#d9a400" />
                {/* Chemisier blanc */}
                <polygon points="190,110 186,132 194,132" fill="#ffffff" />
                {/* Pantalon */}
                <path d="M174 170 L188 170 L186 225 L174 225 Z" fill="#092d63" />
                <path d="M192 170 L206 170 L206 225 L194 225 Z" fill="#092d63" />

                {/* Personnage 3 : Femme bras croisés (droite) */}
                <circle cx="295" cy="102" r="13" fill="#092d63" />
                <path d="M281 100 C281 88 288 85 295 85 C302 85 309 88 309 100 C309 110 306 115 305 125 L285 125 Z" fill="#1a1c23" />
                <circle cx="295" cy="102" r="9" fill="#9e6647" />
                {/* Veste */}
                <path d="M280 116 C280 112 286 110 295 110 C304 110 310 112 310 116 L313 166 L277 166 Z" fill="#092d63" />
                {/* Bras croisés */}
                <rect x="281" y="130" width="28" height="11" rx="5" fill="#d9a400" />
                {/* Jupe / pantalon */}
                <path d="M280 166 L310 166 L306 222 L284 222 Z" fill="#1e2c3c" />

                {/* Badge de validation profil */}
                <circle cx="225" cy="100" r="10" fill="#ffffff" stroke="#d9a400" stroke-width="2" />
                <path d="M221 100 L224 103 L229 97" stroke="#092d63" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            {/* Bouton Cliquez ici */}
            <div className="express-action">
              <Link
                href="/inscription/candidat"
                className="pill-button pill-button-primary express-pill-btn"
              >
                Cliquez ici
              </Link>
            </div>
          </article>

          {/* CARTE DROITE : RECRUTEUR */}
          <article className="express-card">
            <h2 className="express-card-title">Recruteur</h2>

            {/* Illustration vectorielle Recruteur (Design Carrières RDC) */}
            <div className="express-illustration" aria-hidden="true">
              <svg viewBox="0 0 380 250" fill="none" xmlns="http://www.w3.org/2000/svg" className="illustration-svg">
                {/* Fond décoratif doux avec cercle d'harmonie */}
                <ellipse cx="230" cy="130" rx="135" ry="90" fill="#fceded" opacity="0.6" />
                <ellipse cx="230" cy="130" rx="110" ry="75" fill="#e8f0f8" />

                {/* Rouages / Processus de recrutement */}
                <g fill="#d9a400" opacity="0.3">
                  <circle cx="260" cy="65" r="24" stroke="#d9a400" stroke-width="6" fill="none" stroke-dasharray="6 6" />
                  <circle cx="215" cy="175" r="30" stroke="#d9a400" stroke-width="7" fill="none" stroke-dasharray="8 6" />
                </g>

                {/* Fiches de profils candidats empilées */}
                {/* Fiche 1 (arrière) */}
                <rect x="50" y="65" width="60" height="75" rx="6" fill="#ffffff" stroke="#cbd7e4" stroke-width="1.8" />
                <circle cx="80" cy="85" r="9" fill="#092d63" />
                <line x1="62" y1="105" x2="98" y2="105" stroke="#cbd7e4" stroke-width="3" stroke-linecap="round" />
                <line x1="65" y1="115" x2="95" y2="115" stroke="#d9a400" stroke-width="2.5" stroke-linecap="round" />

                {/* Fiche 2 (centre, mise en avant) */}
                <rect x="100" y="45" width="76" height="95" rx="7" fill="#ffffff" stroke="#092d63" stroke-width="2.2" />
                <circle cx="138" cy="70" r="13" fill="#092d63" />
                <circle cx="138" cy="70" r="9" fill="#f3be94" />
                <path d="M129 88 C129 83 133 81 138 81 C143 81 147 83 147 88 Z" fill="#d9a400" />
                <line x1="115" y1="100" x2="161" y2="100" stroke="#cbd7e4" stroke-width="3.5" stroke-linecap="round" />
                {/* 5 étoiles d'évaluation */}
                <g fill="#d9a400">
                  <polygon points="120,112 121,115 124,115 122,117 123,120 120,118 117,120 118,117 116,115 119,115" />
                  <polygon points="129,112 130,115 133,115 131,117 132,120 129,118 126,120 127,117 125,115 128,115" />
                  <polygon points="138,112 139,115 142,115 140,117 141,120 138,118 135,120 136,117 134,115 137,115" />
                  <polygon points="147,112 148,115 151,115 149,117 150,120 147,118 144,120 145,117 143,115 146,115" />
                  <polygon points="156,112 157,115 160,115 158,117 159,120 156,118 153,120 154,117 152,115 155,115" />
                </g>

                {/* Fiche 3 (droite) */}
                <rect x="165" y="65" width="60" height="75" rx="6" fill="#ffffff" stroke="#cbd7e4" stroke-width="1.8" />
                <circle cx="195" cy="85" r="9" fill="#092d63" />
                <line x1="177" y1="105" x2="213" y2="105" stroke="#cbd7e4" stroke-width="3" stroke-linecap="round" />
                <line x1="180" y1="115" x2="210" y2="115" stroke="#d9a400" stroke-width="2.5" stroke-linecap="round" />

                {/* Case à cocher validée */}
                <rect x="290" y="44" width="16" height="16" rx="3.5" stroke="#092d63" stroke-width="1.8" fill="#ffffff" />
                <path d="M293.5 52 L296.5 55 L303 48" stroke="#d9a400" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

                {/* Bureau de travail du recruteur */}
                <rect x="180" y="160" width="155" height="6" rx="3" fill="#092d63" />
                <line x1="205" y1="166" x2="195" y2="225" stroke="#092d63" stroke-width="4" stroke-linecap="round" />
                <line x1="310" y1="166" x2="320" y2="225" stroke="#092d63" stroke-width="4" stroke-linecap="round" />

                {/* Ordinateur portable */}
                <polygon points="210,160 216,142 244,142 240,160" fill="#cbd7e4" stroke="#092d63" stroke-width="1.5" />
                <rect x="216" y="142" width="28" height="17" rx="2" fill="#092d63" />
                <rect x="218" y="144" width="24" height="13" rx="1" fill="#d9a400" opacity="0.4" />

                {/* Plante décorative bureau */}
                <path d="M335 185 Q325 170 338 160 Q348 175 335 185 Z" fill="#699277" />
                <path d="M342 188 Q355 175 348 162 Q338 176 342 188 Z" fill="#4d775b" />
                <rect x="330" y="185" width="18" height="20" rx="3" fill="#d9a400" />

                {/* Recruteuse assise devant son poste */}
                <circle cx="282" cy="118" r="11" fill="#f3be94" />
                {/* Cheveux */}
                <path d="M272 118 C272 108 280 106 288 106 C294 106 298 110 298 124 L290 124 Z" fill="#092d63" />
                {/* Veste/Haut */}
                <path d="M270 134 C270 130 276 128 282 128 C288 128 294 130 294 134 L294 175 L268 175 Z" fill="#092d63" />
                {/* Bras sur l'ordinateur */}
                <path d="M274 136 L242 154 L244 158 L278 142 Z" fill="#f3be94" />
                {/* Pantalon et jambes */}
                <path d="M270 175 L288 175 L252 215 L240 215 Z" fill="#d9a400" />
                {/* Chaise ergonomique */}
                <path d="M296 142 L306 142 L302 215" stroke="#092d63" stroke-width="4" stroke-linecap="round" />
              </svg>
            </div>

            {/* Bouton Cliquez ici */}
            <div className="express-action">
              <Link
                href="/inscription/recruteur"
                className="pill-button pill-button-primary express-pill-btn"
              >
                Cliquez ici
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* MODALE D'INSCRIPTION CANDIDAT */}
      {selectedRole === "candidat" && (
        <div className="modal-overlay" onClick={() => setSelectedRole(null)} role="dialog" aria-modal="true">
          <div className="modal-content modal-register" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Inscription Candidat</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Fermer"
                onClick={() => setSelectedRole(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="modal-description">
              Créez votre profil de candidat sur Carrières RDC pour postuler aux meilleures opportunités.
            </p>
            {candidatSuccess ? (
              <div className="form-feedback-message success" style={{ textAlign: "center", padding: "20px" }}>
                <CheckCircle size={36} color="#2e7d32" style={{ margin: "0 auto 10px", display: "block" }} />
                <strong>Compte Candidat créé avec succès !</strong>
                <p style={{ margin: "8px 0 0", fontSize: "13px" }}>Bienvenue sur Carrières RDC. Vous pouvez maintenant vous connecter.</p>
              </div>
            ) : (
              <form onSubmit={handleCandidatSubmit}>
                <div className="input-field-wrapper">
                  <input
                    type="text"
                    value={candidatName}
                    onChange={(e) => setCandidatName(e.target.value)}
                    placeholder="Nom complet (ex: Jean Mukendi) *"
                    required
                    className="access-input"
                    autoFocus
                  />
                </div>
                <div className="input-field-wrapper">
                  <input
                    type="email"
                    value={candidatEmail}
                    onChange={(e) => setCandidatEmail(e.target.value)}
                    placeholder="Adresse e-mail *"
                    required
                    className="access-input"
                  />
                </div>
                <div className="input-field-wrapper">
                  <input
                    type="text"
                    value={candidatJob}
                    onChange={(e) => setCandidatJob(e.target.value)}
                    placeholder="Métier ou domaine recherché (ex: Comptable, Développeur) *"
                    required
                    className="access-input"
                  />
                </div>
                <div className="input-field-wrapper">
                  <select
                    value={candidatCity}
                    onChange={(e) => setCandidatCity(e.target.value)}
                    className="access-input access-select"
                  >
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Lubumbashi">Lubumbashi</option>
                    <option value="Goma">Goma</option>
                    <option value="Bukavu">Bukavu</option>
                    <option value="Kisangani">Kisangani</option>
                    <option value="Kolwezi">Kolwezi</option>
                    <option value="Matadi">Matadi</option>
                    <option value="Autre RDC">Autre ville en RDC</option>
                  </select>
                </div>
                <div className="input-field-wrapper">
                  <input
                    type="password"
                    value={candidatPassword}
                    onChange={(e) => setCandidatPassword(e.target.value)}
                    placeholder="Mot de passe (min. 6 caractères) *"
                    minLength={6}
                    required
                    className="access-input"
                  />
                </div>
                <div className="modal-actions">
                  {candidatError && <p className="form-feedback-message error">{candidatError}</p>}
                  <button type="submit" className="pill-button pill-button-primary" disabled={candidatBusy}>
                    {candidatBusy ? "Inscription en cours..." : "Finaliser mon inscription Candidat"} {!candidatBusy && <ArrowRight size={16} style={{ marginLeft: "8px" }} />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODALE D'INSCRIPTION RECRUTEUR */}
      {selectedRole === "recruteur" && (
        <div className="modal-overlay" onClick={() => setSelectedRole(null)} role="dialog" aria-modal="true">
          <div className="modal-content modal-register" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Inscription Recruteur</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Fermer"
                onClick={() => setSelectedRole(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="modal-description">
              Inscrivez votre entreprise ou organisation pour publier vos offres d’emploi et consulter des profils en RDC.
            </p>
            {recruteurSuccess ? (
              <div className="form-feedback-message success" style={{ textAlign: "center", padding: "20px" }}>
                <CheckCircle size={36} color="#2e7d32" style={{ margin: "0 auto 10px", display: "block" }} />
                <strong>Compte Entreprise / Recruteur créé avec succès !</strong>
                <p style={{ margin: "8px 0 0", fontSize: "13px" }}>Votre espace recruteur est activé sur Carrières RDC.</p>
              </div>
            ) : (
              <form onSubmit={handleRecruteurSubmit}>
                <div className="input-field-wrapper">
                  <input
                    type="text"
                    value={recruteurCompany}
                    onChange={(e) => setRecruteurCompany(e.target.value)}
                    placeholder="Nom de l’entreprise ou organisation *"
                    required
                    className="access-input"
                    autoFocus
                  />
                </div>
                <div className="input-field-wrapper">
                  <input
                    type="text"
                    value={recruteurContact}
                    onChange={(e) => setRecruteurContact(e.target.value)}
                    placeholder="Nom du responsable du recrutement *"
                    required
                    className="access-input"
                  />
                </div>
                <div className="input-field-wrapper">
                  <input
                    type="email"
                    value={recruteurEmail}
                    onChange={(e) => setRecruteurEmail(e.target.value)}
                    placeholder="Adresse e-mail professionnelle *"
                    required
                    className="access-input"
                  />
                </div>
                <div className="input-field-wrapper">
                  <select
                    value={recruteurCity}
                    onChange={(e) => setRecruteurCity(e.target.value)}
                    className="access-input access-select"
                  >
                    <option value="Kinshasa">Siège : Kinshasa</option>
                    <option value="Lubumbashi">Siège : Lubumbashi</option>
                    <option value="Goma">Siège : Goma</option>
                    <option value="Bukavu">Siège : Bukavu</option>
                    <option value="Kisangani">Siège : Kisangani</option>
                    <option value="Kolwezi">Siège : Kolwezi</option>
                    <option value="Matadi">Siège : Matadi</option>
                    <option value="International / Autre">Autre ville ou International</option>
                  </select>
                </div>
                <div className="input-field-wrapper">
                  <input
                    type="password"
                    value={recruteurPassword}
                    onChange={(e) => setRecruteurPassword(e.target.value)}
                    placeholder="Mot de passe (min. 6 caractères) *"
                    minLength={6}
                    required
                    className="access-input"
                  />
                </div>
                <div className="modal-actions">
                  {recruteurError && <p className="form-feedback-message error">{recruteurError}</p>}
                  <button type="submit" className="pill-button pill-button-primary" disabled={recruteurBusy}>
                    {recruteurBusy ? "Inscription en cours..." : "Finaliser mon inscription Recruteur"} {!recruteurBusy && <ArrowRight size={16} style={{ marginLeft: "8px" }} />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

