// Fonctions utilisées uniquement côté serveur (pages rendues pour Google, sitemap).
import { cache } from "react";
import { API_BASE, type Announcement } from "./api";

// Adresse publique du site (liens canoniques, sitemap, partage). En production : le domaine carrieresrdc.com
// (version www, vers laquelle Vercel redirige). NEXT_PUBLIC_SITE_URL permet de la changer sans toucher au code.
const PRODUCTION_SITE_URL = "https://www.carrieresrdc.com";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === "production"
    ? PRODUCTION_SITE_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
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
