"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Store, X } from "lucide-react";
import { type Recruiter, adminHeaders, apiRequest, companyHref } from "../lib/api";
import CompanyProfileForm, { type ProfileValues } from "./CompanyProfileForm";
import { confirmDialog } from "./Dialogs";

type Loaded = { slug: string; name: string; sectors: string[]; published: ProfileValues | null };

/** Administrateur : remplir ou corriger la page d'une entreprise (publiée tout de suite), ou la retirer. */
export default function AdminCompanyProfile({
  recruiter,
  onClose,
  onSaved,
  notify,
}: {
  recruiter: Recruiter;
  onClose: () => void;
  onSaved: (published: boolean) => void;
  notify: (toast: { type: "success" | "error"; text: string }) => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    apiRequest<Loaded>(`/admin/recruiters/${recruiter.id}/profile`, { headers: adminHeaders() })
      .then(setData)
      .catch((error) => {
        notify({ type: "error", text: error instanceof Error ? error.message : "Fiche indisponible." });
        onClose();
      });
    // Chargé une fois par organisation (notify et onClose peuvent changer à chaque rendu du parent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruiter.id]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function unpublish() {
    if (!(await confirmDialog({ tone: "warning", title: "Retirer la page entreprise ?", message: `La page publique de ${recruiter.name} ne sera plus visible. Ses offres restent en ligne.`, confirmLabel: "Retirer la page" }))) return;
    try {
      await apiRequest(`/admin/recruiters/${recruiter.id}/profile`, { method: "PUT", headers: adminHeaders(), body: JSON.stringify({ unpublish: true }) });
      notify({ type: "success", text: "Page entreprise retirée." });
      onSaved(false);
    } catch (error) {
      notify({ type: "error", text: error instanceof Error ? error.message : "Retrait impossible." });
    }
  }

  return (
    <div className="rec-modal-backdrop" onClick={onClose}>
      <div className="rec-card rec-modal adm-company-modal" role="dialog" aria-modal="true" aria-labelledby="company-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="rec-modal-head">
          <h2 id="company-modal-title">
            <Store size={20} /> Page de {recruiter.name}
          </h2>
          <button type="button" className="rec-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        {!data ? (
          <p className="rec-muted">Chargement…</p>
        ) : (
          <>
            {data.published && (
              <p className="rec-muted adm-company-links">
                <Link href={companyHref(data.slug)} target="_blank">
                  <ExternalLink size={14} /> Voir la page en ligne
                </Link>
                <button type="button" className="adm-link" onClick={() => void unpublish()}>
                  Retirer la page
                </button>
              </p>
            )}
            <CompanyProfileForm
              name={data.name}
              sectors={data.sectors}
              initial={data.published}
              submitLabel="Publier la page"
              note="Publiée tout de suite (vous êtes l’administrateur). Les modifications proposées par le recruteur passent, elles, par « À valider »."
              onCancel={onClose}
              onSave={async (body) => {
                await apiRequest(`/admin/recruiters/${recruiter.id}/profile`, { method: "PUT", headers: adminHeaders(), body: JSON.stringify(body) });
                notify({ type: "success", text: `Page de ${recruiter.name} publiée.` });
                onSaved(true);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
