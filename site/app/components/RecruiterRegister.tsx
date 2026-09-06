"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, ArrowLeft, Download } from "lucide-react";
import { apiRequest, saveSession, dashboardHref } from "../lib/api";

const secteurs = [
  "Banque / Finance",
  "BTP / Construction",
  "Commerce / Distribution",
  "Éducation / Formation",
  "Énergie / Mines",
  "Hôtellerie / Restauration",
  "Industrie / Manufacture",
  "Informatique / Télécoms",
  "NGO / Coopération",
  "Santé / Pharmacie",
  "Services / Conseil",
  "Transport / Logistique",
  "Autre",
];

const paysDisponibles = [
  "République Démocratique du Congo",
  "Congo-Brazzaville",
  "Angola",
  "Cameroun",
  "Gabon",
  "Kenya",
  "Maroc",
  "France",
  "Belgique",
  "Canada",
  "États-Unis",
  "Autre",
];

const tranches = [
  "1 - 10 employés",
  "11 - 50 employés",
  "51 - 200 employés",
  "201 - 500 employés",
  "Plus de 500 employés",
];

export default function RecruiterRegister() {
  const router = useRouter();
  // Section 1 : Informations de l'entreprise
  const [companyName, setCompanyName] = useState("");
  const [organizationCode, setOrganizationCode] = useState("");
  const [adresse, setAdresse] = useState("");
  const [secteur, setSecteur] = useState("");
  const [description, setDescription] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [paysSelectionne, setPaysSelectionne] = useState("");
  const [tranche, setTranche] = useState("");
  const [siteWeb, setSiteWeb] = useState("");

  // Section 2 : Coordonnées de contact
  const [civilite, setCivilite] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [indicatif1, setIndicatif1] = useState("+243");
  const [tel1, setTel1] = useState("");
  const [indicatif2, setIndicatif2] = useState("+243");
  const [tel2, setTel2] = useState("");

  // Section 3 : Identifiants
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fichiers
  const [logoName, setLogoName] = useState("");
  const [registreName, setRegistreName] = useState("");

  // Autres
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isCaptchaChecking, setIsCaptchaChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COMPANY_NAME_MAX = 50;

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

    if (!companyName || !adresse || !secteur || !description || !ville || !paysSelectionne || !tranche) {
      setFeedback({ type: "error", message: "Veuillez renseigner tous les champs obligatoires (*)." });
      return;
    }

    if (!civilite || !prenom || !nom || !fonction || !tel1) {
      setFeedback({ type: "error", message: "Veuillez renseigner vos coordonnées de contact (*)." });
      return;
    }

    if (!/^[0-9\s-]{6,15}$/.test(tel1.trim())) {
      setFeedback({ type: "error", message: "Veuillez saisir un numéro de téléphone principal valide." });
      return;
    }

    if (tel2 && !/^[0-9\s-]{6,15}$/.test(tel2.trim())) {
      setFeedback({ type: "error", message: "Veuillez saisir un numéro de téléphone secondaire valide." });
      return;
    }

    if (!email || !confirmEmail || !password) {
      setFeedback({ type: "error", message: "Veuillez renseigner vos identifiants (*)." });
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
      setFeedback({ type: "error", message: "Vous devez accepter les Conditions Générales de Vente et d'Utilisation pour continuer." });
      return;
    }

    if (!isCaptchaVerified) {
      setFeedback({ type: "error", message: "Veuillez confirmer que vous n'êtes pas un robot avant de continuer." });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiRequest<{ token: string; user: { role: string; email: string } }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            role: "recruteur",
            email,
            password,
            organizationName: companyName,
            organizationCode: organizationCode.trim().toUpperCase() || undefined,
            data: {
              companyName,
              adresse,
              secteur,
              description,
              codePostal,
              ville,
              pays: paysSelectionne,
              tranche,
              siteWeb,
              civilite,
              prenom,
              nom,
              fonction,
              linkedin,
              telephone1: `${indicatif1} ${tel1}`,
              telephone2: tel2 ? `${indicatif2} ${tel2}` : "",
              logoName,
              registreName,
            },
          }),
        }
      );
      saveSession({ token: result.token, role: "recruteur", email });
      setFeedback({
        type: "success",
        message: "Félicitations ! Votre compte Recruteur a été créé avec succès.",
      });
      setTimeout(() => {
        router.push(dashboardHref("recruteur"));
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
    <main className="recruiter-register-page">
      {/* Lien retour */}
      <div className="candidate-top-nav">
        <Link href="/inscription" className="back-link">
          <ArrowLeft size={16} /> Retour au choix du profil
        </Link>
      </div>

      {/* Bandeau supérieur centré */}
      <section className="candidate-register-banner" aria-label="Titre d'inscription recruteur">
        <h1>Recruteurs, inscrivez votre entreprise !</h1>
      </section>

      <section className="candidate-register-container" aria-label="Formulaire d'inscription recruteur">
        <article className="candidate-register-card">
          <div className="candidate-card-body">
            {feedback?.type === "success" ? (
              <div className="candidate-success-box">
                <CheckCircle size={48} color="#2e7d32" style={{ margin: "0 auto 16px", display: "block" }} />
                <h3>Bienvenue sur Carrières RDC !</h3>
                <p>{feedback.message}</p>
                <div style={{ marginTop: "24px" }}>
                  <Link href="/connexion" className="pill-button pill-button-primary">
                    Se connecter à mon espace recruteur
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="candidate-form">
                {/* ============ SECTION 1 : ENTREPRISE ============ */}
                <header className="recruiter-section-header">
                  <span className="recruiter-section-number">1</span>
                  <h2>Informations de l’entreprise</h2>
                </header>

                <div className="recruiter-grid-2">
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value.slice(0, COMPANY_NAME_MAX))}
                      placeholder="Nom de l’entreprise / organisation *"
                      required
                      className="access-input"
                    />
                    <span className="char-counter">{companyName.length}/{COMPANY_NAME_MAX}</span>
                  </div>
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      placeholder="Adresse du siège *"
                      required
                      className="access-input"
                    />
                  </div>
                </div>

                <div className="candidate-field-col recruiter-field-block">
                  <input
                    type="text"
                    value={organizationCode}
                    onChange={(e) => setOrganizationCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                    placeholder="Code d’invitation (facultatif pour rejoindre une organisation)"
                    className="access-input"
                    autoComplete="off"
                  />
                  <small className="field-help-text">Laissez vide pour créer une nouvelle organisation.</small>
                </div>

                <div className="candidate-field-col recruiter-field-block">
                  <select
                    value={secteur}
                    onChange={(e) => setSecteur(e.target.value)}
                    required
                    className={`access-input access-select ${secteur ? "filled" : "placeholder"}`}
                    aria-label="Secteur d’activité"
                  >
                    <option value="" disabled>Secteur d’activité *</option>
                    {secteurs.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="candidate-field-col recruiter-field-block">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brève présentation de votre entreprise... *"
                    required
                    rows={5}
                    maxLength={600}
                    className="access-input recruiter-textarea"
                  />
                  <span className="char-counter">{description.length}/600</span>
                </div>

                <div className="recruiter-grid-4">
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value)}
                      placeholder="Code postal"
                      className="access-input"
                    />
                  </div>
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      placeholder="Ville *"
                      required
                      className="access-input"
                    />
                  </div>
                  <div className="candidate-field-col">
                    <select
                      value={paysSelectionne}
                      onChange={(e) => setPaysSelectionne(e.target.value)}
                      required
                      className={`access-input access-select ${paysSelectionne ? "filled" : "placeholder"}`}
                      aria-label="Pays"
                    >
                      <option value="" disabled>Pays *</option>
                      {paysDisponibles.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="candidate-field-col">
                    <select
                      value={tranche}
                      onChange={(e) => setTranche(e.target.value)}
                      required
                      className={`access-input access-select ${tranche ? "filled" : "placeholder"}`}
                      aria-label="Nombre d’employés"
                    >
                      <option value="" disabled>Nombre d’employés *</option>
                      {tranches.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="candidate-field-col recruiter-field-block">
                  <input
                    type="url"
                    value={siteWeb}
                    onChange={(e) => setSiteWeb(e.target.value)}
                    placeholder="Site web (ex: https://www.monentreprise.cd)"
                    className="access-input"
                  />
                </div>

                <div className="recruiter-grid-2">
                  {/* Upload logo */}
                  <div className="recruiter-upload-box">
                    <span className="recruiter-upload-title">Logo de l’entreprise (PNG, JPG, SVG — 2 Mo max)</span>
                    <label className="recruiter-upload-label">
                      <Download size={16} />
                      {logoName ? logoName : "Choisir un fichier"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={(e) => setLogoName(e.target.files?.[0]?.name || "")}
                        className="recruiter-upload-input"
                      />
                    </label>
                  </div>

                  {/* Upload registre de commerce */}
                  <div className="recruiter-upload-box">
                    <span className="recruiter-upload-title">Registre de commerce / RCCM (PDF — 2 Mo max)</span>
                    <label className="recruiter-upload-label">
                      <Download size={16} />
                      {registreName ? registreName : "Choisir un fichier"}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setRegistreName(e.target.files?.[0]?.name || "")}
                        className="recruiter-upload-input"
                      />
                    </label>
                  </div>
                </div>

                {/* ============ SECTION 2 : CONTACT ============ */}
                <header className="recruiter-section-header">
                  <span className="recruiter-section-number">2</span>
                  <h2>Coordonnées de contact</h2>
                </header>

                <div className="recruiter-grid-4">
                  <div className="candidate-field-col candidate-civility-col">
                    <select
                      value={civilite}
                      onChange={(e) => setCivilite(e.target.value)}
                      required
                      className={`access-input access-select ${civilite ? "filled" : "placeholder"}`}
                      aria-label="Civilité"
                    >
                      <option value="" disabled>Civilité *</option>
                      <option value="M.">M.</option>
                      <option value="Mme">Mme</option>
                    </select>
                  </div>
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Prénom *"
                      autoComplete="given-name"
                      required
                      className="access-input"
                    />
                  </div>
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Nom *"
                      autoComplete="family-name"
                      required
                      className="access-input"
                    />
                  </div>
                  <div className="candidate-field-col">
                    <input
                      type="text"
                      value={fonction}
                      onChange={(e) => setFonction(e.target.value)}
                      placeholder="Fonction (ex: DRH) *"
                      required
                      className="access-input"
                    />
                  </div>
                </div>

                <div className="candidate-field-col recruiter-field-block">
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="Page LinkedIn de l’entreprise (ex: https://linkedin.com/company/...)"
                    className="access-input"
                  />
                </div>

                <div className="recruiter-grid-2">
                  <div className="candidate-field-col">
                    <div className="phone-input-wrapper">
                      <div className="phone-indicatif-wrapper">
                        <select
                          value={indicatif1}
                          onChange={(e) => setIndicatif1(e.target.value)}
                          className="phone-indicatif-select"
                          aria-label="Indicatif du téléphone 1"
                        >
                          <option value="+243">🇨🇩 +243</option>
                          <option value="+242">🇨🇬 +242</option>
                          <option value="+237">🇨🇲 +237</option>
                          <option value="+241">🇬🇦 +241</option>
                          <option value="+244">🇦🇴 +244</option>
                          <option value="+254">🇰🇪 +254</option>
                          <option value="+212">🇲🇦 +212</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+32">🇧🇪 +32</option>
                          <option value="+1">🇺🇸/🇨🇦 +1</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+44">🇬🇧 +44</option>
                        </select>
                        <span className="phone-indicatif-arrow">▼</span>
                      </div>
                      <input
                        type="tel"
                        value={tel1}
                        onChange={(e) => setTel1(e.target.value)}
                        placeholder="Téléphone 1 *"
                        autoComplete="tel"
                        required
                        className="access-input phone-number-input"
                      />
                    </div>
                  </div>

                  <div className="candidate-field-col">
                    <div className="phone-input-wrapper">
                      <div className="phone-indicatif-wrapper">
                        <select
                          value={indicatif2}
                          onChange={(e) => setIndicatif2(e.target.value)}
                          className="phone-indicatif-select"
                          aria-label="Indicatif du téléphone 2"
                        >
                          <option value="+243">🇨🇩 +243</option>
                          <option value="+242">🇨🇬 +242</option>
                          <option value="+237">🇨🇲 +237</option>
                          <option value="+241">🇬🇦 +241</option>
                          <option value="+244">🇦🇴 +244</option>
                          <option value="+254">🇰🇪 +254</option>
                          <option value="+212">🇲🇦 +212</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+32">🇧🇪 +32</option>
                          <option value="+1">🇺🇸/🇨🇦 +1</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+44">🇬🇧 +44</option>
                        </select>
                        <span className="phone-indicatif-arrow">▼</span>
                      </div>
                      <input
                        type="tel"
                        value={tel2}
                        onChange={(e) => setTel2(e.target.value)}
                        placeholder="Téléphone 2 (facultatif)"
                        className="access-input phone-number-input"
                      />
                    </div>
                  </div>
                </div>

                {/* ============ SECTION 3 : IDENTIFIANTS ============ */}
                <header className="recruiter-section-header">
                  <span className="recruiter-section-number">3</span>
                  <h2>Identifiants de connexion</h2>
                </header>

                <div className="candidate-inputs-row">
                  <div className="candidate-field-col">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Votre email *"
                      autoComplete="email"
                      required
                      className="access-input"
                    />
                  </div>
                  <div className="candidate-field-col">
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      placeholder="Confirmez votre email *"
                      autoComplete="email"
                      required
                      className="access-input"
                    />
                  </div>
                  <div className="candidate-field-col password-field-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
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

                <p className="required-note">(*) champ obligatoire</p>

                {/* Case à cocher CGV/CGU */}
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
                    <a href="#cgv" onClick={(e) => e.preventDefault()} className="cgu-link">
                      Conditions Générales de Vente et d’Utilisation *
                    </a>
                  </span>
                </label>

                {/* Widget reCAPTCHA */}
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
                            <path d="M4 12.5L9.5 18L20 6" stroke="#2e7d32" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
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
                          <path fill="#1a73e8" d="M24 6c-8.8 0-16 6.5-17.6 15h6.2C14 14.8 18.5 11 24 11c3.9 0 7.3 1.9 9.5 4.8L28 21h14V7l-5.3 5.3C33.7 8.7 29.1 6 24 6z" />
                          <path fill="#34a853" d="M41.6 27c-1.4 6.2-5.9 10-11.6 10-3.9 0-7.3-1.9-9.5-4.8L26 27H12v14l5.3-5.3C20.3 39.3 24.9 42 30 42c8.8 0 16-6.5 17.6-15h-6z" />
                        </svg>
                      </div>
                      <span className="recaptcha-brand">reCAPTCHA</span>
                      <div className="recaptcha-links">
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Confidentialité</a> -{" "}
                        <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Conditions</a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message d'erreur */}
                {feedback && feedback.type === "error" && (
                  <div className="form-feedback-message error" role="alert">
                    {feedback.message}
                  </div>
                )}

                {/* Bouton d'inscription */}
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
