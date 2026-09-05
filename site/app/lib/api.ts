export const API_BASE = (
  process.env.NEXT_PUBLIC_CARRIERES_API_URL ||
  "https://carrieres-rdc-api.onrender.com/api"
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
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error((data as { error?: string } | null)?.error || "La requête a échoué.");
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

export function detailHref(item: { id?: number | string; _id?: string }): string {
  return `/detail?id=${encodeURIComponent(String(item.id ?? item._id ?? ""))}`;
}

export function paragraphs(value: string): string[] {
  return String(value)
    .split(/\n+|(?<=;)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

// ============ SESSION UTILISATEUR (candidat / recruteur) ============
export type UserRole = "candidat" | "recruteur" | "admin";

export type SessionUser = {
  token: string;
  role: UserRole;
  email: string;
};

const TOKEN_KEY = "carrieres-token";
const ROLE_KEY = "carrieres-role";
const EMAIL_KEY = "carrieres-email";

export function saveSession(session: SessionUser) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(ROLE_KEY, session.role);
  localStorage.setItem(EMAIL_KEY, session.email);
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const role = localStorage.getItem(ROLE_KEY) as UserRole | null;
  const email = localStorage.getItem(EMAIL_KEY);
  if (!token || !role || !email) return null;
  return { token, role, email };
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function userHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export function dashboardHref(role: UserRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "recruteur") return "/dashboard/recruteur";
  return "/dashboard/candidat";
}
