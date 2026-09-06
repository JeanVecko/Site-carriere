"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { apiRequest, saveSession, dashboardHref } from "../lib/api";

export default function CandidateRegister() {
  const router = useRouter();
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [indicatif, setIndicatif] = useState("+243");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Simulation reCAPTCHA interactive
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isCaptchaChecking, setIsCaptchaChecking] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCaptchaClick() {
    if (isCaptchaVerified || isCaptchaChecking) return;
    setIsCaptchaChecking(true);
    setTimeout(() => {
      setIsCaptchaChecking(false);
      setIsCaptchaVerified(true);
      if (feedback?.message.includes("robot")) {
        setFeedback(null);
      }
    }, 750);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    // Validations
    if (!civilite || !prenom || !nom || !telephone || !email || !confirmEmail || !password) {
      setFeedback({ type: "error", message: "Veuillez renseigner tous les champs obligatoires (*)." });
      return;
    }

    if (!/^[0-9\s-]{6,15}$/.test(telephone.trim())) {
      setFeedback({ type: "error", message: "Veuillez saisir un numéro de téléphone valide." });
      return;
    }

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      setFeedback({ type: "error", message: "Les adresses e-mail ne correspondent pas. Veuillez vérifier votre saisie." });
      return;
    }

    if (password.length < 6) {
      setFeedback({ type: "error", message: "Le mot de passe doit comporter au moins 6 caractères." });
      return;
    }

    if (!acceptedTerms) {
      setFeedback({ type: "error", message: "Vous devez accepter les Conditions Générales d’Utilisation pour continuer." });
      return;
    }

    if (!isCaptchaVerified) {
      setFeedback({ type: "error", message: "Veuillez confirmer que vous n’êtes pas un robot avant de continuer." });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiRequest<{ token: string; user: { role: string; email: string } }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            role: "candidat",
            email,
            password,
            data: { civilite, prenom, nom, telephone: `${indicatif} ${telephone}` },
          }),
        }
      );
      saveSession({ token: result.token, role: "candidat", email });
      setFeedback({
        type: "success",
        message: "Félicitations ! Votre compte Candidat a été créé avec succès.",
      });
      setTimeout(() => {
        router.push(dashboardHref("candidat"));
      }, 1200);
    } catch (error) {
      setIsSubmitting(false);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "L’inscription a échoué. Veuillez réessayer.",
      });
    }
  }

  return (
    <main className="candidate-register-page">
      {/* Lien retour */}
      <div className="candidate-top-nav">
        <Link href="/inscription" className="back-link">
          <ArrowLeft size={16} /> Retour au choix du profil
        </Link>
      </div>

      {/* Bandeau supérieur centré */}
      <section className="candidate-register-banner" aria-label="Titre d'inscription candidat">
        <h1>Candidats, inscrivez-vous en 1 minute !</h1>
      </section>

      {/* Conteneur principal du formulaire */}
      <section className="candidate-register-container" aria-label="Formulaire d'inscription">
        <article className="candidate-register-card">
          {/* En-tête bandeau bleu nuit */}
          <header className="candidate-card-header">
            <h2>Vos informations</h2>
          </header>

          <div className="candidate-card-body">
            {feedback?.type === "success" ? (
              <div className="candidate-success-box">
                <CheckCircle size={48} color="#2e7d32" style={{ margin: "0 auto 16px", display: "block" }} />
                <h3>Bienvenue sur Carrières RDC !</h3>
                <p>{feedback.message}</p>
                <div style={{ marginTop: "24px" }}>
                  <Link href="/connexion" className="pill-button pill-button-primary">
                    Se connecter à mon compte
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="candidate-form">
                {/* Ligne Civilité / Prénom / Nom / Téléphone */}
                <div className="candidate-identity-row">
                  {/* Civilité */}
                  <div className="candidate-field-col candidate-civility-col">
                    <select
                      name="civilite"
                      value={civilite}
                      onChange={(e) => setCivilite(e.target.value)}
                      required
                      className={`access-input access-select ${civilite ? "filled" : "placeholder"}`}
                      aria-label="Civilité"
                    >
                      <option value="" disabled>
                        Civilité *
                      </option>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                    </select>
                  </div>

                  {/* Prénom */}
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      name="prenom"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Prénom *"
                      autoComplete="given-name"
                      required
                      className="access-input"
                    />
                  </div>

                  {/* Nom */}
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      name="nom"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Nom *"
                      autoComplete="family-name"
                      required
                      className="access-input"
                    />
                  </div>

                  {/* Téléphone avec indicatif */}
                  <div className="candidate-field-col candidate-phone-field">
                    <div className="phone-input-wrapper">
                      <div className="phone-indicatif-wrapper">
                        <select
                          name="indicatif"
                          value={indicatif}
                          onChange={(e) => setIndicatif(e.target.value)}
                          className="phone-indicatif-select"
                          aria-label="Indicatif international"
                        >
                          <option value="+243">🇨🇩 +243</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+32">🇧🇪 +32</option>
                          <option value="+1">🇺🇸/🇨🇦 +1</option>
                          <option value="+242">🇨🇬 +242</option>
                          <option value="+237">🇨🇲 +237</option>
                          <option value="+241">🇬🇦 +241</option>
                          <option value="+244">🇦🇴 +244</option>
                          <option value="+254">🇰🇪 +254</option>
                          <option value="+212">🇲🇦 +212</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+44">🇬🇧 +44</option>
                        </select>
                        <span className="phone-indicatif-arrow">▼</span>
                      </div>
                      <input
                        type="tel"
                        name="telephone"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        placeholder="Tel (ex:) *"
                        autoComplete="tel"
                        required
                        className="access-input phone-number-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Ligne des 3 champs de saisie */}
                <div className="candidate-inputs-row">
                  {/* Champ 1 : Votre email * */}
                  <div className="candidate-field-col">
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

                  {/* Champ 2 : Confirmez votre email * */}
                  <div className="candidate-field-col">
                    <input
                      type="email"
                      name="confirmEmail"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      placeholder="Confirmez votre email *"
                      autoComplete="email"
                      required
                      className="access-input"
                    />
                  </div>

                  {/* Champ 3 : Choisissez un mot de passe * avec toggle oeil */}
                  <div className="candidate-field-col password-field-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choisissez un mot de passe *"
                      autoComplete="new-password"
                      required
                      minLength={6}
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
                </div>

                {/* Mention champ obligatoire */}
                <p className="required-note">(*) champ obligatoire</p>

                {/* Case à cocher Conditions Générales d'Utilisation */}
                <label className="terms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                    className="custom-checkbox-input"
                  />
                  <span>
                    Je reconnais avoir lu et accepté les{" "}
                    <a href="#cgu" onClick={(e) => e.preventDefault()} className="cgu-link">
                      Conditions Générales d’Utilisation *
                    </a>
                  </span>
                </label>

                {/* Widget reCAPTCHA interactif */}
                <div className="recaptcha-wrapper">
                  <div
                    className={`recaptcha-box ${isCaptchaVerified ? "verified" : ""}`}
                    onClick={handleCaptchaClick}
                    role="button"
                    tabIndex={0}
                    aria-label="Vérification que vous n'êtes pas un robot"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCaptchaClick();
                      }
                    }}
                  >
                    <div className="recaptcha-left">
                      <div className="recaptcha-checkbox">
                        {isCaptchaChecking ? (
                          <div className="recaptcha-spinner" />
                        ) : isCaptchaVerified ? (
                          <svg viewBox="0 0 24 24" className="recaptcha-check-icon" fill="none">
                            <path
                              d="M4 12.5L9.5 18L20 6"
                              stroke="#2e7d32"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <div className="recaptcha-square" />
                        )}
                      </div>
                      <span className="recaptcha-label">Je ne suis pas un robot</span>
                    </div>

                    <div className="recaptcha-right">
                      <div className="recaptcha-logo-icon">
                        <svg viewBox="0 0 48 48" width="30" height="30">
                          <path
                            fill="#1a73e8"
                            d="M24 6c-8.8 0-16 6.5-17.6 15h6.2C14 14.8 18.5 11 24 11c3.9 0 7.3 1.9 9.5 4.8L28 21h14V7l-5.3 5.3C33.7 8.7 29.1 6 24 6z"
                          />
                          <path
                            fill="#34a853"
                            d="M41.6 27c-1.4 6.2-5.9 10-11.6 10-3.9 0-7.3-1.9-9.5-4.8L26 27H12v14l5.3-5.3C20.3 39.3 24.9 42 30 42c8.8 0 16-6.5 17.6-15h-6z"
                          />
                        </svg>
                      </div>
                      <span className="recaptcha-brand">reCAPTCHA</span>
                      <div className="recaptcha-links">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                          Confidentialité
                        </a>{" "}
                        -{" "}
                        <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
                          Conditions
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message d'erreur / statut */}
                {feedback && feedback.type === "error" && (
                  <div className="form-feedback-message error" role="alert">
                    {feedback.message}
                  </div>
                )}

                {/* Bouton centré : Je m'inscris */}
                <div className="candidate-submit-row">
                  <button
                    type="submit"
                    className="pill-button pill-button-primary candidate-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Inscription en cours..." : "Je m’inscris"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

