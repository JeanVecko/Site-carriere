"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, LogOut, Send, Trash2, CheckCircle, Camera, FileText, User, Upload } from "lucide-react";
import { apiRequest, getSession, clearSession, userHeaders } from "../lib/api";
type Application = {
  id: number;
  status: string;
  cover_letter: string;
  created_at: string;
  announcement_id: number;
  title: string;
  company: string;
  location: string;
};

type Offer = {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
};

type Me = {
  id: number;
  role: string;
  email: string;
  data: {
    civilite?: string;
    prenom?: string;
    nom?: string;
    telephone?: string;
    metier?: string;
    ville?: string;
    bio?: string;
    photoDataUrl?: string;
    cvDataUrl?: string;
    cvName?: string;
  };
};

const STATUS_CLASS: Record<string, string> = {
  "En attente": "status-pending",
  "Examinée": "status-review",
  "Acceptée": "status-accepted",
  "Refusée": "status-rejected",
};

type Tab = "accueil" | "profil" | "offres";

export default function CandidateDashboard() {
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("accueil");
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulaire profil
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [metier, setMetier] = useState("");
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [bio, setBio] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [cvName, setCvName] = useState("");
  const [hasNewCv, setHasNewCv] = useState(false);
  const photoFileRef = useRef<File | null>(null);
  const cvFileRef = useRef<File | null>(null);

  // Postuler
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [coverLetter, setCoverLetter] = useState("");

  const loadApplications = useCallback(async () => {
    try {
      const apps = await apiRequest<Application[]>("/my/applications", { headers: userHeaders() });
      setApplications(Array.isArray(apps) ? apps : []);
    } catch {
      // silencieux
    }
  }, []);

  const loadOffers = useCallback(async () => {
    try {
      const rows = await apiRequest<Offer[]>("/announcements?category=" + encodeURIComponent("Offre d’emploi"));
      setOffers(Array.isArray(rows) ? rows : []);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "candidat") {
      router.push("/connexion");
      return;
    }
    (async () => {
      try {
        const profile = await apiRequest<Me>("/me", { headers: userHeaders() });
        setMe(profile);
        const d = profile.data || {};
        setPrenom(d.prenom || "");
        setNom(d.nom || "");
        setMetier(d.metier || "");
        setVille(d.ville || "");
        setTelephone(d.telephone || "");
        setBio(d.bio || "");
        setPhotoPreview(d.photoDataUrl || "");
        setCvName(d.cvName || "");
        await Promise.all([loadApplications(), loadOffers()]);
      } catch {
        // silencieux
      } finally {
        setChecking(false);
      }
    })();
  }, [loadApplications, loadOffers, router]);

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "La photo doit être une image (JPG, PNG...)." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "La photo ne doit pas dépasser 2 Mo." });
      return;
    }
    photoFileRef.current = file;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function onCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Le CV doit être un fichier PDF." });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage({ type: "error", text: "Le CV ne doit pas dépasser 4 Mo." });
      return;
    }
    cvFileRef.current = file;
    setHasNewCv(true);
    setCvName(file.name);
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const patch: Record<string, string> = { prenom, nom, metier, ville, telephone, bio };
      if (photoFileRef.current) patch.photoDataUrl = await readFileAsDataUrl(photoFileRef.current);
      if (cvFileRef.current) {
        patch.cvDataUrl = await readFileAsDataUrl(cvFileRef.current);
        patch.cvName = cvFileRef.current.name;
      }
      const updated = await apiRequest<Me>("/me", {
        method: "PATCH",
        headers: userHeaders(),
        body: JSON.stringify({ data: patch }),
      });
      setMe(updated);
      photoFileRef.current = null;
      cvFileRef.current = null;
      setHasNewCv(false);
      setMessage({ type: "success", text: "Votre profil a été enregistré avec succès !" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "L’enregistrement a échoué." });
    } finally {
      setBusy(false);
    }
  }

  async function apply(offer: Offer) {
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest("/my/applications", {
        method: "POST",
        headers: userHeaders(),
        body: JSON.stringify({ announcementId: offer.id, coverLetter }),
      });
      setMessage({ type: "success", text: `Candidature envoyée pour « ${offer.title} » !` });
      setSelectedOffer(null);
      setCoverLetter("");
      loadApplications();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "L’envoi a échoué." });
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: number) {
    try {
      await apiRequest(`/my/applications/${id}`, { method: "DELETE", headers: userHeaders() });
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silencieux
    }
  }

  function logout() {
    clearSession();
    router.push("/");
  }

  if (checking) {
    return <main className="dashboard-page"><p className="dashboard-loading">Chargement de votre espace...</p></main>;
  }

  const d = me?.data || {};
  const fullName = [d.civilite, prenom, nom].filter(Boolean).join(" ") || me?.email || "";

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Espace Candidat</h1>
          <p className="dashboard-email">{me?.email}</p>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="dashboard-logout-btn" onClick={logout}>
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      {/* Onglets */}
      <nav className="dashboard-tabs" aria-label="Sections du profil">
        <button type="button" className={tab === "accueil" ? "active" : ""} onClick={() => setTab("accueil")}>
          <User size={15} /> Accueil
        </button>
        <button type="button" className={tab === "profil" ? "active" : ""} onClick={() => setTab("profil")}>
          <Camera size={15} /> Mon profil
        </button>
        <button type="button" className={tab === "offres" ? "active" : ""} onClick={() => setTab("offres")}>
          <Briefcase size={15} /> Offres & candidatures
        </button>
      </nav>

      {message && (
        <div className={`form-feedback-message ${message.type}`} role="alert">{message.text}</div>
      )}

      {/* ============ ONGLET ACCUEIL ============ */}
      {tab === "accueil" && (
        <>
          <section className="dashboard-section candidate-hero-card">
            <div className="candidate-hero">
              {photoPreview ? (
                <img src={photoPreview} alt="Photo de profil" className="candidate-photo" />
              ) : (
                <div className="candidate-photo candidate-photo-placeholder">
                  {prenom?.[0]?.toUpperCase() || "C"}
                </div>
              )}
              <div className="candidate-hero-info">
                <h2>{fullName}</h2>
                <p className="candidate-hero-metier">{metier || "Métier non renseigné"}</p>
                <p className="candidate-hero-meta">
                  {ville && <span>📍 {ville}</span>}
                  {telephone && <span>📞 {telephone}</span>}
                </p>
                {bio && <p className="candidate-hero-bio">{bio}</p>}
                {d.cvName && (
                  <a className="candidate-cv-link" href={d.cvDataUrl} target="_blank" rel="noreferrer">
                    <FileText size={14} /> Voir mon CV ({d.cvName})
                  </a>
                )}
              </div>
              <button type="button" className="dashboard-link-btn" onClick={() => setTab("profil")}>
                Modifier mon profil
              </button>
            </div>
          </section>

          <section className="dashboard-section">
            <h2><CheckCircle size={18} /> Suivi de mes candidatures ({applications.length})</h2>
            {applications.length === 0 ? (
              <p className="dashboard-empty">Vous n’avez pas encore de candidature. Rendez-vous dans l’onglet « Offres & candidatures » !</p>
            ) : (
              <ul className="dashboard-list">
                {applications.map((app) => (
                  <li key={app.id} className="dashboard-item">
                    <div className="dashboard-item-main">
                      <strong>{app.title}</strong>
                      <span>{app.company} · {app.location}</span>
                      <small>Envoyée le {new Date(app.created_at).toLocaleDateString("fr-FR")}</small>
                    </div>
                    <div className="dashboard-item-actions">
                      <span className={`status-badge ${STATUS_CLASS[app.status] || "status-pending"}`}>{app.status}</span>
                      <button type="button" className="dashboard-icon-btn" title="Retirer ma candidature" onClick={() => withdraw(app.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* ============ ONGLET PROFIL ============ */}
      {tab === "profil" && (
        <section className="dashboard-section">
          <h2><Camera size={18} /> Mes informations & documents</h2>
          <form className="dashboard-publish-form candidate-profile-form" onSubmit={saveProfile}>
            {/* Photo de profil */}
            <div className="candidate-photo-editor">
              {photoPreview ? (
                <img src={photoPreview} alt="Photo de profil" className="candidate-photo candidate-photo-large" />
              ) : (
                <div className="candidate-photo candidate-photo-large candidate-photo-placeholder">
                  {prenom?.[0]?.toUpperCase() || "C"}
                </div>
              )}
              <label className="recruiter-upload-label candidate-photo-upload">
                <Upload size={15} />
                Changer la photo (JPG/PNG — 2 Mo max)
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} className="recruiter-upload-input" />
              </label>
            </div>

            <div className="dashboard-form-grid">
              <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom *" required className="access-input" />
              <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom *" required className="access-input" />
              <input type="text" value={metier} onChange={(e) => setMetier(e.target.value)} placeholder="Métier / domaine (ex: Comptable) *" required className="access-input" />
              <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ville (ex: Kinshasa)" className="access-input" />
              <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Téléphone" className="access-input" />
            </div>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Présentation : parlez de votre expérience, vos compétences, vos objectifs..."
              rows={4}
              maxLength={800}
              className="access-input recruiter-textarea"
            />
            <span className="char-counter">{bio.length}/800</span>

            {/* CV */}
            <div className="recruiter-upload-box">
              <span className="recruiter-upload-title">Curriculum Vitae (PDF — 4 Mo max)</span>
              <label className="recruiter-upload-label">
                <Upload size={15} />
                {cvName ? cvName : "Choisir mon CV"}
                <input type="file" accept="application/pdf" onChange={onCvChange} className="recruiter-upload-input" />
              </label>
              {d.cvDataUrl && !hasNewCv && (
                <a className="candidate-cv-link" href={d.cvDataUrl} target="_blank" rel="noreferrer">
                  <FileText size={14} /> Télécharger le CV actuel
                </a>
              )}
            </div>

            <button type="submit" className="pill-button pill-button-primary" disabled={busy}>
              {busy ? "Enregistrement..." : "Enregistrer mon profil"}
            </button>
          </form>
        </section>
      )}

      {/* ============ ONGLET OFFRES ============ */}
      {tab === "offres" && (
        <section className="dashboard-section">
          <h2><Briefcase size={18} /> Offres d’emploi disponibles</h2>
          {offers.length === 0 ? (
            <p className="dashboard-empty">Aucune offre disponible pour le moment.</p>
          ) : (
            <ul className="dashboard-list">
              {offers.map((offer) => {
                const alreadyApplied = applications.some((a) => a.announcement_id === offer.id);
                return (
                  <li key={offer.id} className="dashboard-item">
                    <div className="dashboard-item-main">
                      <strong>{offer.title}</strong>
                      <span>{offer.company} · {offer.location}</span>
                    </div>
                    <div className="dashboard-item-actions">
                      {alreadyApplied ? (
                        <span className="status-badge status-review">Candidature envoyée</span>
                      ) : (
                        <button
                          type="button"
                          className="pill-button pill-button-primary dashboard-small-btn"
                          onClick={() => { setSelectedOffer(offer); setCoverLetter(""); }}
                        >
                          <Send size={14} /> Postuler
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Modale de candidature */}
      {selectedOffer && (
        <div className="modal-overlay" onClick={() => setSelectedOffer(null)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Postuler : {selectedOffer.title}</h3>
              <button type="button" className="modal-close-btn" aria-label="Fermer" onClick={() => setSelectedOffer(null)}>✕</button>
            </div>
            <p className="modal-description">
              {selectedOffer.company} · {selectedOffer.location}
            </p>
            <textarea
              className="access-input recruiter-textarea"
              rows={5}
              placeholder="Lettre de motivation (facultatif)"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
            {d.cvDataUrl ? (
              <p className="modal-description candidate-cv-attached">
                <FileText size={14} /> Votre CV enregistré sera joint à cette candidature.
              </p>
            ) : (
              <p className="modal-description candidate-cv-attached candidate-cv-warning">
                <FileText size={14} /> Astuce : ajoutez votre CV dans l’onglet « Mon profil » pour renforcer vos candidatures.
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="pill-button pill-button-primary"
                disabled={busy}
                onClick={() => apply(selectedOffer)}
              >
                {busy ? "Envoi..." : "Envoyer ma candidature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
