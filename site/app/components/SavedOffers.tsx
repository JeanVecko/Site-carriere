"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Building2, CalendarClock, Heart, MapPin, Search, Trash2 } from "lucide-react";
import { API_BASE, type Announcement, companyAvatar, daysLeft, decodeEntities, formatDate } from "../lib/api";
import { type SavedOffer, readSaved, refreshSaved, removeSaved, serverSaved, subscribeSaved } from "../lib/saved";

// Échéance d'une offre sauvegardée : texte et couleur du repère.
function deadlineState(entry: SavedOffer) {
  const left = daysLeft(entry.deadline);
  if (left === null) return { rank: 2, tone: "", text: "Date limite non précisée" };
  if (left < 0) return { rank: 3, tone: "is-closed", text: `Clôturée le ${formatDate(entry.deadline)}` };
  if (left === 0) return { rank: 0, tone: "is-soon", text: "Clôture aujourd’hui" };
  if (left <= 3) return { rank: 0, tone: "is-soon", text: `Clôture dans ${left} jour${left > 1 ? "s" : ""}` };
  return { rank: 1, tone: "", text: `Clôture le ${formatDate(entry.deadline)}` };
}

export default function SavedOffers() {
  const saved = useSyncExternalStore(subscribeSaved, readSaved, serverSaved);
  const [ready, setReady] = useState(false);

  // Rafraîchit titres et dates avec les offres actuellement en ligne.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    if (readSaved().length) {
      fetch(`${API_BASE}/announcements`)
        .then((response) => (response.ok ? response.json() : []))
        .then((items: Announcement[]) => refreshSaved(items))
        .catch(() => {});
    }
    return () => cancelAnimationFrame(frame);
  }, []);

  const list = saved
    .map((entry) => ({ entry, state: deadlineState(entry) }))
    .sort((a, b) => a.state.rank - b.state.rank || (a.entry.deadline || "").localeCompare(b.entry.deadline || ""));
  const open = list.filter((row) => row.state.rank < 3).length;

  return (
    <main className="pub-container pub-saved-page">
      <header className="pub-saved-head">
        <h1>
          <Heart size={24} aria-hidden="true" /> Mes offres sauvegardées
        </h1>
        <p>
          {!ready ? " " : saved.length
            ? `${saved.length} offre${saved.length > 1 ? "s" : ""} sauvegardée${saved.length > 1 ? "s" : ""}, dont ${open} encore ouverte${open > 1 ? "s" : ""}. Elles sont gardées sur cet appareil.`
            : "Gardez ici les offres qui vous intéressent pour y postuler plus tard."}
        </p>
      </header>

      {ready && saved.length === 0 && (
        <div className="pub-saved-empty">
          <Heart size={34} aria-hidden="true" />
          <p>
            Touchez le cœur <Heart size={15} aria-hidden="true" /> sur une offre pour la retrouver ici, avec sa date limite.
            Pas besoin de compte.
          </p>
          <Link className="pub-btn pub-btn-gold" href="/offres">
            <Search size={16} /> Voir les offres d’emploi
          </Link>
        </div>
      )}

      {saved.length > 0 && (
        <ul className="pub-jobs pub-saved-list">
          {list.map(({ entry, state }) => {
            const avatar = companyAvatar(entry.company);
            return (
              <li key={entry.id} className={state.rank === 3 ? "is-closed" : undefined}>
                <Link className={`pub-job${state.rank === 3 ? " is-expired" : ""}`} href={entry.href}>
                  <span className={`pub-avatar tone-${avatar.tone}`} aria-hidden="true">
                    {avatar.initial}
                  </span>
                  <span className="pub-job-main">
                    <span className="pub-job-title">{decodeEntities(entry.title)}</span>
                    <span className="pub-job-meta">
                      <span className="pub-company">
                        <Building2 size={14} aria-hidden="true" /> {decodeEntities(entry.company)}
                      </span>
                      <span>
                        <MapPin size={14} aria-hidden="true" /> {decodeEntities(entry.location)}
                      </span>
                    </span>
                    <span className="pub-tags">
                      {entry.contract_type && <span className="pub-tag pub-tag-gold">{entry.contract_type}</span>}
                      <span className={`pub-saved-deadline ${state.tone}`} suppressHydrationWarning>
                        <CalendarClock size={13} aria-hidden="true" /> {state.text}
                      </span>
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="pub-saved-remove"
                  onClick={() => removeSaved(entry.id)}
                  aria-label={`Retirer « ${decodeEntities(entry.title)} » de mes offres`}
                  title="Retirer de mes offres"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
