"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Ban, Building2, CheckCircle2, FileUp, LogOut, RefreshCw, Send, ShieldCheck, Trash2, Users } from "lucide-react";
import {
  Announcement,
  AnnouncementMedia,
  ContactMessage,
  AdminOverview,
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
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
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

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      setOverview(await apiRequest<AdminOverview>("/admin/overview", { headers: adminHeaders() }));
    } catch (error) {
      setOverview(null);
      const message = error instanceof Error ? error.message : "Impossible de charger les comptes inscrits.";
      setOverviewError(message);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const loadTimer = window.setTimeout(() => {
      void loadAnnouncements();
      void loadMessages();
      void loadOverview();
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loggedIn, loadAnnouncements, loadMessages, loadOverview]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await apiRequest<{ token: string; role?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (result.role !== "admin") {
        setLoginFeedback("Ces identifiants correspondent à un compte utilisateur, pas au superadmin.");
        return;
      }
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
      const mediaInput = form.elements.namedItem("media") as HTMLInputElement | null;
      const media = await filesToMedia(mediaInput?.files || null);
      const formValues = Object.fromEntries(new FormData(form));
      await apiRequest("/announcements", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ ...formValues, description: formValues.description || "", media }),
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

  async function updateUserStatus(id: number, status: "active" | "suspended") {
    try {
      const updated = await apiRequest<{ id: number; account_status: "active" | "suspended" }>(`/admin/users/${id}/status`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status }),
      });
      setOverview((current) => current ? {
        ...current,
        users: current.users.map((user) => user.id === id ? { ...user, account_status: updated.account_status } : user),
      } : current);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Impossible de modifier le statut du compte.");
    }
  }

  async function deleteUser(id: number, email: string) {
    if (!window.confirm(`Supprimer définitivement le compte ${email} ? Cette action est irréversible.`)) return;
    try {
      await apiRequest(`/admin/users/${id}`, { method: "DELETE", headers: adminHeaders() });
      setOverview((current) => current ? { ...current, users: current.users.filter((user) => user.id !== id) } : current);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Impossible de supprimer le compte.");
    }
  }

  async function updateOrganizationStatus(id: number, status: "active" | "suspended") {
    try {
      const updated = await apiRequest<{ id: number; account_status: "active" | "suspended" }>(`/admin/organizations/${id}/status`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status }),
      });
      setOverview((current) => current ? {
        ...current,
        organizations: current.organizations.map((organization) => organization.id === id ? { ...organization, account_status: updated.account_status } : organization),
      } : current);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Impossible de modifier l’accès de la société.");
    }
  }

  async function sendPaymentReminder(id: number) {
    try {
      const result = await apiRequest<{ message: string }>(`/admin/organizations/${id}/payment-reminder`, {
        method: "POST",
        headers: adminHeaders(),
      });
      setAdminFeedback(result.message);
    } catch (error) {
      setAdminFeedback(error instanceof Error ? error.message : "Impossible d’envoyer le rappel de paiement.");
    }
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
          <h1 id="dashboard-title">Centre de <em>contrôle.</em></h1>
          <p className="admin-dashboard-subtitle">Superadmin · comptes, organisations et activité de la plateforme</p>
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
      {overviewLoading && <p className="admin-overview-status">Chargement des comptes inscrits...</p>}
      {overviewError && (
        <div className="admin-overview-error" role="alert">
          <strong>Les comptes inscrits ne sont pas disponibles.</strong>
          <span>{overviewError}</span>
          <button type="button" className="refresh-button" onClick={() => void loadOverview()}><RefreshCw size={13} /> Réessayer</button>
        </div>
      )}
      {overview && (
        <section className="admin-command-center" aria-labelledby="admin-overview-title">
          <div className="admin-command-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-line"></span> Vue globale</p>
              <h2 id="admin-overview-title">Les inscrits de la plateforme</h2>
            </div>
            <button type="button" className="refresh-button" onClick={() => void loadOverview()}><RefreshCw size={13} /> Actualiser</button>
          </div>
          <div className="admin-stat-grid">
            <div className="admin-stat-card"><Users size={20} /><strong>{overview.users.length}</strong><span>Comptes inscrits</span></div>
            <div className="admin-stat-card"><Building2 size={20} /><strong>{overview.organizations.length}</strong><span>Organisations</span></div>
            <div className="admin-stat-card"><ShieldCheck size={20} /><strong>{overview.users.filter((user) => user.email_verified_at).length}</strong><span>E-mails vérifiés</span></div>
            <div className="admin-stat-card"><Send size={20} /><strong>{overview.invitations.filter((invitation) => !invitation.accepted_at).length}</strong><span>Invitations en attente</span></div>
          </div>
          <div className="admin-command-grid">
            <div className="admin-data-panel">
              <div className="admin-panel-title"><h3>Comptes inscrits</h3><span>{overview.users.length}</span></div>
              <div className="admin-table-list">
                {overview.users.length === 0 ? <p className="admin-empty-state">Aucun compte inscrit.</p> : overview.users.map((user) => (
                  <div className="admin-table-row" key={user.id}>
                    <div><strong>{user.email}</strong><span>{user.role}{user.organization_role ? ` · ${user.organization_role}` : ""}</span></div>
                    <div><span>{user.organization_name || "Sans organisation"}</span><small className={user.email_verified_at ? "is-verified" : "is-pending"}>{user.email_verified_at ? "Vérifié" : "Non vérifié"}</small></div>
                    <div className="admin-user-actions">
                      <button type="button" className={`admin-status-button ${user.account_status === "suspended" ? "is-suspended" : ""}`} onClick={() => void updateUserStatus(user.id, user.account_status === "active" ? "suspended" : "active")} title={user.account_status === "active" ? "Suspendre le compte" : "Réactiver le compte"}>
                        {user.account_status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        {user.account_status === "active" ? "Suspendre" : "Réactiver"}
                      </button>
                      <button type="button" className="admin-delete-user" onClick={() => void deleteUser(user.id, user.email)} title="Supprimer définitivement le compte"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-data-panel">
              <div className="admin-panel-title"><h3>Organisations</h3><span>{overview.organizations.length}</span></div>
              <div className="admin-table-list">
                {overview.organizations.length === 0 ? <p className="admin-empty-state">Aucune organisation.</p> : overview.organizations.map((organization) => (
                  <div className="admin-table-row" key={organization.id}>
                    <div><strong>{organization.name}</strong><span>{organization.member_count} membre(s) · {organization.owner_email || "Propriétaire inconnu"}</span></div>
                    <div><small>Plan {organization.plan} · {organization.plan_status}</small><small className={organization.account_status === "active" ? "is-verified" : "is-pending"}>{organization.account_status === "active" ? "Accès actif" : "Accès suspendu"}</small></div>
                    <div className="admin-user-actions">
                      <button type="button" className={`admin-status-button ${organization.account_status === "suspended" ? "is-suspended" : ""}`} onClick={() => void updateOrganizationStatus(organization.id, organization.account_status === "active" ? "suspended" : "active")} title={organization.account_status === "active" ? "Suspendre l’accès de la société" : "Réactiver la société"}>
                        {organization.account_status === "active" ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        {organization.account_status === "active" ? "Suspendre accès" : "Réactiver"}
                      </button>
                      <button type="button" className="admin-payment-button" onClick={() => void sendPaymentReminder(organization.id)} title="Envoyer un rappel de paiement"><Send size={14} /> Rappeler paiement</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
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
            Description (facultative)
            <textarea
              name="description"
              rows={4}
              placeholder="Quelques mots sur l'opportunité..."
            ></textarea>
          </label>
          <label className="media-upload">
            Document scanné ou image (facultatif si une description est ajoutée)
            <span className="media-upload-control">
              <FileUp size={17} />
              <input name="media" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple />
            </span>
            <small>JPG, PNG, WEBP ou PDF — les images sont compressées automatiquement (4 Mo au total).</small>
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
                  {item.media && item.media.length > 0 && <p className="media-status">Document{item.media.length > 1 ? "s" : ""} joint{item.media.length > 1 ? "s" : ""} : {item.media.length}</p>}
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

const ALLOWED_MEDIA_TYPES = new Set<AnnouncementMedia["type"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

async function filesToMedia(files: FileList | null): Promise<AnnouncementMedia[]> {
  const selectedFiles = Array.from(files || []);
  if (selectedFiles.some((file) => !ALLOWED_MEDIA_TYPES.has(file.type as AnnouncementMedia["type"]))) {
    throw new Error("Utilisez uniquement des fichiers JPG, PNG, WEBP ou PDF.");
  }

  const media = await Promise.all(selectedFiles.map(async (file) => {
    if (file.type.startsWith("image/")) return optimizeImage(file);
    return { name: file.name, type: file.type as AnnouncementMedia["type"], dataUrl: await readAsDataUrl(file) };
  }));
  const encodedSize = media.reduce((total, file) => total + file.dataUrl.length, 0);
  if (encodedSize > 5_500_000) throw new Error("La taille totale des images ne doit pas dépasser 4 Mo après compression.");
  return media;
}

async function optimizeImage(file: File): Promise<AnnouncementMedia> {
  const source = await loadImage(file);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de préparer l’image.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  return { name: file.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", dataUrl };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de lire l’image sélectionnée."));
    image.src = URL.createObjectURL(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
