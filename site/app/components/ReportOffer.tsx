"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Flag, TriangleAlert, X } from "lucide-react";
import { apiRequest } from "../lib/api";

const REASONS: Array<{ id: string; label: string }> = [
  { id: "argent", label: "On m’a demandé de l’argent" },
  { id: "fausse", label: "Offre fausse ou trompeuse" },
  { id: "contact", label: "Les coordonnées ne fonctionnent pas" },
  { id: "expiree", label: "Offre déjà pourvue ou expirée" },
  { id: "autre", label: "Autre problème" },
];

/** « Signaler cette offre » : le visiteur indique un motif ; le signalement arrive chez l'administrateur. */
export default function ReportOffer({ id }: { id: number | string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<{ status: "idle" | "pending" | "ok" | "error"; text: string }>({ status: "idle", text: "" });

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (!reason) return setState({ status: "error", text: "Choisissez le motif du signalement." });
    setState({ status: "pending", text: "" });
    try {
      await apiRequest(`/announcements/${encodeURIComponent(String(id))}/flag`, {
        method: "POST",
        body: JSON.stringify({ reason, details: values.get("details"), contact: values.get("contact") }),
      });
      setState({ status: "ok", text: "Merci, votre signalement a été transmis à l’équipe Carrières RDC. Nous vérifions l’offre rapidement." });
    } catch (error) {
      setState({ status: "error", text: error instanceof Error ? error.message : "Envoi impossible." });
    }
  }

  return (
    <>
      <button type="button" className="pub-report-link" onClick={() => setOpen(true)}>
        <Flag size={14} aria-hidden="true" /> Signaler cette offre
      </button>
      {open && (
        <div className="rec-modal-backdrop" onClick={() => setOpen(false)}>
          <form className="rec-card rec-modal" role="dialog" aria-modal="true" aria-labelledby="report-title" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
            <div className="rec-modal-head">
              <h2 id="report-title"><Flag size={20} /> Signaler cette offre</h2>
              <button type="button" className="rec-modal-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={18} /></button>
            </div>
            {state.status === "ok" ? (
              <>
                <p className="rec-success" role="status"><CircleCheck size={16} /> {state.text}</p>
                <button type="button" className="pub-btn pub-btn-gold" onClick={() => setOpen(false)}>Fermer</button>
              </>
            ) : (
              <>
                <p className="rec-muted">Un problème avec cette offre ? Dites-le-nous : chaque signalement est vérifié par notre équipe.</p>
                <div className="pub-report-reasons" role="radiogroup" aria-label="Motif">
                  {REASONS.map((entry) => (
                    <label key={entry.id} className={`pub-report-reason${reason === entry.id ? " is-active" : ""}`}>
                      <input type="radio" name="reason" value={entry.id} checked={reason === entry.id} onChange={() => setReason(entry.id)} />
                      {entry.label}
                    </label>
                  ))}
                </div>
                <label className="rec-field">
                  <span>Précisions (facultatif)</span>
                  <textarea name="details" rows={3} maxLength={1500} placeholder="Ce qui s’est passé, le montant demandé, le numéro qui vous a contacté…" />
                </label>
                <label className="rec-field">
                  <span>Votre e-mail ou téléphone (facultatif, pour vous répondre)</span>
                  <input name="contact" type="text" maxLength={160} />
                </label>
                {state.status === "error" && <p className="rec-alert" role="alert"><TriangleAlert size={16} /> {state.text}</p>}
                <button className="pub-btn pub-btn-gold" type="submit" disabled={state.status === "pending"}>
                  {state.status === "pending" ? "Envoi…" : "Envoyer le signalement"}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
