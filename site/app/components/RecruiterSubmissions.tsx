"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock, Eye, FilePlus2, FileUp, Send, Trash2, TriangleAlert, X, XCircle } from "lucide-react";
import { type Submission, apiRequest, decodeEntities, formatDate, recruiterHeaders, termsFor } from "../lib/api";
import { filesToMedia } from "../lib/media";

const STATUS: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
  pending: { label: "En attente de validation", tone: "is-pending", icon: Clock },
  publishing: { label: "En cours de publication", tone: "is-pending", icon: Clock },
  published: { label: "Publiée", tone: "is-published", icon: CircleCheck },
  rejected: { label: "Non publiée", tone: "is-rejected", icon: XCircle },
};

/** Offres préparées par le recruteur : formulaire complet, puis suivi (en attente, publiée, non publiée). */
export default function RecruiterSubmissions({ organization }: { organization: string }) {
  const [list, setList] = useState<Submission[] | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setList(await apiRequest<Submission[]>("/recruiter/submissions", { headers: recruiterHeaders() }));
    } catch {
      setList((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function withdraw(item: Submission) {
    if (!window.confirm(`Retirer votre proposition « ${decodeEntities(item.title)} » ?`)) return;
    try {
      await apiRequest(`/recruiter/submissions/${item.id}`, { method: "DELETE", headers: recruiterHeaders() });
      setList((current) => (current || []).filter((entry) => entry.id !== item.id));
    } catch (withdrawError) {
      window.alert(withdrawError instanceof Error ? withdrawError.message : "Retrait impossible.");
    }
  }

  return (
    <section className="rec-card rec-submissions" aria-labelledby="rec-submissions-title">
      <div className="rec-submissions-head">
        <h2 id="rec-submissions-title" className="rec-card-title">
          <FilePlus2 size={18} /> Publier une nouvelle offre
        </h2>
        {!open && (
          <button type="button" className="pub-btn pub-btn-gold" onClick={() => { setOpen(true); setNotice(""); }}>
            <FilePlus2 size={16} /> Préparer une offre
          </button>
        )}
      </div>
      <p className="rec-muted">
        Remplissez l’offre vous-même : Carrières RDC la relit, puis la publie. Vous recevez un e-mail dès qu’elle est en ligne.
      </p>
      {notice && (
        <p className="rec-success" role="status">
          <CircleCheck size={16} /> {notice}
        </p>
      )}

      {open && (
        <SubmissionForm
          organization={organization}
          onCancel={() => setOpen(false)}
          onSent={async () => {
            setOpen(false);
            setNotice("Merci ! Votre offre est envoyée. Nous la relisons et vous prévenons par e-mail dès sa publication.");
            await load();
          }}
        />
      )}

      {list && list.length > 0 && (
        <ul className="rec-sub-list">
          {list.map((item) => {
            const status = STATUS[item.status] || STATUS.pending;
            const Icon = status.icon;
            return (
              <li key={String(item.id)}>
                <div>
                  <strong>{decodeEntities(item.title)}</strong>
                  <small>
                    {item.category} · {decodeEntities(item.location)} · proposée le {formatDate(item.created_at)}
                  </small>
                  {item.status === "rejected" && item.reject_reason && (
                    <p className="rec-sub-reason">Motif : {item.reject_reason}</p>
                  )}
                </div>
                <div className="rec-sub-side">
                  <span className={`rec-sub-status ${status.tone}`}>
                    <Icon size={14} aria-hidden="true" /> {status.label}
                  </span>
                  {item.status === "published" && item.announcement_id && (
                    <Link className="pub-btn pub-btn-outline rec-btn-sm" href={`/offre/${item.announcement_id}`} target="_blank">
                      <Eye size={15} /> Voir
                    </Link>
                  )}
                  {item.status === "pending" && (
                    <button type="button" className="rec-sub-withdraw" onClick={() => void withdraw(item)} title="Retirer la proposition">
                      <Trash2 size={15} aria-hidden="true" /> Retirer
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SubmissionForm({ organization, onCancel, onSent }: { organization: string; onCancel: () => void; onSent: () => Promise<void> }) {
  const [category, setCategory] = useState("Offre d’emploi");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const terms = termsFor(category);
  const isJob = category === "Offre d’emploi";
  const isNotice = category === "Annonce";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError("");
    try {
      const files = (form.elements.namedItem("media") as HTMLInputElement | null)?.files || null;
      const media = await filesToMedia(files);
      const values = Object.fromEntries(new FormData(form));
      await apiRequest("/recruiter/submissions", {
        method: "POST",
        headers: recruiterHeaders(),
        body: JSON.stringify({ ...values, media }),
      });
      form.reset();
      await onSent();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Envoi impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="rec-sub-form" onSubmit={submit}>
      <div className="rec-sub-row">
        <label className="rec-field">
          <span>Catégorie *</span>
          <select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>Offre d’emploi</option>
            <option>Annonce</option>
            <option>Appel d’offre</option>
          </select>
        </label>
        <label className="rec-field rec-sub-wide">
          <span>Intitulé *</span>
          <input name="title" type="text" required maxLength={160} placeholder={terms.titlePlaceholder} />
        </label>
      </div>
      <div className="rec-sub-row">
        <label className="rec-field">
          <span>{isNotice ? "Organisateur" : "Employeur"}</span>
          <input type="text" value={organization} readOnly aria-readonly="true" />
        </label>
        <label className="rec-field">
          <span>Lieu *</span>
          <input name="location" type="text" required maxLength={120} placeholder="Ex. Kinshasa · Gombe" />
        </label>
      </div>
      <div className="rec-sub-row rec-sub-row-3">
        <label className="rec-field">
          <span>
            {terms.typeLabel} {isJob && "*"}
          </span>
          <select key={terms.typeLabel} name="contract_type" required={isJob} defaultValue="">
            <option value="">— Choisir —</option>
            {terms.types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="rec-field">
          <span>{terms.deadlineLabel}</span>
          <input name="deadline" type="date" />
        </label>
        <label className="rec-field">
          <span>{terms.priceLabel}</span>
          <input name="salary" type="text" maxLength={120} placeholder={terms.pricePlaceholder} />
        </label>
      </div>
      <label className="rec-field">
        <span>{terms.descriptionLabel}</span>
        <textarea name="description" rows={8} required minLength={30} placeholder="Missions, profil recherché, documents demandés…" />
      </label>
      <label className="rec-field">
        <span>
          {terms.contactLabel} {!isNotice && "*"}
        </span>
        <input name="apply_contact" type="text" required={!isNotice} placeholder={terms.contactPlaceholder} />
      </label>
      <label className="rec-field">
        <span>Affiche ou avis (image ou PDF, facultatif)</span>
        <span className="rec-file">
          <FileUp size={18} aria-hidden="true" />
          <input name="media" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple />
        </span>
        <small className="rec-muted">JPG, PNG, WEBP ou PDF — images compressées automatiquement, 4 Mo au total.</small>
      </label>
      {error && (
        <p className="rec-alert" role="alert">
          <TriangleAlert size={16} /> {error}
        </p>
      )}
      <div className="rec-sub-actions">
        <button type="button" className="pub-btn pub-btn-outline" onClick={onCancel}>
          <X size={16} /> Annuler
        </button>
        <button type="submit" className="pub-btn pub-btn-gold" disabled={pending}>
          <Send size={16} /> {pending ? "Envoi…" : "Envoyer pour validation"}
        </button>
      </div>
      <p className="rec-muted">Rien n’est publié tant que Carrières RDC n’a pas relu et validé votre offre.</p>
    </form>
  );
}
