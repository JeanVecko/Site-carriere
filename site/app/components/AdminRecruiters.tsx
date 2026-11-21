"use client";

import { useState } from "react";
import { Ban, BadgeCheck, Building2, CircleCheck, Copy, KeyRound, Link2, MailCheck, MailX, Send, Store, Trash2, TriangleAlert, UserPlus } from "lucide-react";
import AdminCompanyProfile from "./AdminCompanyProfile";
import { Recruiter, adminHeaders, apiRequest, formatDate } from "../lib/api";

type Notify = (toast: { type: "success" | "error"; text: string }) => void;
type AccessLink = { recruiter: Recruiter; link: string; emailed: boolean; emailError: string };

// Rubrique « Recruteurs » de l'admin : ouverture des espaces recruteur sur invitation, liens d'accès, suspension.
export default function AdminRecruiters({
  recruiters,
  loading,
  onChange,
  notify,
}: {
  recruiters: Recruiter[];
  loading: boolean;
  onChange: (list: Recruiter[]) => void;
  notify: Notify;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<AccessLink | null>(null);
  const [editingPage, setEditingPage] = useState<Recruiter | null>(null);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setError("");
    try {
      const result = await apiRequest<{ recruiter: Recruiter; link: string; emailed: boolean; email_error: string }>("/admin/recruiters", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          organization: values.get("organization"),
          contact: values.get("contact"),
          email: values.get("email"),
          send_email: values.get("send_email") === "on",
        }),
      });
      onChange([...recruiters, result.recruiter].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setAccess({ recruiter: result.recruiter, link: result.link, emailed: result.emailed, emailError: result.email_error });
      form.reset();
      notify({ type: "success", text: `Espace créé pour ${result.recruiter.name}.` });
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Création impossible.");
    } finally {
      setPending(false);
    }
  }

  async function newLink(recruiter: Recruiter, sendEmail: boolean) {
    try {
      const result = await apiRequest<{ link: string; emailed: boolean; email_error: string }>(`/admin/recruiters/${recruiter.id}/link`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ send_email: sendEmail }),
      });
      setAccess({ recruiter, link: result.link, emailed: result.emailed, emailError: result.email_error });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (linkError) {
      notify({ type: "error", text: linkError instanceof Error ? linkError.message : "Lien impossible à créer." });
    }
  }

  async function setStatus(recruiter: Recruiter, status: "active" | "suspended") {
    if (status === "suspended" && !window.confirm(`Suspendre l’accès de ${recruiter.name} ? Le recruteur ne pourra plus se connecter ; ses offres restent en ligne.`)) return;
    try {
      const updated = await apiRequest<Recruiter>(`/admin/recruiters/${recruiter.id}/status`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status }),
      });
      onChange(recruiters.map((entry) => (entry.id === recruiter.id ? updated : entry)));
      notify({ type: "success", text: status === "active" ? "Accès réactivé." : "Accès suspendu." });
    } catch (statusError) {
      notify({ type: "error", text: statusError instanceof Error ? statusError.message : "Modification impossible." });
    }
  }

  // Vérification de l'organisation (documents d'enregistrement contrôlés) : badge « Vérifiée » sur ses offres.
  async function toggleVerified(recruiter: Recruiter) {
    const verified = !recruiter.verified_at;
    let note = "";
    if (verified) {
      const answer = window.prompt(
        `Marquer « ${recruiter.name} » comme organisation vérifiée.\n\nNotez ce que vous avez contrôlé (document, numéro d’enregistrement, appel…). Cette note n’est visible que dans l’admin.`,
        ""
      );
      if (answer === null) return;
      note = answer;
    } else if (!window.confirm(`Retirer le badge « Vérifiée » de ${recruiter.name} ?`)) {
      return;
    }
    try {
      const updated = await apiRequest<Recruiter>(`/admin/recruiters/${recruiter.id}/verification`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ verified, note }),
      });
      onChange(recruiters.map((entry) => (entry.id === recruiter.id ? updated : entry)));
      void fetch("/api/revalidate", { method: "POST", headers: adminHeaders() }).catch(() => undefined);
      notify({ type: "success", text: verified ? `${recruiter.name} est marquée comme vérifiée.` : "Badge « Vérifiée » retiré." });
    } catch (verifyError) {
      notify({ type: "error", text: verifyError instanceof Error ? verifyError.message : "Modification impossible." });
    }
  }

  async function toggleReports(recruiter: Recruiter) {
    const enabled = recruiter.auto_reports === false;
    try {
      const updated = await apiRequest<Recruiter>(`/admin/recruiters/${recruiter.id}/auto-reports`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ enabled }),
      });
      onChange(recruiters.map((entry) => (entry.id === recruiter.id ? updated : entry)));
      notify({ type: "success", text: enabled ? "Bilans automatiques activés." : "Bilans automatiques désactivés." });
    } catch (toggleError) {
      notify({ type: "error", text: toggleError instanceof Error ? toggleError.message : "Modification impossible." });
    }
  }

  async function remove(recruiter: Recruiter) {
    if (!window.confirm(`Supprimer l’espace de ${recruiter.name} ? Le compte est effacé définitivement ; ses offres restent publiées, sans rattachement.`)) return;
    try {
      await apiRequest(`/admin/recruiters/${recruiter.id}`, { method: "DELETE", headers: adminHeaders() });
      onChange(recruiters.filter((entry) => entry.id !== recruiter.id));
      if (access?.recruiter.id === recruiter.id) setAccess(null);
      notify({ type: "success", text: "Espace recruteur supprimé." });
    } catch (removeError) {
      notify({ type: "error", text: removeError instanceof Error ? removeError.message : "Suppression impossible." });
    }
  }

  return (
    <>
      {access && <AccessLinkCard access={access} onClose={() => setAccess(null)} />}

      <form className="adm-card adm-publish" onSubmit={invite}>
        <p className="adm-info adm-info-inline">
          <Building2 size={16} /> Seuls les recruteurs que vous invitez ont un espace. Ils y suivent les statistiques des offres
          que vous leur rattachez (dans le formulaire de l’offre) et peuvent vous proposer de nouvelles offres. Vous restez
          le seul à publier. Le lendemain de la date limite d’une offre, le recruteur reçoit son bilan par e-mail.
        </p>
        <fieldset>
          <legend>Ouvrir un espace recruteur</legend>
          <div className="adm-row adm-row-3">
            <label className="adm-field">
              <span>Société ou organisation *</span>
              <input name="organization" type="text" required maxLength={120} placeholder="Ex. Banque du Kivu" />
            </label>
            <label className="adm-field">
              <span>Nom du contact</span>
              <input name="contact" type="text" maxLength={120} placeholder="Ex. Mme Mbuyi" />
            </label>
            <label className="adm-field">
              <span>E-mail du contact *</span>
              <input name="email" type="email" required maxLength={160} placeholder="rh@exemple.cd" />
            </label>
          </div>
          <label className="adm-check">
            <input name="send_email" type="checkbox" /> Envoyer aussi le lien d’accès par e-mail
          </label>
        </fieldset>
        {error && (
          <p className="adm-alert adm-alert-error" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        <div className="adm-form-actions">
          <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>
            <UserPlus size={16} /> {pending ? "Création…" : "Créer l’accès"}
          </button>
        </div>
      </form>

      <section className="adm-card adm-card-flush">
        {loading && recruiters.length === 0 ? (
          <p className="adm-empty">Chargement…</p>
        ) : recruiters.length === 0 ? (
          <p className="adm-empty">Aucun espace recruteur pour le moment.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Recruteur</th>
                  <th>État</th>
                  <th className="adm-num">Offres</th>
                  <th className="adm-num">Vues</th>
                  <th className="adm-num">Clics « Postuler »</th>
                  <th>Vérification</th>
                  <th>Bilan auto</th>
                  <th className="adm-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map((recruiter) => {
                  const suspended = recruiter.account_status !== "active";
                  return (
                    <tr key={String(recruiter.id)}>
                      <td>
                        <strong>
                          {recruiter.name}
                          {recruiter.verified_at && <BadgeCheck size={15} className="adm-verified-icon" aria-label="Vérifiée" />}
                        </strong>
                        <span>
                          {recruiter.contact ? `${recruiter.contact} · ` : ""}
                          {recruiter.email || "Aucun contact"}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-status ${suspended ? "is-hidden" : recruiter.activated_at ? "is-open" : "is-grace"}`}>
                          {suspended ? "Suspendu" : recruiter.activated_at ? "Actif" : "Invitation en attente"}
                        </span>
                        <small>
                          {recruiter.last_login_at
                            ? `Dernière connexion le ${formatDate(recruiter.last_login_at)}`
                            : `Créé le ${formatDate(recruiter.created_at)}`}
                        </small>
                      </td>
                      <td className="adm-num">{recruiter.offers}</td>
                      <td className="adm-num">{Number(recruiter.views || 0).toLocaleString("fr-FR")}</td>
                      <td className="adm-num">{Number(recruiter.applies || 0).toLocaleString("fr-FR")}</td>
                      <td>
                        <button
                          type="button"
                          className={`adm-toggle${recruiter.verified_at ? " is-on" : ""}`}
                          onClick={() => void toggleVerified(recruiter)}
                          title={recruiter.verified_at ? `Vérifiée le ${formatDate(recruiter.verified_at)}${recruiter.verification_note ? ` : ${recruiter.verification_note}` : ""}` : "Marquer comme vérifiée après contrôle des documents"}
                          aria-pressed={Boolean(recruiter.verified_at)}
                        >
                          <BadgeCheck size={15} />
                          {recruiter.verified_at ? "Vérifiée" : "Non vérifiée"}
                        </button>
                        {recruiter.verification_note && <small className="adm-verify-note">{recruiter.verification_note}</small>}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`adm-toggle${recruiter.auto_reports === false ? "" : " is-on"}`}
                          onClick={() => void toggleReports(recruiter)}
                          title="Bilan envoyé par e-mail le lendemain de la date limite de chaque offre"
                          aria-pressed={recruiter.auto_reports !== false}
                        >
                          {recruiter.auto_reports === false ? <MailX size={15} /> : <MailCheck size={15} />}
                          {recruiter.auto_reports === false ? "Désactivé" : "Activé"}
                        </button>
                      </td>
                      <td className="adm-actions-col">
                        <button
                          type="button"
                          className={`adm-icon-btn${recruiter.has_profile ? " is-accent" : ""}`}
                          onClick={() => setEditingPage(recruiter)}
                          title={recruiter.has_profile ? "Page entreprise en ligne : modifier" : recruiter.profile_pending ? "Page entreprise proposée (voir « À valider »)" : "Créer la page entreprise"}
                          aria-label={`Page entreprise de ${recruiter.name}`}
                        >
                          <Store size={16} />
                        </button>
                        {recruiter.user_id && (
                          <button
                            type="button"
                            className="adm-icon-btn is-accent"
                            onClick={() => void newLink(recruiter, false)}
                            title="Nouveau lien d’accès (mot de passe oublié, lien expiré)"
                            aria-label={`Nouveau lien d’accès pour ${recruiter.name}`}
                          >
                            <KeyRound size={16} />
                          </button>
                        )}
                        {recruiter.user_id && (
                          <button
                            type="button"
                            className="adm-icon-btn"
                            onClick={() => void newLink(recruiter, true)}
                            title="Envoyer un nouveau lien par e-mail"
                            aria-label={`Envoyer un nouveau lien par e-mail à ${recruiter.name}`}
                          >
                            <Send size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="adm-icon-btn"
                          onClick={() => void setStatus(recruiter, suspended ? "active" : "suspended")}
                          title={suspended ? "Réactiver l’accès" : "Suspendre l’accès"}
                          aria-label={`${suspended ? "Réactiver" : "Suspendre"} ${recruiter.name}`}
                        >
                          {suspended ? <CircleCheck size={16} /> : <Ban size={16} />}
                        </button>
                        <button
                          type="button"
                          className="adm-icon-btn is-danger"
                          onClick={() => void remove(recruiter)}
                          title="Supprimer l’espace"
                          aria-label={`Supprimer l’espace de ${recruiter.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {editingPage && (
          <AdminCompanyProfile
            recruiter={editingPage}
            notify={notify}
            onClose={() => setEditingPage(null)}
            onSaved={(published) => {
              onChange(recruiters.map((entry) => (entry.id === editingPage.id ? { ...entry, has_profile: published } : entry)));
              void fetch("/api/revalidate", { method: "POST", headers: adminHeaders() }).catch(() => undefined);
              setEditingPage(null);
            }}
          />
        )}
      </section>
    </>
  );
}

// Lien d'accès à transmettre au recruteur (WhatsApp, copier-coller ou e-mail déjà parti).
function AccessLinkCard({ access, onClose }: { access: AccessLink; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const { recruiter, link } = access;
  const space = `${window.location.origin}/espace-recruteur`;
  const message = `Bonjour${recruiter.contact ? ` ${recruiter.contact}` : ""}, voici votre accès à l’espace recruteur de ${recruiter.name} sur Carrières RDC, pour suivre les résultats de vos offres.\n\nChoisissez votre mot de passe ici (lien valable 7 jours, utilisable une seule fois) :\n${link}\n\nEnsuite, connectez-vous sur ${space} avec l’adresse ${recruiter.email}.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez le message :", message);
    }
  }

  return (
    <section className="adm-card adm-linkbox" aria-live="polite">
      <h2>
        <Link2 size={18} /> Lien d’accès pour {recruiter.name}
      </h2>
      <p>
        Transmettez ce lien à {recruiter.email} : il permet de choisir le mot de passe. Il est valable 7 jours et ne sert
        qu’une fois ; un nouveau lien annule le précédent.
      </p>
      {access.emailed && (
        <p className="adm-alert adm-alert-success">
          <CircleCheck size={16} /> Le lien a aussi été envoyé par e-mail.
        </p>
      )}
      {access.emailError && (
        <p className="adm-alert adm-alert-error">
          <TriangleAlert size={16} /> E-mail non envoyé : {access.emailError}. Transmettez le lien par WhatsApp.
        </p>
      )}
      <input className="adm-linkbox-url" type="text" readOnly value={link} onFocus={(event) => event.currentTarget.select()} aria-label="Lien d’accès" />
      <div className="adm-form-actions">
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose}>
          Fermer
        </button>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => void copy()}>
          <Copy size={16} /> {copied ? "Message copié" : "Copier le message"}
        </button>
        <a className="adm-btn adm-btn-primary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <Send size={16} /> Envoyer par WhatsApp
        </a>
      </div>
    </section>
  );
}
