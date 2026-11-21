"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import type { Announcement } from "../lib/api";
import { readSaved, serverSaved, subscribeSaved, toggleSaved } from "../lib/saved";

/** Bouton ♡ : sauvegarde l'offre dans « Mes offres » (gardé dans ce navigateur). */
export default function SaveOffer({ item, variant = "icon" }: { item: Announcement; variant?: "icon" | "button" }) {
  const saved = useSyncExternalStore(subscribeSaved, readSaved, serverSaved).some((entry) => entry.id === String(item.id));
  const label = saved ? "Retirer de mes offres" : "Sauvegarder l’offre";
  return (
    <button
      type="button"
      className={`pub-save pub-save-${variant}${saved ? " is-saved" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(item);
      }}
      aria-pressed={saved}
      aria-label={variant === "icon" ? label : undefined}
      title={label}
    >
      <Heart size={variant === "icon" ? 17 : 16} aria-hidden="true" fill={saved ? "currentColor" : "none"} />
      {variant === "button" && <span>{saved ? "Sauvegardée" : "Sauvegarder"}</span>}
    </button>
  );
}

/** Lien de l'en-tête vers « Mes offres », avec le nombre d'offres sauvegardées. */
export function SavedCount() {
  const count = useSyncExternalStore(subscribeSaved, readSaved, serverSaved).length;
  return count > 0 ? <span className="pub-saved-count">{count > 99 ? "99+" : count}</span> : null;
}
