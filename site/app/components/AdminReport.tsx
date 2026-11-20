"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, MousePointerClick, Percent, Printer } from "lucide-react";
import { adminHeaders, apiRequest, decodeEntities, detailHref, formatDate, recruiterHeaders } from "../lib/api";

// Adresse publique du site, pour le lien de l’offre dans le bilan (www.carrieresrdc.com en ligne).
const SITE_URL = "https://www.carrieresrdc.com";

type Report = {
  offer: {
    id: number | string;
    title: string;
    category: string;
    company: string;
    location: string;
    contract_type: string;
    deadline: string | null;
    created_at: string;
    views: number;
    apply_clicks: number;
  };
  days: Array<{ day: string; views: number; applies: number }>;
  sources: Array<{ source: string; views: number; applies: number }>;
  channels: Array<{ channel: string; applies: number }>;
  tracked_since: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Accès direct / applications",
  site: "Navigation sur Carrières RDC",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  google: "Google",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  email: "Alertes et messageries e-mail",
  autre: "Autres sites",
};
const CHANNEL_LABELS: Record<string, string> = {
  web: "Lien de candidature",
  email: "E-mail",
  whatsapp: "WhatsApp",
  phone: "Appel téléphonique",
  "": "Non précisé",
};

const number = (value: number) => Number(value || 0).toLocaleString("fr-FR");
const rate = (views: number, applies: number) => (views ? `${Math.round((applies / views) * 100)} %` : "—");

/** Bilan d'une offre à envoyer au recruteur : vues, clics « Postuler », provenance, canal. Imprimable en PDF.
 *  mode « recruiter » : le même bilan, ouvert par le recruteur depuis son espace (ses offres seulement). */
