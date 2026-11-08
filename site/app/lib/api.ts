export const API_BASE = (
  process.env.NEXT_PUBLIC_CARRIERES_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://carrieres-rdc-api.onrender.com/api"
    : "http://localhost:10000/api")
).replace(/\/$/, "");

export type Announcement = {
  id?: number | string;
  _id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  category?: string;
  type?: string;
  date?: string;
  created_at?: string;
  media?: AnnouncementMedia[];
  media_count?: number;
  contract_type?: string;
  deadline?: string | null;
  apply_contact?: string;
  source_url?: string;
  salary?: string;
  author_email?: string;
  organization_name?: string;
};

export type AnnouncementMedia = {
  name: string;
  type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  dataUrl: string;
};

export type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
  id?: number | string;
  date?: string;
  created_at?: string;
};

export function adminHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = sessionStorage.getItem("carrieres-admin-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Veuillez vérifier que l’API Carrières RDC est démarrée."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let data: unknown = null;
  if (response.status !== 204 && isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const serverError = (data as { error?: string } | null)?.error;
    if (serverError) throw new Error(serverError);
    // Réponse HTML (404 Next.js / Express) au lieu de JSON : API pas à jour ou mauvaise URL
    if (!isJson)
      throw new Error(
        `L'API ne répond pas correctement (${response.status}). Vérifiez que la version déployée de l'API est à jour.`
      );
    throw new Error(`Erreur serveur (${response.status}). Veuillez réessayer plus tard.`);
  }
  return data as T;
}

export function escapeHtml(value: unknown): string {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] || character
  );
}

export function categoryFor(item: Announcement): string {
  return (
    item.category ||
    (item.type === "Emploi" ? "Offre d’emploi" : item.type === "Appel d’offre" ? "Appel d’offre" : "Annonce")
  );
}

// Réseaux où les offres sont aussi publiées (à renseigner dans les variables d'environnement).
export const TIKTOK_URL = process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/";
export const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/";
export const WHATSAPP_CHANNEL_URL = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "https://www.whatsapp.com/channel/";

export const CONTRACT_TYPES =["CDI", "CDD", "Stage", "Consultance", "Temps partiel", "Intérim", "Bénévolat", "Autre"];

export function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

// Adresse publique d'une offre, lisible par les moteurs de recherche : /offre/12-comptable-kinshasa
export function detailHref(item: { id?: number | string; _id?: string; title?: string }): string {
  const id = String(item.id ?? item._id ?? "");
  const slug = item.title ? slugify(item.title) : "";
  return `/offre/${encodeURIComponent(slug ? `${id}-${slug}` : id)}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Une offre est expirée le lendemain de sa date limite.
export function isExpired(item: { deadline?: string | null }): boolean {
  if (!item.deadline) return false;
  return new Date(`${item.deadline}T23:59:59`).getTime() < Date.now();
}

// Transforme le champ "comment postuler" en lien cliquable quand c'est un e-mail ou une URL.
export function applyLink(contact?: string): string | null {
  const value = String(contact || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return null;
}

// Certaines anciennes publications ont été enregistrées avec des entités HTML (&#39;, &amp;…).
export function decodeEntities(value: unknown): string {
  return String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function paragraphs(value: string): string[] {
  return decodeEntities(value)
    .split(/\n+|(?<=;)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
