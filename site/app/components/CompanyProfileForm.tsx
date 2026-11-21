"use client";

import { useState } from "react";
import { CircleCheck, ImagePlus, Send, Trash2, TriangleAlert, X } from "lucide-react";
import type { CompanyProfile } from "../lib/api";
import { logoToDataUrl } from "../lib/media";

export type ProfileValues = Partial<CompanyProfile> & { logo?: string | null };

/**
 * Fiche d'une entreprise (logo, secteur, ville, site, présentation). Utilisée par le recruteur (envoyée pour
 * validation) et par l'administrateur (publiée directement). onSave reçoit les champs à envoyer à l'API.
 */
export default function CompanyProfileForm({
  name,
  sectors,
  initial,
  submitLabel,
  note,
  onSave,
  onCancel,
}: {
  name: string;
  sectors: string[];
  initial: ProfileValues | null;
  submitLabel: string;
  note?: string;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [logo, setLogo] = useState<string | null>(initial?.logo ?? null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function pickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      setLogo(await logoToDataUrl(file));
      setLogoChanged(true);
    } catch (logoError) {
      setError(logoError instanceof Error ? logoError.message : "Logo illisible.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    delete values.logo_file;
    setPending(true);
    setError("");
    try {
      await onSave({ ...values, ...(logoChanged ? (logo ? { logo } : { remove_logo: true }) : {}) });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="rec-sub-form company-form" onSubmit={submit}>
      <div className="company-form-logo">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local du logo
          <img src={logo} alt={`Logo de ${name}`} />
        ) : (
          <span className="company-form-logo-empty" aria-hidden="true">
            <ImagePlus size={26} />
          </span>
        )}
        <div>
          <strong>Logo</strong>
          <small className="rec-muted">Image carrée de préférence (JPG, PNG ou WEBP). Elle est réduite automatiquement.</small>
          <span className="company-form-logo-actions">
            <label className="pub-btn pub-btn-outline rec-btn-sm">
              <ImagePlus size={15} /> {logo ? "Changer" : "Ajouter un logo"}
              <input name="logo_file" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickLogo} hidden />
            </label>
            {logo && (
              <button type="button" className="rec-sub-withdraw" onClick={() => { setLogo(null); setLogoChanged(true); }}>
                <Trash2 size={14} /> Retirer
              </button>
            )}
          </span>
        </div>
      </div>
      <div className="rec-sub-row">
        <label className="rec-field">
          <span>Secteur d’activité *</span>
          <select name="sector" required defaultValue={initial?.sector || ""}>
            <option value="">— Choisir —</option>
            {sectors.map((sector) => (
              <option key={sector}>{sector}</option>
            ))}
          </select>
        </label>
        <label className="rec-field">
          <span>Ville du siège</span>
          <input name="city" type="text" maxLength={80} placeholder="Ex. Kinshasa · Gombe" defaultValue={initial?.city || ""} />
        </label>
      </div>
      <label className="rec-field">
        <span>Site web</span>
        <input name="website" type="url" maxLength={200} placeholder="https://www.exemple.cd" defaultValue={initial?.website || ""} />
      </label>
      <label className="rec-field">
        <span>Présentation de {name} * (activités, valeurs, implantations…)</span>
        <textarea name="description" rows={7} required minLength={40} maxLength={2000} defaultValue={initial?.description || ""} />
      </label>
      {error && (
        <p className="rec-alert" role="alert">
          <TriangleAlert size={16} /> {error}
        </p>
      )}
      <div className="rec-sub-actions">
        {onCancel && (
          <button type="button" className="pub-btn pub-btn-outline" onClick={onCancel}>
            <X size={16} /> Annuler
          </button>
        )}
        <button type="submit" className="pub-btn pub-btn-gold" disabled={pending}>
          {pending ? "Enregistrement…" : (
            <>
              {submitLabel.startsWith("Publier") ? <CircleCheck size={16} /> : <Send size={16} />} {submitLabel}
            </>
          )}
        </button>
      </div>
      {note && <p className="rec-muted">{note}</p>}
    </form>
  );
}
