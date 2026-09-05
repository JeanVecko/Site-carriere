"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, LogOut, Send, Trash2, CheckCircle } from "lucide-react";
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

const STATUS_CLASS: Record<string, string> = {
  "En attente": "status-pending",
  "Examinée": "status-review",
  "Acceptée": "status-accepted",
  "Refusée": "status-rejected",
};

export default function CandidateDashboard() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
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
      window.location.href = "/connexion";
      return;
    }
    setEmail(session.email);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (checking) return;
    loadData();
    loadOffers();
  }, [checking, loadData, loadOffers]);

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
      loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "L’envoi a échoué.",
      });
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
    window.location.href = "/";
  }

  if (checking) {
    return <main className="dashboard-page"><p className="dashboard-loading">Chargement de votre espace...</p></main>;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Espace Candidat</h1>
          <p className="dashboard-email">{email}</p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/offres" className="dashboard-link-btn">Voir toutes les offres</Link>
          <button type="button" className="dashboard-logout-btn" onClick={logout}>
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      {message && (
        <div className={`form-feedback-message ${message.type}`} role="alert">{message.text}</div>
      )}

      {/* Mes candidatures */}
      <section className="dashboard-section">
        <h2><CheckCircle size={18} /> Suivi de mes candidatures ({applications.length})</h2>
        {applications.length === 0 ? (
          <p className="dashboard-empty">Vous n’avez pas encore de candidature. Postulez à une offre ci-dessous !</p>
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

      {/* Offres disponibles */}
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
