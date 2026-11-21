// Offres sauvegardées par le candidat (« Mes offres ») : gardées dans ce navigateur, sans compte.
// On garde un résumé de chaque offre pour pouvoir l'afficher même après son retrait du site.
import { API_BASE, type Announcement, detailHref } from "./api";

export const SAVED_KEY = "carrieres-favoris";
export const SAVED_EVENT = "carrieres-favoris-change";
const SAVED_LIMIT = 100;

export type SavedOffer = {
  id: string;
  title: string;
  company: string;
  location: string;
  category: string;
  contract_type: string;
  deadline: string | null;
  href: string;
  saved_at: string;
};

let cacheRaw: string | null = null;
let cacheList: SavedOffer[] = [];
const EMPTY: SavedOffer[] = [];

/** Liste actuelle (même référence tant qu'elle ne change pas, pour useSyncExternalStore). */
export function readSaved(): SavedOffer[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVED_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheList;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cacheList = Array.isArray(parsed) ? parsed.filter((entry) => entry && entry.id && entry.title) : [];
  } catch {
    cacheList = [];
  }
  return cacheList;
}

export const serverSaved = () => EMPTY;

export function subscribeSaved(callback: () => void) {
  window.addEventListener(SAVED_EVENT, callback);
  window.addEventListener("storage", callback); // autre onglet
  return () => {
    window.removeEventListener(SAVED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function writeSaved(list: SavedOffer[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, SAVED_LIMIT)));
  } catch {
    // stockage indisponible (navigation privée saturée) : rien à faire
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
}

function countSave(id: string, action: "add" | "remove") {
  fetch(`${API_BASE}/announcements/${encodeURIComponent(id)}/save?action=${action}`, { method: "POST", keepalive: true }).catch(() => {});
}

export function snapshot(item: Announcement): SavedOffer {
  return {
    id: String(item.id),
    title: item.title,
    company: item.company,
    location: item.location,
    category: item.category || "",
    contract_type: item.contract_type || "",
    deadline: item.deadline || null,
    href: detailHref(item),
    saved_at: new Date().toISOString(),
  };
}

/** Ajoute ou retire l'offre ; renvoie true si elle est maintenant sauvegardée. */
export function toggleSaved(item: Announcement): boolean {
  const id = String(item.id);
  const list = readSaved();
  if (list.some((entry) => entry.id === id)) {
    removeSaved(id);
    return false;
  }
  writeSaved([snapshot(item), ...list]);
  countSave(id, "add");
  return true;
}

export function removeSaved(id: string) {
  writeSaved(readSaved().filter((entry) => entry.id !== id));
  countSave(id, "remove");
}

/** Met à jour les résumés avec les données actuelles des offres encore en ligne. */
export function refreshSaved(current: Announcement[]) {
  const byId = new Map(current.map((item) => [String(item.id), item]));
  let changed = false;
  const list = readSaved().map((entry) => {
    const fresh = byId.get(entry.id);
    if (!fresh) return entry;
    const next = { ...snapshot(fresh), saved_at: entry.saved_at };
    if (JSON.stringify(next) !== JSON.stringify(entry)) changed = true;
    return next;
  });
  if (changed) writeSaved(list);
}
