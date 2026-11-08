// Fonctions utilisées uniquement côté serveur (pages rendues pour Google, sitemap).
import { cache } from "react";
import { API_BASE, type Announcement } from "./api";

// Adresse publique du site. Sur Vercel, VERCEL_PROJECT_PRODUCTION_URL est fournie automatiquement ;
// définir NEXT_PUBLIC_SITE_URL si vous utilisez votre propre nom de domaine.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

const REVALIDATE_SECONDS = 60;

export const fetchAnnouncement = cache(async (id: string): Promise<Announcement | null> => {
  if (!/^\d+$/.test(id)) return null;
  try {
    const response = await fetch(`${API_BASE}/announcements/${id}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as Announcement;
  } catch {
    return null;
  }
});

export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const response = await fetch(`${API_BASE}/announcements`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return [];
    return (await response.json()) as Announcement[];
  } catch {
    return [];
  }
}
