"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock, Eye, FilePlus2, FileUp, Send, Trash2, TriangleAlert, X, XCircle } from "lucide-react";
import { type Submission, apiRequest, decodeEntities, formatDate, recruiterHeaders, termsFor } from "../lib/api";
import { filesToMedia } from "../lib/media";
import { alertDialog, confirmDialog } from "./Dialogs";

const STATUS: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
  pending: { label: "En attente de validation", tone: "is-pending", icon: Clock },
  publishing: { label: "En cours de publication", tone: "is-pending", icon: Clock },
  published: { label: "Publiée", tone: "is-published", icon: CircleCheck },
  rejected: { label: "Non publiée", tone: "is-rejected", icon: XCircle },
};

/** Offres préparées par le recruteur : formulaire complet, puis suivi (en attente, publiée, non publiée). */
// Champs repris d'une ancienne offre pour la republier.
type Prefill = Partial<Pick<Submission, "title" | "category" | "location" | "description" | "contract_type" | "apply_contact" | "salary">>;

export default function RecruiterSubmissions({
  organization,
  republishId = null,
  onRepublishOpened,
}: {
  organization: string;
  republishId?: string | null;
  onRepublishOpened?: () => void;
}) {
  const [list, setList] = useState<Submission[] | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const card = useRef<HTMLElement>(null);

  // Republier : formulaire prérempli avec l'ancienne offre (sauf la date limite, à choisir de nouveau).
  useEffect(() => {
    if (!republishId) return;
    let cancelled = false;
    apiRequest<Prefill>(`/recruiter/offers/${encodeURIComponent(republishId)}/details`, { headers: recruiterHeaders() })
      .then((offer) => {
        if (cancelled) return;
        setPrefill(offer);
        setNotice("");
        setOpen(true);
        window.setTimeout(() => card.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      })
      .catch(() => {})
      .finally(() => onRepublishOpened?.());
    return () => {
      cancelled = true;
    };
  }, [republishId, onRepublishOpened]);

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
    if (!(await confirmDialog({ tone: "warning", title: "Retirer cette proposition ?", message: `« ${decodeEntities(item.title)} » ne sera pas examinée par Carrières RDC.`, confirmLabel: "Retirer" }))) return;
    try {
      await apiRequest(`/recruiter/submissions/${item.id}`, { method: "DELETE", headers: recruiterHeaders() });
      setList((current) => (current || []).filter((entry) => entry.id !== item.id));
    } catch (withdrawError) {
      void alertDialog({ tone: "danger", title: "Retrait impossible", message: withdrawError instanceof Error ? withdrawError.message : "Réessayez dans un instant." });
    }
  }

  return (
    <section ref={card} className="rec-card rec-submissions" aria-labelledby="rec-submissions-title">
      <div className="rec-submissions-head">
        <h2 id="rec-submissions-title" className="rec-card-title">
          <FilePlus2 size={18} /> Publier une nouvelle offre
        </h2>
        {!open && (
          <button type="button" className="pub-btn pub-btn-gold" onClick={() => { setPrefill(null); setOpen(true); setNotice(""); }}>
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
          key={prefill ? `republier-${prefill.title}` : "nouvelle"}
          organization={organization}
          prefill={prefill}
          onCancel={() => {
            setOpen(false);
            setPrefill(null);
          }}
          onSent={async () => {
            setOpen(false);
            setPrefill(null);
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

function SubmissionForm({
  organization,
  prefill,
  onCancel,
  onSent,
}: {
  organization: string;
  prefill: Prefill | null;
  onCancel: () => void;
  onSent: () => Promise<void>;
}) {
  const [category, setCategory] = useState(prefill?.category || "Offre d’emploi");
  const text = (value?: string | null) => (value ? decodeEntities(value) : "");
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
      {prefill && (
        <p className="rec-success" role="status">
          <CircleCheck size={16} /> Formulaire repris de « {text(prefill.title)} ». Vérifiez les informations et choisissez une nouvelle date limite.
        </p>
      )}
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
          <input name="title" type="text" required maxLength={160} placeholder={terms.titlePlaceholder} defaultValue={text(prefill?.title)} />
        </label>
      </div>
      <div className="rec-sub-row">
        <label className="rec-field">
          <span>{isNotice ? "Organisateur" : "Employeur"}</span>
          <input type="text" value={organization} readOnly aria-readonly="true" />
        </label>
        <label className="rec-field">
          <span>Lieu *</span>
          <input name="location" type="text" required maxLength={120} placeholder="Ex. Kinshasa · Gombe" defaultValue={text(prefill?.location)} />
        </label>
      </div>
      <div className="rec-sub-row rec-sub-row-3">
        <label className="rec-field">
          <span>
            {terms.typeLabel} {isJob && "*"}
          </span>
          <select key={terms.typeLabel} name="contract_type" required={isJob} defaultValue={terms.types.includes(prefill?.contract_type || "") ? prefill?.contract_type : ""}>
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
          <input name="salary" type="text" maxLength={120} placeholder={terms.pricePlaceholder} defaultValue={text(prefill?.salary)} />
        </label>
      </div>
      <label className="rec-field">
        <span>{terms.descriptionLabel}</span>
        <textarea name="description" rows={8} required minLength={30} placeholder="Missions, profil recherché, documents demandés…" defaultValue={text(prefill?.description)} />
      </label>
      <label className="rec-field">
        <span>
          {terms.contactLabel} {!isNotice && "*"}
        </span>
        <input name="apply_contact" type="text" required={!isNotice} placeholder={terms.contactPlaceholder} defaultValue={text(prefill?.apply_contact)} />
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
