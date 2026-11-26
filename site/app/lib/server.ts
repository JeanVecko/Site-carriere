// Fonctions utilisées uniquement côté serveur (pages rendues pour Google, sitemap).
import { cache } from "react";
import { API_BASE, type Announcement, type Company, type CompanySummary } from "./api";
import type { Article, ArticleSummary } from "./articles";

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

// Une publication par son adresse (comptable-senior), son numéro (12) ou l'ancien format (12-comptable-senior).
export const fetchAnnouncement = cache(async (key: string): Promise<Announcement | null> => {
  if (!/^[a-z0-9-]{1,120}$/.test(key)) return null;
  const load = async (value: string) => {
    const response = await fetch(`${API_BASE}/announcements/${value}`, { next: { revalidate: REVALIDATE_SECONDS } });
    return response.ok ? ((await response.json()) as Announcement) : null;
  };
  try {
    // Ancien format (12-titre) : par le numéro si l'adresse complète n'est pas reconnue.
    const legacy = /^(\d+)-/.exec(key);
    return (await load(key)) || (legacy ? await load(legacy[1]) : null);
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

// Entreprises qui ont une page publique (annuaire), et la page d'une entreprise.
export async function fetchCompanies(): Promise<CompanySummary[]> {
  try {
    const response = await fetch(`${API_BASE}/companies`, { next: { revalidate: REVALIDATE_SECONDS } });
    return response.ok ? ((await response.json()) as CompanySummary[]) : [];
  } catch {
    return [];
  }
}

export const fetchCompany = cache(async (slug: string): Promise<Company | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    const response = await fetch(`${API_BASE}/companies/${slug}`, { next: { revalidate: REVALIDATE_SECONDS } });
    return response.ok ? ((await response.json()) as Company) : null;
  } catch {
    return null;
  }
});

// Conseils carrière publiés (liste sans le texte) et un article complet.
export async function fetchArticles(limit?: number): Promise<ArticleSummary[]> {
  try {
    const response = await fetch(`${API_BASE}/articles${limit ? `?limit=${limit}` : ""}`, { next: { revalidate: REVALIDATE_SECONDS } });
    return response.ok ? ((await response.json()) as ArticleSummary[]) : [];
  } catch {
    return [];
  }
}

export const fetchArticle = cache(async (slug: string): Promise<Article | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    const response = await fetch(`${API_BASE}/articles/${slug}`, { next: { revalidate: REVALIDATE_SECONDS } });
    return response.ok ? ((await response.json()) as Article) : null;
  } catch {
    return null;
  }
});
