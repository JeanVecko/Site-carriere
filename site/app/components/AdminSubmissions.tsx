"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CalendarPlus, CircleCheck, Clock, ExternalLink, FileText, ImageIcon, Send, Store, XCircle } from "lucide-react";
import { type ExtensionRequest, type PendingProfile, type Submission, API_BASE, adminHeaders, apiRequest, decodeEntities, formatDate } from "../lib/api";

type Notify = (toast: { type: "success" | "error"; text: string }) => void;

/** Rubrique « À valider » : offres préparées par les recruteurs, publiées seulement par l'administrateur. */
export default function AdminSubmissions({
  submissions,
  extensions,
  profiles,
  loading,
  onReview,
  onChange,
  onExtensionsChange,
  onProfilesChange,
  onPublicChange,
  notify,
}: {
  submissions: Submission[];
  extensions: ExtensionRequest[];
  profiles: PendingProfile[];
  loading: boolean;
  onReview: (submission: Submission) => void;
  onChange: (list: Submission[]) => void;
  onExtensionsChange: (list: ExtensionRequest[]) => void;
  onProfilesChange: (list: PendingProfile[]) => void;
  onPublicChange: () => void;
  notify: Notify;
}) {
  const pendingExtensions = extensions.filter((item) => item.status === "pending");

  async function decideProfile(item: PendingProfile, approve: boolean) {
    let reason = "";
    if (!approve) {
      const answer = window.prompt(`Refuser la page de ${item.name} ?\n\nIndiquez le motif : il est envoyé au recruteur.`, "");
      if (answer === null) return;
      reason = answer;
    }
    try {
      await apiRequest(`/admin/profiles/${item.id}/${approve ? "approve" : "reject"}`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(approve ? {} : { reason }),
      });
      onProfilesChange(profiles.filter((entry) => entry.id !== item.id));
      if (approve) onPublicChange();
      notify({ type: "success", text: approve ? `Page de ${item.name} publiée. Le recruteur est prévenu par e-mail.` : "Page refusée. Le recruteur est prévenu par e-mail." });
    } catch (decideError) {
      notify({ type: "error", text: decideError instanceof Error ? decideError.message : "Action impossible." });
    }
  }

  async function approveExtension(item: ExtensionRequest) {
    try {
      const result = await apiRequest<{ deadline: string }>(`/admin/extensions/${item.id}/approve`, { method: "POST", headers: adminHeaders() });
      onExtensionsChange(extensions.map((entry) => (entry.id === item.id ? { ...entry, status: "approved", new_deadline: result.deadline, decided_at: new Date().toISOString() } : entry)));
      onPublicChange();
      notify({ type: "success", text: `Offre prolongée jusqu’au ${formatDate(result.deadline)}. Le recruteur est prévenu par e-mail.` });
    } catch (approveError) {
      notify({ type: "error", text: approveError instanceof Error ? approveError.message : "Validation impossible." });
    }
  }

  async function rejectExtension(item: ExtensionRequest) {
    const reason = window.prompt(`Refuser la prolongation de « ${decodeEntities(item.title)} » ?\n\nIndiquez le motif : il est envoyé au recruteur.`, "");
    if (reason === null) return;
    try {
      await apiRequest(`/admin/extensions/${item.id}/reject`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ reason }) });
      onExtensionsChange(extensions.map((entry) => (entry.id === item.id ? { ...entry, status: "rejected", reject_reason: reason.trim(), decided_at: new Date().toISOString() } : entry)));
      notify({ type: "success", text: "Prolongation refusée. Le recruteur est prévenu par e-mail." });
    } catch (rejectError) {
      notify({ type: "error", text: rejectError instanceof Error ? rejectError.message : "Refus impossible." });
    }
  }

  const pending = submissions.filter((item) => item.status === "pending" || item.status === "publishing");
  const done = submissions.filter((item) => item.status === "published" || item.status === "rejected");

  async function reject(item: Submission) {
    const reason = window.prompt(
      `Refuser « ${decodeEntities(item.title)} » (${item.organization_name}) ?\n\nIndiquez le motif : il est envoyé au recruteur par e-mail pour qu’il puisse corriger son offre.`,
      ""
    );
    if (reason === null) return;
    try {
      await apiRequest(`/admin/submissions/${item.id}/reject`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ reason }) });
      onChange(submissions.map((entry) => (entry.id === item.id ? { ...entry, status: "rejected", reject_reason: reason.trim(), decided_at: new Date().toISOString() } : entry)));
      notify({ type: "success", text: "Proposition refusée. Le recruteur est prévenu par e-mail." });
    } catch (rejectError) {
      notify({ type: "error", text: rejectError instanceof Error ? rejectError.message : "Refus impossible." });
    }
  }

  // Pièce jointe protégée (jeton admin) : récupérée puis ouverte dans un nouvel onglet.
  async function openFile(item: Submission, index: number) {
    const tab = window.open("", "_blank");
    try {
      const response = await fetch(`${API_BASE}/admin/submissions/${item.id}/media/${index}`, { headers: adminHeaders() });
      if (!response.ok) throw new Error("Fichier introuvable.");
      const url = URL.createObjectURL(await response.blob());
      if (tab) tab.location.replace(url);
      else window.open(url, "_blank");
    } catch (fileError) {
      tab?.close();
      notify({ type: "error", text: fileError instanceof Error ? fileError.message : "Ouverture impossible." });
    }
  }

  if (loading && submissions.length === 0) return <p className="adm-empty">Chargement…</p>;

  return (
    <div className="adm-subs">
      <p className="adm-info adm-info-inline">
        <Send size={16} /> Les recruteurs préparent ici leurs offres. Rien n’est publié sans votre validation : relisez, corrigez si besoin, puis publiez.
      </p>

      {profiles.map((item) => (
        <section key={`page-${item.id}`} className="adm-card adm-sub adm-profile-sub">
          <div className="adm-sub-head">
            <div className="adm-profile-head">
              <DraftLogo item={item} />
              <div>
                <span className="adm-sub-org">
                  <Store size={14} /> {item.published ? "Modification de la page entreprise" : "Nouvelle page entreprise"}
                </span>
                <h3>
                  {item.name}
                  {item.verified && <BadgeCheck size={15} className="adm-verified-icon" aria-label="Organisation vérifiée" />}
                </h3>
                <p className="adm-sub-meta">
                  {item.draft.sector}
                  {item.draft.city ? ` · ${item.draft.city}` : ""}
                  {item.draft.website ? ` · ${item.draft.website}` : ""}
                  {item.logo_changed ? " · logo modifié" : ""}
                </p>
              </div>
            </div>
            <span className="adm-sub-when">
              <Clock size={14} aria-hidden="true" /> Envoyée le {formatDate(item.submitted_at)}
              <small>par {item.submitter_email}</small>
            </span>
          </div>
          <p className="adm-sub-desc">{item.draft.description}</p>
          <div className="adm-sub-actions">
            <button type="button" className="adm-btn adm-btn-danger-ghost" onClick={() => void decideProfile(item, false)}>
              <XCircle size={16} /> Refuser
            </button>
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => void decideProfile(item, true)}>
              <CircleCheck size={16} /> Publier la page
            </button>
          </div>
        </section>
      ))}

      {pendingExtensions.length > 0 && (
        <section className="adm-card adm-ext">
          <h3>
            <CalendarPlus size={17} /> Prolongations demandées
          </h3>
          <ul>
            {pendingExtensions.map((item) => (
              <li key={String(item.id)}>
                <div>
                  <strong>{decodeEntities(item.title)}</strong>
                  <small>
                    {item.organization_name}
                    {item.verified ? " ✓" : ""} · date limite {item.deadline ? formatDate(item.deadline) : "non précisée"} · {item.views} vues,{" "}
                    {item.apply_clicks} clics · demandée le {formatDate(item.created_at)}
                  </small>
                </div>
                <span className="adm-ext-days">+{item.days} jours</span>
                <div className="adm-ext-actions">
                  <button type="button" className="adm-btn adm-btn-danger-ghost" onClick={() => void rejectExtension(item)}>
                    <XCircle size={15} /> Refuser
                  </button>
                  <button type="button" className="adm-btn adm-btn-primary" onClick={() => void approveExtension(item)}>
                    <CircleCheck size={15} /> Prolonger
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length === 0 ? (
        <p className="adm-empty">{profiles.length || pendingExtensions.length ? "Aucune nouvelle offre en attente." : "Rien en attente de validation."}</p>
      ) : (
        <ul className="adm-sub-list">
          {pending.map((item) => (
            <li key={String(item.id)} className="adm-card adm-sub">
              <div className="adm-sub-head">
                <div>
                  <span className="adm-sub-org">
                    {item.organization_name}
                    {item.verified && <BadgeCheck size={15} className="adm-verified-icon" aria-label="Organisation vérifiée" />}
                  </span>
                  <h3>{decodeEntities(item.title)}</h3>
                  <p className="adm-sub-meta">
                    {item.category} · {decodeEntities(item.location)}
                    {item.contract_type ? ` · ${item.contract_type}` : ""}
                    {item.deadline ? ` · date limite le ${formatDate(item.deadline)}` : ""}
                  </p>
                </div>
                <span className="adm-sub-when">
                  <Clock size={14} aria-hidden="true" /> Proposée le {formatDate(item.created_at)}
                  <small>par {item.submitter_email}</small>
                </span>
              </div>
              <p className="adm-sub-desc">{decodeEntities(item.description)}</p>
              <dl className="adm-sub-facts">
                <div>
                  <dt>Pour postuler</dt>
                  <dd>{item.apply_contact || "—"}</dd>
                </div>
                {item.salary && (
                  <div>
                    <dt>Salaire / prix</dt>
                    <dd>{item.salary}</dd>
                  </div>
                )}
              </dl>
              {item.media.length > 0 && (
                <div className="adm-sub-files">
                  {item.media.map((file, index) => (
                    <button key={`${file.name}-${index}`} type="button" className="adm-btn adm-btn-ghost" onClick={() => void openFile(item, index)}>
                      {file.type === "application/pdf" ? <FileText size={15} /> : <ImageIcon size={15} />} {file.name} <ExternalLink size={13} />
                    </button>
                  ))}
                </div>
              )}
              <div className="adm-sub-actions">
                <button type="button" className="adm-btn adm-btn-danger-ghost" onClick={() => void reject(item)}>
                  <XCircle size={16} /> Refuser
                </button>
                <button type="button" className="adm-btn adm-btn-primary" onClick={() => onReview(item)}>
                  <CircleCheck size={16} /> Vérifier et publier
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="adm-card adm-sub-history">
          <h3>Traitées ces 30 derniers jours</h3>
          <ul>
            {done.map((item) => (
              <li key={String(item.id)}>
                <span className={`adm-sub-status ${item.status === "published" ? "is-published" : "is-rejected"}`}>
                  {item.status === "published" ? "Publiée" : "Refusée"}
                </span>
                <strong>{decodeEntities(item.title)}</strong>
                <small>
                  {item.organization_name} · {item.decided_at ? formatDate(item.decided_at) : ""}
                  {item.status === "rejected" && item.reject_reason ? ` · motif : ${item.reject_reason}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DraftLogo({ item }: { item: PendingProfile }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!item.draft_has_logo) return;
    let objectUrl = "";
    let cancelled = false;
    fetch(`${API_BASE}/admin/profiles/${item.id}/logo?draft=1`, { headers: adminHeaders() })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.draft_has_logo]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- aperçu du logo proposé
    <img className="adm-profile-logo" src={url} alt={`Logo proposé par ${item.name}`} />
  ) : (
    <span className="adm-profile-logo is-empty" aria-hidden="true">
      <Store size={22} />
    </span>
  );
}
