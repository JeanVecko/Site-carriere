"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, MapPin } from "lucide-react";
import { Announcement, apiRequest, escapeHtml, paragraphs } from "../lib/api";

const CATEGORY_URLS: Record<string, string> = {
  "Offre d’emploi": "/offres",
  Annonce: "/annonces",
  "Appel d’offre": "/appels-offres",
};

export default function DetailContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [item, setItem] = useState<Announcement | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError(true);
        return;
      }
      try {
        let found: Announcement;
        try {
          found = await apiRequest<Announcement>(`/announcements/${encodeURIComponent(id)}`);
        } catch {
          const items = await apiRequest<Announcement[]>("/announcements");
          const match = items.find(
            (announcement) => String(announcement.id) === String(id)
          );
          if (!match) throw new Error("Annonce introuvable.");
          found = match;
        }
        setItem(found);
        document.title = `${found.title} — Carrières RDC`;
      } catch {
        setError(true);
      }
    })();
  }, [id]);

  if (error || (!item && !id)) {
    return (
      <main className="detail-page">
        <div className="detail-page-top">
          <Link className="text-button" href="/">
            <ArrowLeft size={15} /> Retour à la liste
          </Link>
        </div>
        <p className="detail-page-error" id="detail-error">
          Cette publication est introuvable.
        </p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="detail-page">
        <div className="detail-page-top">
          <Link className="text-button" href="/">
            <ArrowLeft size={15} /> Retour à la liste
          </Link>
        </div>
      </main>
    );
  }

  const backUrl =
    CATEGORY_URLS[item.category || ""] || "/";

  return (
    <main className="detail-page">
      <div className="detail-page-top">
        <Link className="text-button" id="back-link" href={backUrl}>
          <ArrowLeft size={15} /> Retour à la liste
        </Link>
      </div>
      <article className="detail-page-card" id="detail-content">
        <p className="eyebrow">
          <span className="eyebrow-line"></span> Carrières RDC
        </p>
        <span className="detail-page-tag tag">{escapeHtml(item.category || "")}</span>
        <h1 className="detail-page-title">{escapeHtml(item.title)}</h1>
        <p className="detail-page-company">{escapeHtml(item.company)}</p>
        <p className="detail-page-location location">
          <MapPin size={14} />
          {escapeHtml(item.location)}
        </p>
        {item.description && (
          <div className="detail-page-description">
            {paragraphs(item.description).map((paragraph, index) => (
              <p key={index}>{escapeHtml(paragraph)}</p>
            ))}
          </div>
        )}
        {item.media && item.media.length > 0 && (
          <section className="announcement-media" aria-labelledby="announcement-media-title">
            <h2 id="announcement-media-title">Document{item.media.length > 1 ? "s" : ""} joint{item.media.length > 1 ? "s" : ""}</h2>
            <div className="announcement-media-grid">
              {item.media.map((file, index) =>
                file.type === "application/pdf" ? (
                  <a className="announcement-pdf" href={file.dataUrl} download={file.name} key={`${file.name}-${index}`}>
                    <FileText size={28} />
                    <span>{escapeHtml(file.name)}</span>
                    <small>Télécharger le PDF</small>
                  </a>
                ) : (
                  <a href={file.dataUrl} target="_blank" rel="noreferrer" key={`${file.name}-${index}`}>
                    <img className="announcement-image" src={file.dataUrl} alt={`Document scanné : ${file.name}`} />
                  </a>
                )
              )}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
