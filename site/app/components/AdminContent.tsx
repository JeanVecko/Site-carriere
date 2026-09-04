"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, LogOut, RefreshCw, Send, Trash2 } from "lucide-react";
import {
  Announcement,
  ContactMessage,
  adminHeaders,
  apiRequest,
  escapeHtml,
} from "../lib/api";

export default function AdminContent() {
  const [loggedIn, setLoggedIn] = useState(
    () => typeof window !== "undefined" && Boolean(sessionStorage.getItem("carrieres-admin-token"))
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loginFeedback, setLoginFeedback] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncements(await apiRequest<Announcement[]>("/announcements", { headers: adminHeaders() }));
    } catch {
      setAnnouncements(JSON.parse(localStorage.getItem("carrieres-rdc-announcements") || "[]"));
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setMessages(await apiRequest<ContactMessage[]>("/messages", { headers: adminHeaders() }));
    } catch {
      setMessages(JSON.parse(localStorage.getItem("carrieres-rdc-messages") || "[]"));
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const loadTimer = window.setTimeout(() => {
      void loadAnnouncements();
      void loadMessages();
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loggedIn, loadAnnouncements, loadMessages]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await apiRequest<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      sessionStorage.setItem("carrieres-admin-token", result.token);
      setLoggedIn(true);
      setLoginFeedback("");
    } catch (error) {
      setLoginFeedback(error instanceof Error ? error.message : "Identifiants incorrects ou API indisponible.");
    }
  }

  async function handlePublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await apiRequest("/announcements", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      setAdminFeedback("Annonce publiée avec succès.");
      await loadAnnouncements();
    } catch (error) {
      setAdminFeedback(
        error instanceof Error ? error.message : "Impossible de publier. Vérifiez la connexion au serveur."
      );
    }
  }

  async function deleteAnnouncement(id?: number | string) {
    if (!id) return;
    try {
      await apiRequest(`/announcements/${id}`, { method: "DELETE", headers: adminHeaders() });
    } catch {
      return;
    }
    loadAnnouncements();
  }

  async function deleteMessage(id?: number | string) {
    if (!id) return;
    try {
      await apiRequest(`/messages/${id}`, { method: "DELETE", headers: adminHeaders() });
    } catch {
      return;
    }
    loadMessages();
  }

  if (!loggedIn) {
    return (
      <section className="admin-login" id="login-view" aria-labelledby="login-title">
        <p className="eyebrow">
          <span className="eyebrow-line"></span> Accès privé
        </p>
        <h1 id="login-title">
          Bonjour,
          <br />
          <em>administrateur.</em>
        </h1>
        <p className="admin-lead">
          Connectez-vous pour gérer les annonces publiées sur Carrières RDC.
        </p>
        <form id="login-form" className="admin-form" onSubmit={handleLogin}>
          <label>
            Adresse e-mail
            <input
              id="email-input"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="admin@carrieresrdc.cd"
            />
          </label>
          <label>
            Mot de passe
            <input
              id="password-input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Votre mot de passe"
            />
          </label>
          <button className="button button-dark" type="submit">
            Ouvrir le panneau <ArrowRight size={16} />
          </button>
          <p className="form-feedback error-feedback" id="login-feedback" role="alert">
            {loginFeedback}
          </p>
        </form>
        <p className="demo-hint">
          Utilisez l’adresse e-mail et le mot de passe définis dans les variables Render.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard" id="dashboard-view" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line"></span> Tableau de bord
          </p>
          <h1 id="dashboard-title">
            Vos <em>annonces.</em>
          </h1>
        </div>
        <button
          className="text-button"
          id="logout-button"
          type="button"
          onClick={() => {
            sessionStorage.removeItem("carrieres-admin-token");
            setLoggedIn(false);
          }}
        >
          Se déconnecter <LogOut size={15} />
        </button>
      </div>
      <div className="dashboard-grid">
        <form className="publish-form admin-publish-form" id="admin-form" onSubmit={handlePublish}>
          <div className="form-topline">
            <span>Nouvelle annonce</span>
            <span id="announcement-count">{announcements.length} en ligne</span>
          </div>
          <label>
            Titre de l’annonce
            <input name="title" type="text" placeholder="Ex. Designer graphique indépendant" required />
          </label>
          <div className="form-row">
            <label>
              Catégorie
              <select name="category">
                <option>Offre d’emploi</option>
                <option>Annonce</option>
                <option>Appel d’offre</option>
              </select>
            </label>
            <label>
              Localisation
              <input name="location" type="text" placeholder="Ex. Kinshasa · Hybride" required />
            </label>
          </div>
          <label>
            Nom de l’organisation
            <input name="company" type="text" placeholder="Ex. Atelier Nord" required />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={4}
              placeholder="Quelques mots sur l'opportunité..."
              required
            ></textarea>
          </label>
          <button className="button button-light" type="submit">
            Publier l’annonce <Send size={16} />
          </button>
          <p className="form-feedback" id="admin-feedback" role="status">
            {adminFeedback}
          </p>
        </form>
        <div className="manage-list">
          <div className="manage-list-heading">
            <span>Annonces en ligne</span>
            <span className="live-dot">● En direct</span>
          </div>
          <div id="admin-list">
            {announcements.map((item) => (
              <article className="manage-item" key={String(item.id ?? item.title)}>
                <div>
                  <span className="tag">{escapeHtml(item.category || item.type || "")}</span>
                  <h3>{escapeHtml(item.title)}</h3>
                  <p>
                    {escapeHtml(item.company)} · {escapeHtml(item.location)}
                  </p>
                </div>
                <button
                  className="delete-button"
                  type="button"
                  aria-label={`Supprimer ${item.title}`}
                  onClick={() => deleteAnnouncement(item.id)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
      <section className="inbox-section" aria-labelledby="inbox-title">
        <div className="manage-list-heading">
          <span id="inbox-title">Messages reçus</span>
          <span className="inbox-actions">
            <span id="message-count" className="live-dot">
              {messages.length} message{messages.length > 1 ? "s" : ""}
            </span>
            <button
              className="refresh-button"
              id="refresh-messages"
              type="button"
              onClick={loadMessages}
            >
              <RefreshCw size={13} /> Actualiser
            </button>
          </span>
        </div>
        <div id="message-list" className="message-list">
          {messages.map((message) => (
            <article className="message-item" key={String(message.id ?? message.email)}>
              <div className="message-topline">
                <strong>{escapeHtml(message.name)}</strong>
                <span>{escapeHtml(message.created_at || message.date || "")}</span>
              </div>
              <a href={`mailto:${escapeHtml(message.email)}`}>{escapeHtml(message.email)}</a>
              <h3>{escapeHtml(message.subject)}</h3>
              <p>{escapeHtml(message.message)}</p>
              <button
                className="delete-button"
                type="button"
                onClick={() => deleteMessage(message.id)}
              >
                Supprimer <Trash2 size={13} />
              </button>
            </article>
          ))}
        </div>
        <p className="empty-inbox" id="empty-inbox" hidden={messages.length > 0}>
          Aucun message reçu pour le moment.
        </p>
      </section>
    </section>
  );
}