export default function AdminReport({ id, mode = "admin" }: { id: string; mode?: "admin" | "recruiter" }) {
  const recruiter = mode === "recruiter";
  const backHref = recruiter ? "/espace-recruteur" : "/admin#offres";
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const path = recruiter ? `/recruiter/offers/${encodeURIComponent(id)}/report` : `/admin/announcements/${encodeURIComponent(id)}/report`;
    apiRequest<Report>(path, { headers: recruiter ? recruiterHeaders() : adminHeaders() })
      .then(setReport)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Bilan indisponible."));
  }, [id, recruiter]);

  if (!id || error) {
    return (
      <main className="adm-report">
        <p className="adm-report-error">
          {error || "Offre non précisée."}{" "}
          {recruiter
            ? "Connectez-vous à votre espace recruteur puis ouvrez le bilan depuis la liste de vos offres."
            : "Connectez-vous à l’administration puis ouvrez le bilan depuis la liste des offres."}
        </p>
        <Link className="adm-btn adm-btn-ghost" href={recruiter ? "/espace-recruteur" : "/admin"}>
          <ArrowLeft size={16} /> {recruiter ? "Espace recruteur" : "Administration"}
        </Link>
      </main>
    );
  }
  if (!report) return <main className="adm-report"><p className="adm-report-muted">Chargement du bilan…</p></main>;

  const { offer } = report;
  const title = decodeEntities(offer.title);
  const company = decodeEntities(offer.company);
  const url = `${SITE_URL}${detailHref(offer)}`;
  const maxDay = Math.max(1, ...report.days.map((day) => day.views));
  const since = report.tracked_since ? formatDate(report.tracked_since) : "";
  const today = formatDate(new Date().toISOString());

  const summary = [
    `Bilan de votre publication sur Carrières RDC — ${title} (${company})`,
    `Publiée le ${formatDate(offer.created_at)}${offer.deadline ? `, date limite le ${formatDate(offer.deadline)}` : ""}.`,
    `• ${number(offer.views)} consultations de l’offre`,
    `• ${number(offer.apply_clicks)} clics sur « Postuler » (${rate(offer.views, offer.apply_clicks)} des visiteurs)`,
    ...(report.sources.length
      ? [`Provenance des visiteurs : ${report.sources.slice(0, 4).map((row) => `${SOURCE_LABELS[row.source] || row.source} ${number(row.views)}`).join(", ")}.`]
      : []),
    `Offre : ${url}`,
    `Chiffres au ${today}.`,
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez le résumé :", summary);
    }
  }

  return (
    <main className="adm-report">
      <div className="adm-report-actions">
        <Link className="adm-btn adm-btn-ghost" href={backHref}>
          <ArrowLeft size={16} /> Retour
        </Link>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={copySummary}>
          <Copy size={16} /> {copied ? "Résumé copié" : "Copier le résumé (WhatsApp, e-mail)"}
        </button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Imprimer / enregistrer en PDF
        </button>
      </div>

      <article className="adm-report-sheet">
        <header className="adm-report-head">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
          <img src="/LOGO/Logo.png" alt="" />
          <div>
            <span>Bilan de diffusion · Carrières RDC</span>
            <h1>{title}</h1>
            <p>
              {company}
              {offer.location ? ` · ${decodeEntities(offer.location)}` : ""}
              {offer.contract_type ? ` · ${offer.contract_type}` : ""}
            </p>
          </div>
        </header>

        <dl className="adm-report-dates">
          <div><dt>Publiée le</dt><dd>{formatDate(offer.created_at)}</dd></div>
          <div><dt>Date limite</dt><dd>{offer.deadline ? formatDate(offer.deadline) : "Non précisée"}</dd></div>
          <div><dt>Chiffres au</dt><dd>{today}</dd></div>
        </dl>

        <section className="adm-report-kpis" aria-label="Résultats">
          <div><Eye size={20} /><strong>{number(offer.views)}</strong><span>consultations de l’offre</span></div>
          <div><MousePointerClick size={20} /><strong>{number(offer.apply_clicks)}</strong><span>clics sur « Postuler »</span></div>
          <div><Percent size={20} /><strong>{rate(offer.views, offer.apply_clicks)}</strong><span>des visiteurs ont cliqué</span></div>
        </section>

        {report.days.length > 0 && (
          <section className="adm-report-block">
            <h2>Consultations par jour</h2>
            <div className="adm-report-chart" role="img" aria-label="Consultations et clics par jour">
              {report.days.slice(-30).map((day) => (
                <div key={day.day} title={`${formatDate(day.day)} : ${day.views} vues, ${day.applies} clics`}>
                  <b>{day.applies > 0 ? day.applies : ""}</b>
                  <i style={{ height: `${Math.max(4, (day.views / maxDay) * 100)}%` }} />
                  <small>{day.day.slice(8, 10)}/{day.day.slice(5, 7)}</small>
                </div>
              ))}
            </div>
            <p className="adm-report-legend">Barres : consultations. Chiffre au-dessus : clics sur « Postuler » ce jour-là.</p>
          </section>
        )}

        <div className="adm-report-grid">
          <section className="adm-report-block">
            <h2>D’où viennent les visiteurs</h2>
            {report.sources.length === 0 ? (
              <p className="adm-report-muted">Pas encore de détail : il apparaîtra avec les prochaines visites.</p>
            ) : (
              <table>
                <thead><tr><th>Provenance</th><th>Vues</th><th>Clics</th></tr></thead>
                <tbody>
                  {report.sources.map((row) => (
                    <tr key={row.source}>
                      <td>{SOURCE_LABELS[row.source] || row.source}</td>
                      <td>{number(row.views)}</td>
                      <td>{number(row.applies)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="adm-report-block">
            <h2>Comment les candidats vous contactent</h2>
            {report.channels.length === 0 ? (
              <p className="adm-report-muted">Aucun clic sur « Postuler » pour le moment.</p>
            ) : (
              <table>
                <thead><tr><th>Canal</th><th>Clics</th></tr></thead>
                <tbody>
                  {report.channels.map((row) => (
                    <tr key={row.channel}>
                      <td>{CHANNEL_LABELS[row.channel] || row.channel}</td>
                      <td>{number(row.applies)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <footer className="adm-report-foot">
          <p>
            Un clic sur « Postuler » correspond à l’ouverture du lien, de l’e-mail, du WhatsApp ou du numéro de candidature indiqué
            dans l’offre. Chaque visiteur n’est compté qu’une fois par demi-heure et les robots sont exclus. Les chiffres sont
            anonymes : aucune donnée personnelle des visiteurs n’est collectée.
            {since ? ` Détail par jour et par provenance disponible depuis le ${since}.` : ""}
          </p>
          <p>Carrières RDC · {url}</p>
        </footer>
      </article>
    </main>
  );
}
