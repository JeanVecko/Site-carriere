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
  has_cover?: boolean;
  views?: number;
  public_until?: string | null;
  hidden?: boolean;
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

// Coordonnées affichées dans le pied de page (le téléphone n'apparaît que s'il est renseigné).
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "carrieresrdc@gmail.com";
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+243 898 887 099";

// Réseaux où les offres sont aussi publiées (à renseigner dans les variables d'environnement).
// Un réseau sans lien (chaîne vide) n'est pas affiché.
export const TIKTOK_URL = process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/@carrieresrdc";
export const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://web.facebook.com/people/Carri%C3%A8res-RDC/61595124292252/";
export const WHATSAPP_CHANNEL_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "https://whatsapp.com/channel/0029VbC3FGn7z4kbQ6ZEck0Q";

export const CONTRACT_TYPES =["CDI", "CDD", "Stage", "Consultance", "Temps partiel", "Intérim", "Bénévolat", "Autre"];

export function slugify(value: string): string {
  return decodeEntities(value)
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

// Date relative courte : « aujourd’hui », « hier », « il y a 3 jours »…
export function timeAgo(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Aujourd’hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaine${days >= 14 ? "s" : ""}`;
  return formatDate(value);
}

// Nombre de jours restants avant la date limite (négatif si dépassée), ou null sans date limite.
export function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  const end = new Date(`${deadline}T23:59:59`).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000) - 1;
}

// Initiale et teinte stable pour l'avatar d'un employeur.
export function companyAvatar(name?: string): { initial: string; tone: number } {
  const text = decodeEntities(name || "?").trim();
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { initial: (text.charAt(0) || "?").toUpperCase(), tone: hash % 5 };
}

// Une offre est expirée le lendemain de sa date limite.
export function isExpired(item: { deadline?: string | null }): boolean {
  if (!item.deadline) return false;
  return new Date(`${item.deadline}T23:59:59`).getTime() < Date.now();
}

// Transforme le champ « comment postuler » en lien cliquable : un lien web (même écrit dans une phrase, ou
// commençant par « www. ») s'ouvre tel quel ; une adresse e-mail ouvre la messagerie avec l'objet pré-rempli.
// Renvoie null s'il n'y a ni lien ni e-mail (adresse de dépôt physique, par exemple).
export function applyLink(contact?: string, offerTitle?: string): string | null {
  return applyTarget(contact, offerTitle)?.href ?? null;
}

export type ApplyTarget = { href: string; kind: "web" | "email" | "whatsapp" | "phone" };

// Numéro congolais (+243 / 00243 / 0, suivi de 9 chiffres commençant par 8 ou 9) → « 243XXXXXXXXX ».
function congoPhone(text: string): string | null {
  for (const match of text.matchAll(/(?:\+|00)?[\d][\d\s.\-()]{7,}\d/g)) {
    let digits = match[0].replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length === 10 && digits.startsWith("0")) digits = `243${digits.slice(1)}`;
    if (digits.length === 9 && /^[89]/.test(digits)) digits = `243${digits}`;
    if (/^243[89]\d{8}$/.test(digits)) return digits;
  }
  return null;
}

// Détermine où mène le bouton « Postuler » : lien web, e-mail, WhatsApp ou appel téléphonique.
export function applyTarget(contact?: string, offerTitle?: string): ApplyTarget | null {
  const value = String(contact || "").trim();
  const title = offerTitle ? decodeEntities(offerTitle) : "";
  const url = value.match(/\bhttps?:\/\/[^\s<>"']+/i)?.[0] ?? value.match(/\bwww\.[^\s<>"']+\.[a-z]{2,}[^\s<>"']*/i)?.[0];
  if (url) {
    const clean = url.replace(/[).,;:!?]+$/, "");
    const href = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    return { href, kind: /^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(href) ? "whatsapp" : "web" };
  }
  const email = value.match(/[^\s<>()"',;:]+@[^\s<>()"',;:]+\.[a-z]{2,}/i)?.[0];
  if (email) {
    const subject = title ? `?subject=${encodeURIComponent(`Candidature – ${title}`)}` : "";
    return { href: `mailto:${email}${subject}`, kind: "email" };
  }
  const phone = congoPhone(value);
  if (phone) {
    // « WhatsApp » mentionné : conversation WhatsApp avec un message pré-rempli ; sinon, appel téléphonique.
    if (/whats\s?app/i.test(value)) {
      const message = `Bonjour, je souhaite postuler à l’offre${title ? ` « ${title} »` : ""} vue sur Carrières RDC.`;
      return { href: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`, kind: "whatsapp" };
    }
    return { href: `tel:+${phone}`, kind: "phone" };
  }
  return null;
}

// Certaines anciennes publications ont été enregistrées avec des entités HTML (&#39;, &amp;…).
export function decodeEntities(value: unknown): string {
  return String(value ?? "")
    // Lettres « stylisées » copiées depuis LinkedIn / Facebook (𝗔𝗻𝗮𝗹𝘆𝘀𝘁𝗲, 𝑇𝑒𝑥𝑡𝑒…) → lettres normales,
    // sinon elles s'affichent en carrés dans les aperçus et Google ne les lit pas comme des mots.
    .replace(/[\u{1D400}-\u{1D7FF}]/gu, (char) => char.normalize("NFKC"))
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
