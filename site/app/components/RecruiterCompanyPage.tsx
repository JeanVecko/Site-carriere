"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, Clock, ExternalLink, Store } from "lucide-react";
import { apiRequest, companyHref, formatDate, recruiterHeaders } from "../lib/api";
import CompanyProfileForm, { type ProfileValues } from "./CompanyProfileForm";

type ProfileState = {
  slug: string;
  name: string;
  sectors: string[];
  published: (ProfileValues & { updated_at?: string }) | null;
  draft: (ProfileValues & { submitted_at?: string }) | null;
};

/** Page entreprise du recruteur : état (en ligne, en attente), et formulaire envoyé pour validation. */
export default function RecruiterCompanyPage() {
  const [state, setState] = useState<ProfileState | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setState(await apiRequest<ProfileState>("/recruiter/profile", { headers: recruiterHeaders() }));
    } catch {
      setState(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (!state) return null;
  const { published, draft } = state;

  return (
    <section className="rec-card rec-company" aria-labelledby="rec-company-title">
      <div className="rec-submissions-head">
        <h2 id="rec-company-title" className="rec-card-title">
          <Store size={18} /> Votre page entreprise
        </h2>
        {!open && (
          <button type="button" className="pub-btn pub-btn-gold" onClick={() => { setOpen(true); setNotice(""); }}>
            {published || draft ? "Modifier ma page" : "Créer ma page"}
          </button>
        )}
      </div>
      <p className="rec-muted">
        Une vitrine publique de {state.name} sur Carrières RDC : votre logo, votre présentation et toutes vos offres en cours. Les
        candidats la trouvent depuis vos offres et sur Google.
      </p>
      <div className="rec-company-status">
        {published ? (
          <span className="rec-sub-status is-published">
            <CircleCheck size={14} aria-hidden="true" /> En ligne
          </span>
        ) : (
          <span className="rec-sub-status">Pas encore de page</span>
        )}
        {draft && (
          <span className="rec-sub-status is-pending">
            <Clock size={14} aria-hidden="true" /> {published ? "Modifications" : "Page"} en attente de validation
            {draft.submitted_at ? ` (envoyée le ${formatDate(draft.submitted_at)})` : ""}
          </span>
        )}
        {published && (
          <Link className="pub-btn pub-btn-outline rec-btn-sm" href={companyHref(state.slug)} target="_blank">
            <ExternalLink size={15} /> Voir ma page
          </Link>
        )}
      </div>
      {notice && (
        <p className="rec-success" role="status">
          <CircleCheck size={16} /> {notice}
        </p>
      )}
      {open && (
        <CompanyProfileForm
          name={state.name}
          sectors={state.sectors}
          initial={draft || published}
          submitLabel="Envoyer pour validation"
          note="Votre page n’est publiée (ou modifiée) qu’après relecture par Carrières RDC. Vous êtes prévenu par e-mail."
          onCancel={() => setOpen(false)}
          onSave={async (body) => {
            await apiRequest("/recruiter/profile", { method: "PUT", headers: recruiterHeaders(), body: JSON.stringify(body) });
            setOpen(false);
            setNotice("Merci ! Votre page est envoyée. Nous la relisons et vous prévenons par e-mail dès sa mise en ligne.");
            await load();
          }}
        />
      )}
    </section>
  );
}
