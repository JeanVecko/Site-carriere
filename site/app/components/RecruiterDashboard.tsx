"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Copy, LogOut, Plus, RefreshCw, Trash2, UserMinus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest, getSession, clearSession, userHeaders } from "../lib/api";

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  created_at: string;
};

type ReceivedApplication = {
  id: number;
  status: string;
  cover_letter: string;
  created_at: string;
  announcement_id: number;
  title: string;
  candidat_email: string;
  candidat_data: {
    prenom?: string;
    nom?: string;
    telephone?: string;
    civilite?: string;
    fonction?: string;
  };
};

type Organization = {
  organization: {
    id: number;
    name: string;
    invite_code: string;
    plan: "free" | "pro" | "enterprise";
    plan_status: "active" | "past_due" | "canceled";
    plan_limits: { activeJobs: number; members: number };
  };
  members: Array<{
    id: number;
    email: string;
    organization_role: "owner" | "member";
    created_at: string;
  }>;
};

const STATUSES = ["En attente", "Examinée", "Acceptée", "Refusée"];

const STATUS_CLASS: Record<string, string> = {
  "En attente": "status-pending",
  "Examinée": "status-review",
  "Acceptée": "status-accepted",
  "Refusée": "status-rejected",
};

export default function RecruiterDashboard() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [received, setReceived] = useState<ReceivedApplication[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Formulaire de publication
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [myJobs, apps, organizationData] = await Promise.all([
        apiRequest<Job[]>("/my/jobs", { headers: userHeaders() }),
        apiRequest<ReceivedApplication[]>("/my/applications/received", { headers: userHeaders() }),
        apiRequest<Organization>("/my/organization", { headers: userHeaders() }),
      ]);
      setJobs(Array.isArray(myJobs) ? myJobs : []);
      setReceived(Array.isArray(apps) ? apps : []);
      setOrganization(organizationData);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "recruteur") {
      router.push("/connexion");
      return;
    }
    (async () => {
      setEmail(session.email);
      await loadData();
      setChecking(false);
    })();
  }, [loadData, router]);

  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPublishing(true);
    setMessage(null);
    try {
      await apiRequest("/my/jobs", {
        method: "POST",
        headers: userHeaders(),
        body: JSON.stringify({ title, location, description }),
      });
      setMessage({ type: "success", text: `L’offre « ${title} » a été publiée !` });
      setTitle("");
      setLocation("");
      setDescription("");
      loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "La publication a échoué.",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function removeJob(id: number) {
    try {
      await apiRequest(`/my/jobs/${id}`, { method: "DELETE", headers: userHeaders() });
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {
      // silencieux
    }
  }

  async function copyInviteCode() {
    if (!organization) return;
    await navigator.clipboard.writeText(organization.organization.invite_code);
    setMessage({ type: "success", text: "Code d’invitation copié." });
  }

  async function regenerateInviteCode() {
    try {
      const result = await apiRequest<{ invite_code: string }>("/my/organization/invite-code", {
        method: "POST",
        headers: userHeaders(),
      });
      setOrganization((current) => current ? {
        ...current,
        organization: { ...current.organization, invite_code: result.invite_code },
      } : current);
      setMessage({ type: "success", text: "Nouveau code d’invitation généré." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "La régénération a échoué." });
    }
  }

  async function removeMember(memberId: number) {
    try {
      await apiRequest(`/my/organization/members/${memberId}`, {
        method: "DELETE",
        headers: userHeaders(),
      });
      setOrganization((current) => current ? {
        ...current,
        members: current.members.filter((member) => member.id !== memberId),
      } : current);
      setMessage({ type: "success", text: "Le membre a été retiré de l’organisation." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Le retrait a échoué." });
    }
  }

  async function setStatus(id: number, status: string) {
    try {
      await apiRequest(`/my/applications/received/${id}`, {
        method: "PATCH",
        headers: userHeaders(),
        body: JSON.stringify({ status }),
      });
      setReceived((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
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

  const isOrganizationOwner = organization?.members.some(
    (member) => member.email === email && member.organization_role === "owner"
  ) || false;

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Espace Recruteur</h1>
          <p className="dashboard-email">{email}</p>
        </div>
        <div className="dashboard-header-actions">
          <Link href="/offres" className="dashboard-link-btn">Voir le site</Link>
          <button type="button" className="dashboard-logout-btn" onClick={logout}>
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      {message && (
        <div className={`form-feedback-message ${message.type}`} role="alert">{message.text}</div>
      )}

      {organization && (
        <section className="dashboard-section">
          <h2><Building2 size={18} /> {organization.organization.name}</h2>
          <p className="dashboard-plan-label">Plan {organization.organization.plan} · {organization.organization.plan_status === "active" ? "Actif" : "À vérifier"}</p>
          <div className="dashboard-team-invite">
            <div>
              <strong>Inviter un recruteur</strong>
              <p>Partagez ce code pour rejoindre l’espace de votre organisation.</p>
            </div>
            <div className="dashboard-team-actions">
              <button type="button" className="dashboard-code-button" onClick={copyInviteCode} title="Copier le code d’invitation">
                <code>{organization.organization.invite_code}</code>
                <Copy size={15} />
              </button>
              {isOrganizationOwner && (
                <button type="button" className="dashboard-icon-btn" onClick={regenerateInviteCode} title="Régénérer le code d’invitation">
                  <RefreshCw size={15} />
                </button>
              )}
            </div>
          </div>
          <ul className="dashboard-list">
            {organization.members.map((member) => (
              <li key={member.id} className="dashboard-item">
                <div className="dashboard-item-main">
                  <strong>{member.email}</strong>
                  <span>{member.organization_role === "owner" ? "Propriétaire" : "Membre"}</span>
                </div>
                {isOrganizationOwner && member.organization_role === "member" && (
                  <button type="button" className="dashboard-icon-btn" onClick={() => removeMember(member.id)} title="Retirer ce membre">
                    <UserMinus size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Publier une offre */}
      <section className="dashboard-section">
        <h2><Plus size={18} /> Publier une nouvelle offre</h2>
        <form className="dashboard-publish-form" onSubmit={publish}>
          <div className="dashboard-form-grid">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Intitulé du poste *"
              required
              className="access-input"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu (ex: Kinshasa · Hybride) *"
              required
              className="access-input"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description du poste, missions et profil recherché... *"
            rows={4}
            required
            className="access-input recruiter-textarea"
          />
          <button type="submit" className="pill-button pill-button-primary" disabled={publishing}>
            {publishing ? "Publication..." : "Publier l’offre"}
          </button>
        </form>
      </section>

      {/* Mes offres */}
      <section className="dashboard-section">
        <h2><BriefcaseIcon /> Mes offres publiées ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="dashboard-empty">Vous n’avez publié aucune offre pour le moment.</p>
        ) : (
          <ul className="dashboard-list">
            {jobs.map((job) => (
              <li key={job.id} className="dashboard-item">
                <div className="dashboard-item-main">
                  <strong>{job.title}</strong>
                  <span>{job.company} · {job.location}</span>
                  <small>Publiée le {new Date(job.created_at).toLocaleDateString("fr-FR")}</small>
                </div>
                <div className="dashboard-item-actions">
                  <span className="status-badge status-review">
                    {received.filter((a) => a.announcement_id === job.id).length} candidature(s)
                  </span>
                  <button type="button" className="dashboard-icon-btn" title="Supprimer" onClick={() => removeJob(job.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Candidatures reçues */}
      <section className="dashboard-section">
        <h2><Users size={18} /> Candidatures reçues ({received.length})</h2>
        {received.length === 0 ? (
          <p className="dashboard-empty">Aucune candidature reçue pour le moment.</p>
        ) : (
          <ul className="dashboard-list">
            {received.map((app) => (
              <li key={app.id} className="dashboard-item dashboard-received">
                <div className="dashboard-item-main">
                  <strong>
                    {[app.candidat_data?.civilite, app.candidat_data?.prenom, app.candidat_data?.nom].filter(Boolean).join(" ") || app.candidat_email}
                  </strong>
                  <span>Poste : {app.title}</span>
                  <small>{app.candidat_email}{app.candidat_data?.telephone ? ` · ${app.candidat_data.telephone}` : ""} · {new Date(app.created_at).toLocaleDateString("fr-FR")}</small>
                  {app.cover_letter && <em className="dashboard-cover">« {app.cover_letter} »</em>}
                </div>
                <div className="dashboard-item-actions">
                  <select
                    value={app.status}
                    onChange={(e) => setStatus(app.id, e.target.value)}
                    className={`status-select ${STATUS_CLASS[app.status] || "status-pending"}`}
                    aria-label="Changer le statut"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-3px", marginRight: "4px" }}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
