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

// Les pages ne redemandent pas les offres à l'API toutes les minutes (cela réveillait la base en continu) :
// elles sont rafraîchies à chaque publication depuis l'admin et chaque matin par la tâche planifiée ;
// 12 h est seulement un délai de secours.
const REVALIDATE_SECONDS = 43200;

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

// Liste publique (optionnellement d'une seule catégorie), mise en cache côté serveur.
export async function fetchAnnouncements(category?: string): Promise<Announcement[]> {
  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`${API_BASE}/announcements${query}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return [];
    return (await response.json()) as Announcement[];
  } catch {
    return [];
  }
}
