"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleCheck,
  CirclePlus,
  Eye,
  FileUp,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  TriangleAlert,
  Archive,
  CalendarPlus,
  Pencil,
  ChevronDown,
} from "lucide-react";
import {
  Announcement,
  AnnouncementMedia,
  termsFor,
  ContactMessage,
  adminHeaders,
  apiRequest,
  decodeEntities,
  detailHref,
  formatDate,
  isExpired,
} from "../lib/api";
import { CategorySplitChart, PublicationsChart, TopViewsChart } from "./AdminCharts";

const TOKEN_KEY = "carrieres-admin-token";
const AUTH_EVENT = "carrieres-admin-auth";

type Section = "dashboard" | "publish" | "offers" | "expired" | "messages";

const SECTIONS: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "publish", label: "Publier", icon: CirclePlus },
  { id: "offers", label: "Offres publiées", icon: BriefcaseBusiness },
  { id: "expired", label: "Offres expirées", icon: Archive },
  { id: "messages", label: "Messages", icon: Inbox },
];

// Jeton admin lu dans sessionStorage, sans décalage entre le rendu serveur et le navigateur.
// Rubrique ouverte gardée dans l'adresse (/admin#offres, /admin#modifier-36…) :
// un rechargement de la page rouvre la même rubrique, au même endroit.
const SECTION_HASHES: Record<Section, string> = {
  dashboard: "",
  publish: "publier",
  offers: "offres",
  expired: "expirees",
  messages: "messages",
};
const SCROLL_KEY = "carrieres-admin-scroll";
// Offres expirées déjà vues dans la rubrique « Offres expirées » (le badge ne compte que les nouvelles).
const SEEN_EXPIRED_KEY = "carrieres-admin-seen-expired";

function readLocation(): { section: Section; editId: string | null } {
  const hash = window.location.hash.replace(/^#/, "");
  const edit = /^modifier-(.+)$/.exec(hash);
  if (edit) return { section: "publish", editId: decodeURIComponent(edit[1]) };
  const section = (Object.keys(SECTION_HASHES) as Section[]).find((key) => SECTION_HASHES[key] === hash);
  return { section: section || "dashboard", editId: null };
}

// Libellés selon la catégorie choisie dans le formulaire.
const CATEGORY_WORDING: Record<string, { publish: string; edit: string; button: string; published: string; updated: string }> = {
  "Offre d’emploi": {
    publish: "Publier une offre d’emploi",
    edit: "Modifier une offre d’emploi",
    button: "Publier l’offre",
    published: "Offre d’emploi publiée avec succès.",
    updated: "Offre d’emploi modifiée avec succès.",
  },
  Annonce: {
    publish: "Publier une annonce",
    edit: "Modifier une annonce",
    button: "Publier l’annonce",
    published: "Annonce publiée avec succès.",
    updated: "Annonce modifiée avec succès.",
  },
  "Appel d’offre": {
    publish: "Publier un appel d’offres",
    edit: "Modifier un appel d’offres",
    button: "Publier l’appel d’offres",
    published: "Appel d’offres publié avec succès.",
    updated: "Appel d’offres modifié avec succès.",
  },
};
function wordingFor(category?: string | null) {
  return CATEGORY_WORDING[category || ""] || CATEGORY_WORDING["Offre d’emploi"];
}

// Demande au site de rafraîchir immédiatement ses pages (sinon jusqu'à 60 s de cache).
function refreshPublicSite() {
  void fetch("/api/revalidate", { method: "POST", headers: adminHeaders() }).catch(() => undefined);
}

function subscribeToken(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // stockage indisponible
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export default function AdminContent() {
  const token = useSyncExternalStore(subscribeToken, readToken, () => null);
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);

  if (!hydrated) return <div className="adm-loading" aria-hidden="true" />;
  return token ? <Dashboard /> : <LoginScreen />;
}

/* ===================== Connexion ===================== */

function LoginScreen() {
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await apiRequest<{ token: string; role?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (result.role !== "admin") throw new Error("Identifiants incorrects.");
      setToken(result.token);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Identifiants incorrects ou serveur indisponible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="adm-login">
      <div className="adm-login-card">
        <div className="adm-login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
          <img src="/LOGO/Logo.png" alt="" />
          <div>
            <strong>Carrières RDC</strong>
            <span>Espace d’administration</span>
          </div>
        </div>
        <h1>Connexion</h1>
        <p className="adm-muted">Accès réservé à l’administrateur du site.</p>
        <form className="adm-form" onSubmit={handleLogin}>
          <label className="adm-field">
            <span>Adresse e-mail</span>
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="adm-field">
            <span>Mot de passe</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {feedback && (
            <p className="adm-alert adm-alert-error" role="alert">
              <TriangleAlert size={16} /> {feedback}
            </p>
          )}
          <button className="adm-btn adm-btn-primary adm-btn-block" type="submit" disabled={pending}>
            <Lock size={16} /> {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <Link className="adm-login-back" href="/">
          ← Retour au site
        </Link>
      </div>
    </div>
  );
}

/* ===================== Tableau de bord ===================== */

function Dashboard() {
  // Rendu seulement dans le navigateur (après hydratation) : l'adresse peut être lue dès le départ.
  const [initialLocation] = useState(readLocation);
  const [section, setSection] = useState<Section>(initialLocation.section);
  // Publication à rouvrir en modification après rechargement (#modifier-36), une fois les données chargées.
  const pendingEditId = useRef<string | null>(initialLocation.editId);
  // Position de défilement à restaurer après rechargement, une fois les données affichées.
  const pendingScroll = useRef<number | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [extending, setExtending] = useState<Announcement | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  // Catégorie choisie dans le formulaire de publication (pour le titre de la page).
  const [formCategory, setFormCategory] = useState("Offre d’emploi");
  const [seenExpired, setSeenExpired] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SEEN_EXPIRED_KEY) || "[]") as string[];
    } catch {
      return [];
    }
  });

  const logout = useCallback(() => setToken(null), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [offers, inbox] = await Promise.all([
        apiRequest<Announcement[]>("/admin/announcements", { headers: adminHeaders() }),
        apiRequest<ContactMessage[]>("/messages", { headers: adminHeaders() }),
      ]);
      setAnnouncements(offers);
      setMessages(inbox);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les données.";
      // Session expirée : retour à l'écran de connexion.
      if (/session|authentification|superadmin/i.test(message)) return logout();
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  // Rubrique (et publication en cours de modification) écrite dans l'adresse, sans ajouter d'historique.
  useEffect(() => {
    const hash = editing ? `modifier-${encodeURIComponent(String(editing.id))}` : SECTION_HASHES[section];
    if (pendingEditId.current) return; // pas avant d'avoir rouvert la publication demandée
    const url = `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, "", url);
  }, [section, editing]);

  // Position de défilement : mémorisée pour la rubrique ouverte, restaurée après un rechargement.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "null") as { hash: string; y: number } | null;
      if (saved && saved.hash === window.location.hash) pendingScroll.current = saved.y;
    } catch {
      // stockage indisponible
    }
    const saveNow = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ hash: window.location.hash, y: Math.round(window.scrollY) }));
      } catch {
        // stockage indisponible
      }
    };
    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(saveNow, 150);
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", saveNow); // juste avant le rechargement
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", save);
      window.removeEventListener("pagehide", saveNow);
    };
  }, []);

  // Après le premier chargement des données : rouvre la publication en modification et le défilement.
  useEffect(() => {
    if (loading) return;
    if (pendingEditId.current) {
      const item = announcements.find((entry) => String(entry.id) === pendingEditId.current);
      pendingEditId.current = null;
      if (item) setEditing(item);
      else setSection("offers"); // publication supprimée entre-temps
    }
    if (pendingScroll.current != null) {
      const y = pendingScroll.current;
      pendingScroll.current = null;
      window.setTimeout(() => window.scrollTo({ top: y, left: 0, behavior: "instant" }), 0);
    }
  }, [loading, announcements]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    // Même règle que les listes « Offres publiées » / « Offres expirées » : les compteurs correspondent toujours.
    const open = announcements.filter((item) => offerStatus(item) === "open");
    return {
      open: open.length,
      expired: announcements.length - open.length,
      hidden: announcements.filter((item) => item.hidden).length,
      views: announcements.reduce((total, item) => total + Number(item.views || 0), 0),
      messages: messages.length,
      unread: messages.filter((message) => !message.read_at).length,
      // Offres expirées pas encore vues dans la rubrique « Offres expirées » (mémorisé dans ce navigateur).
      newExpired: announcements.filter((item) => offerStatus(item) !== "open" && !seenExpired.includes(String(item.id))).length,
    };
  }, [announcements, messages, seenExpired]);

  // Rubrique « Offres expirées » ouverte : toutes les offres expirées affichées sont considérées comme vues.
  useEffect(() => {
    if (section !== "expired" || loading) return;
    const ids = announcements.filter((item) => offerStatus(item) !== "open").map((item) => String(item.id));
    if (ids.every((id) => seenExpired.includes(id))) return;
    const timer = window.setTimeout(() => {
      setSeenExpired(ids);
      try {
        localStorage.setItem(SEEN_EXPIRED_KEY, JSON.stringify(ids));
      } catch {
        // stockage indisponible
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [section, loading, announcements, seenExpired]);

  // Message ouvert : marqué comme lu (aussitôt à l'écran, puis enregistré sur le serveur).
  function markRead(message: ContactMessage) {
    if (message.read_at) return;
    const now = new Date().toISOString();
    setMessages((list) => list.map((entry) => (entry.id === message.id ? { ...entry, read_at: now } : entry)));
    apiRequest(`/messages/${message.id}/read`, { method: "PATCH", headers: adminHeaders() }).catch(() => {
      // sans conséquence : il sera de nouveau compté comme non lu au prochain chargement
    });
  }

  async function deleteAnnouncement(item: Announcement) {
    if (!window.confirm(`Supprimer définitivement « ${decodeEntities(item.title)} » ? Cette action est irréversible.`)) return;
    try {
      await apiRequest(`/announcements/${item.id}`, { method: "DELETE", headers: adminHeaders() });
      setAnnouncements((list) => list.filter((entry) => entry.id !== item.id));
      refreshPublicSite();
      setToast({ type: "success", text: "Publication supprimée." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Suppression impossible." });
    }
  }

  async function extendDeadline(item: Announcement, deadline: string) {
    await apiRequest(`/announcements/${item.id}/deadline`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ deadline }),
    });
    setExtending(null);
    refreshPublicSite();
    setToast({ type: "success", text: `Date prolongée jusqu’au ${formatDate(deadline)}.` });
    await loadAll();
  }

  async function deleteMessage(message: ContactMessage) {
    if (!window.confirm(`Supprimer le message de ${message.name} ?`)) return;
    try {
      await apiRequest(`/messages/${message.id}`, { method: "DELETE", headers: adminHeaders() });
      setMessages((list) => list.filter((entry) => entry.id !== message.id));
      setToast({ type: "success", text: "Message supprimé." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Suppression impossible." });
    }
  }

  const current = SECTIONS.find((entry) => entry.id === section)!;
  const wording = wordingFor(formCategory);
  const heading = section === "publish" ? (editing ? wording.edit : wording.publish) : current.label;

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
          <img src="/LOGO/Logo.png" alt="" />
          <div>
            <strong>Carrières RDC</strong>
            <span>Administration</span>
          </div>
        </div>
        <nav className="adm-nav" aria-label="Administration">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={section === id ? "is-active" : undefined}
              aria-current={section === id ? "page" : undefined}
              onClick={() => {
                setEditing(null);
                setSection(id);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "messages" && stats.unread > 0 && (
                <em className="adm-badge" title="Messages non lus">{stats.unread}</em>
              )}
              {id === "expired" && stats.newExpired > 0 && (
                <em className="adm-badge adm-badge-muted" title="Nouvelles offres expirées">{stats.newExpired}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <Link href="/" target="_blank">
            <ArrowUpRight size={17} /> <span>Voir le site</span>
          </Link>
          <button type="button" onClick={logout}>
            <LogOut size={17} /> <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <div>
            <p className="adm-breadcrumb">Administration / {editing ? "Offres publiées" : current.label}</p>
            <h1>{heading}</h1>
          </div>
          <div className="adm-topbar-actions">
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => void loadAll()} disabled={loading}>
              <RefreshCw size={16} className={loading ? "adm-spin" : undefined} /> Actualiser
            </button>
            {section !== "publish" && (
              <button type="button" className="adm-btn adm-btn-primary" onClick={() => setSection("publish")}>
                <CirclePlus size={16} /> Nouvelle publication
              </button>
            )}
          </div>
        </header>

        {loadError && (
          <p className="adm-alert adm-alert-error" role="alert">
            <TriangleAlert size={16} /> {loadError}
          </p>
        )}

        {section === "dashboard" && (
          <DashboardHome
            stats={stats}
            announcements={announcements}
            messages={messages}
            loading={loading}
            goTo={setSection}
          />
        )}
        {section === "publish" && (
          <PublishForm
            key={editing ? String(editing.id) : "new"}
            initial={editing}
            onCategoryChange={setFormCategory}
            onCancel={() => {
              setEditing(null);
              setSection("offers");
            }}
            onSaved={async (mode, category) => {
              refreshPublicSite();
              const saved = wordingFor(category);
              setToast({ type: "success", text: mode === "updated" ? saved.updated : saved.published });
              setEditing(null);
              await loadAll();
              setSection("offers");
            }}
          />
        )}
        {(section === "offers" || section === "expired") && (
          <OffersTable
            key={section}
            mode={section === "expired" ? "expired" : "active"}
            announcements={announcements}
            loading={loading}
            onDelete={deleteAnnouncement}
            onExtend={setExtending}
            onEdit={(item) => {
              setEditing(item);
              setSection("publish");
            }}
          />
        )}
        {section === "messages" && (
          <>
            <EmailAlertTest />
            <MessagesList
              messages={messages}
              loading={loading}
              onDelete={deleteMessage}
              onOpen={markRead}
              onReplied={(id, reply, repliedAt) => {
                setMessages((list) =>
                  list.map((entry) => (entry.id === id ? { ...entry, reply, replied_at: repliedAt, read_at: entry.read_at || repliedAt } : entry))
                );
                setToast({ type: "success", text: "Réponse envoyée par e-mail." });
              }}
            />
          </>
        )}
      </div>

      {extending && (
        <ExtendDialog item={extending} onClose={() => setExtending(null)} onSave={(deadline) => extendDeadline(extending, deadline)} />
      )}

      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`} role="status">
          {toast.type === "success" ? <CircleCheck size={18} /> : <TriangleAlert size={18} />} {toast.text}
        </div>
      )}
    </div>
  );
}

/* ----- Vue d'ensemble ----- */

function DashboardHome({
  stats,
  announcements,
  messages,
  loading,
  goTo,
}: {
  stats: { open: number; expired: number; hidden: number; views: number; messages: number };
  announcements: Announcement[];
  messages: ContactMessage[];
  loading: boolean;
  goTo: (section: Section) => void;
}) {
  const soon = announcements
    .filter((item) => item.deadline && !isExpired(item))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .slice(0, 5);
  const cards = [
    { label: "Offres en ligne", value: stats.open, icon: BriefcaseBusiness, tone: "blue" },
    { label: "Offres expirées", value: stats.expired, icon: CalendarClock, tone: "amber" },
    { label: "Consultations d’offres", value: stats.views, icon: Eye, tone: "green" },
    { label: "Messages reçus", value: stats.messages, icon: Mail, tone: "violet" },
  ];

  return (
    <>
      <section className="adm-kpis" aria-label="Indicateurs">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className={`adm-kpi adm-kpi-${tone}`}>
            <span className="adm-kpi-icon">
              <Icon size={20} />
            </span>
            <div>
              <strong>{loading ? "—" : value.toLocaleString("fr-FR")}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </section>

      <div className="adm-grid-chart">
        <section className="adm-card">
          <header className="adm-card-header">
            <h2>Publications par mois</h2>
          </header>
          <PublicationsChart announcements={announcements} />
        </section>
        <section className="adm-card">
          <header className="adm-card-header">
            <h2>Répartition par catégorie</h2>
          </header>
          <CategorySplitChart announcements={announcements} />
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-card">
          <header className="adm-card-header">
            <h2>Offres les plus consultées</h2>
            <button type="button" className="adm-link" onClick={() => goTo("offers")}>
              Tout voir <ArrowRight size={14} />
            </button>
          </header>
          <TopViewsChart announcements={announcements} />
        </section>

        <section className="adm-card">
          <header className="adm-card-header">
            <h2>Dates limites à venir</h2>
          </header>
          {soon.length === 0 ? (
            <EmptyState text="Aucune offre avec une date limite à venir." />
          ) : (
            <ul className="adm-rank">
              {soon.map((item) => (
                <li key={String(item.id)}>
                  <Link href={detailHref(item)} target="_blank">
                    {decodeEntities(item.title)}
                  </Link>
                  <span>{formatDate(item.deadline)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="adm-card">
        <header className="adm-card-header">
          <h2>Derniers messages</h2>
          <button type="button" className="adm-link" onClick={() => goTo("messages")}>
            Tout voir <ArrowRight size={14} />
          </button>
        </header>
        {messages.length === 0 ? (
          <EmptyState text="Aucun message reçu." />
        ) : (
          <ul className="adm-rank">
            {messages.slice(0, 4).map((message) => (
              <li key={String(message.id)}>
                <span className="adm-ellipsis">
                  <strong>{message.name}</strong> — {message.subject}
                </span>
                <span>{formatDate(message.created_at || message.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ----- Publication et modification ----- */

function PublishForm({
  initial,
  onSaved,
  onCancel,
  onCategoryChange,
}: {
  initial?: Announcement | null;
  onSaved: (mode: "created" | "updated", category: string) => Promise<void>;
  onCancel?: () => void;
  onCategoryChange?: (category: string) => void;
}) {
  const editing = Boolean(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [category, setCategoryState] = useState(initial?.category || "Offre d’emploi");
  const setCategory = (value: string) => {
    setCategoryState(value);
    onCategoryChange?.(value);
  };
  // Le titre de la page suit la catégorie de la publication ouverte.
  useEffect(() => {
    onCategoryChange?.(initial?.category || "Offre d’emploi");
  }, [initial, onCategoryChange]);
  const text = (value?: string | null) => (value ? decodeEntities(value) : "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError("");
    try {
      const mediaInput = form.elements.namedItem("media") as HTMLInputElement | null;
      const files = mediaInput?.files || null;
      const media = await filesToMedia(files);
      const values = Object.fromEntries(new FormData(form));
      if (initial) {
        // Sans nouveau fichier, les pièces jointes actuelles sont conservées.
        await apiRequest(`/announcements/${initial.id}`, {
          method: "PUT",
          headers: adminHeaders(),
          body: JSON.stringify({ ...values, media, keep_media: !files || files.length === 0 }),
        });
        await onSaved("updated", category);
      } else {
        await apiRequest("/announcements", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({ ...values, media }),
        });
        form.reset();
        setCategory("Offre d’emploi");
        await onSaved("created", String(values.category || category));
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setPending(false);
    }
  }

  const isJob = category === "Offre d’emploi";
  const needsContact = category !== "Annonce";
  const isNotice = category === "Annonce";
  const terms = termsFor(category);

  return (
    <form className="adm-card adm-publish" onSubmit={handleSubmit}>
      {initial && (
        <p className="adm-info adm-info-inline">
          <Pencil size={16} /> Vous modifiez « {text(initial.title)} ». Les vues et la date de publication sont conservées.
        </p>
      )}
      <fieldset>
        <legend>Informations générales</legend>
        <div className="adm-row">
          <label className="adm-field">
            <span>Catégorie *</span>
            <select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Offre d’emploi</option>
              <option>Annonce</option>
              <option>Appel d’offre</option>
            </select>
          </label>
          <label className="adm-field adm-span-2">
            <span>Intitulé *</span>
            <input name="title" type="text" required placeholder={terms.titlePlaceholder} defaultValue={text(initial?.title)} />
          </label>
        </div>
        <div className="adm-row">
          <label className="adm-field">
            <span>{isNotice ? "Organisateur *" : "Organisation / employeur *"}</span>
            <input name="company" type="text" required placeholder="Ex. Banque du Kivu" defaultValue={text(initial?.company)} />
          </label>
          <label className="adm-field">
            <span>Localisation *</span>
            <input name="location" type="text" required placeholder="Ex. Kinshasa · Gombe" defaultValue={text(initial?.location)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{isNotice ? "Détails" : "Conditions"}</legend>
        <div className="adm-row adm-row-3">
          <label className="adm-field">
            <span>
              {terms.typeLabel} {isJob && "*"}
            </span>
            {/* key : la liste change avec la catégorie (types de contrat ou types d’annonce). */}
            <select
              key={terms.typeLabel}
              name="contract_type"
              defaultValue={terms.types.includes(initial?.contract_type || "") ? initial?.contract_type : ""}
              required={isJob}
            >
              <option value="">— Choisir —</option>
              {terms.types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>{terms.deadlineLabel}</span>
            <input name="deadline" type="date" defaultValue={initial?.deadline || ""} />
          </label>
          <label className="adm-field">
            <span>{terms.priceLabel}</span>
            <input name="salary" type="text" placeholder={terms.pricePlaceholder} defaultValue={text(initial?.salary)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Description</legend>
        <label className="adm-field">
          <span>{terms.descriptionLabel}</span>
          <textarea
            name="description"
            rows={7}
            minLength={30}
            required
            defaultValue={text(initial?.description)}
            placeholder="Obligatoire même si une image est jointe : Google et les lecteurs d’écran ne lisent pas le texte des images."
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{terms.contactLegend}</legend>
        <div className="adm-row">
          <label className="adm-field">
            <span>
              {terms.contactLabel} {needsContact && "*"}
            </span>
            <input
              name="apply_contact"
              type="text"
              required={needsContact}
              placeholder={terms.contactPlaceholder}
              defaultValue={text(initial?.apply_contact)}
            />
          </label>
          <label className="adm-field">
            <span>Lien source</span>
            <input name="source_url" type="url" placeholder="Ex. lien de la vidéo TikTok" defaultValue={initial?.source_url || ""} />
          </label>
        </div>
        <label className="adm-field adm-file">
          <span>
            {editing
              ? `Pièces jointes — ${Number(initial?.media_count || 0)} actuellement. Choisissez des fichiers seulement pour les remplacer.`
              : "Pièces jointes (image ou PDF, facultatif)"}
          </span>
          <span className="adm-file-control">
            <FileUp size={18} />
            <input name="media" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple />
          </span>
          <small>JPG, PNG, WEBP ou PDF — images compressées automatiquement, 4 Mo au total.</small>
        </label>
      </fieldset>

      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <TriangleAlert size={16} /> {error}
        </p>
      )}
      <div className="adm-form-actions">
        {editing ? (
          <button className="adm-btn adm-btn-ghost" type="button" onClick={onCancel}>
            Annuler
          </button>
        ) : (
          <button className="adm-btn adm-btn-ghost" type="reset" onClick={() => setCategory("Offre d’emploi")}>
            Effacer
          </button>
        )}
        <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>
          <Send size={16} /> {pending ? "Enregistrement…" : editing ? "Enregistrer les modifications" : wordingFor(category).button}
        </button>
      </div>
    </form>
  );
}

/* ----- Tableau des offres ----- */

type OfferStatus = "open" | "grace" | "hidden";

// En ligne → expirée mais encore visible 24 h (« grace ») → retirée du site (visible seulement ici).
function offerStatus(item: Announcement): OfferStatus {
  if (item.hidden) return "hidden";
  return isExpired(item) ? "grace" : "open";
}

const STATUS_LABELS: Record<OfferStatus, string> = {
  open: "En ligne",
  grace: "Expirée · retrait sous 24 h",
  hidden: "Retirée du site",
};

function OffersTable({
  mode,
  announcements,
  loading,
  onDelete,
  onExtend,
  onEdit,
}: {
  mode: "active" | "expired";
  announcements: Announcement[];
  loading: boolean;
  onDelete: (item: Announcement) => void;
  onExtend: (item: Announcement) => void;
  onEdit: (item: Announcement) => void;
}) {
  const [query, setQuery] = useState("");
  // Offres expirées : toutes celles dont la date limite est passée (encore visibles 24 h, ou déjà retirées).
  const [filter, setFilter] = useState<"all" | "grace" | "hidden">("all");
  const needle = query.trim().toLowerCase();
  const scoped = announcements.filter((item) => (mode === "expired" ? offerStatus(item) !== "open" : offerStatus(item) === "open"));
  const rows = scoped.filter((item) => {
    if (mode === "expired" && filter !== "all" && offerStatus(item) !== filter) return false;
    return decodeEntities(`${item.title} ${item.company} ${item.location} ${item.category}`).toLowerCase().includes(needle);
  });

  return (
    <section className="adm-card adm-card-flush">
      {mode === "expired" && (
        <p className="adm-info">
          <Archive size={16} /> Une offre expirée reste visible sur le site 24 h après sa date limite, puis elle est
          retirée. Prolongez la date pour la remettre en ligne.
        </p>
      )}
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Rechercher une offre…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher une offre"
          />
        </label>
        {mode === "expired" && (
          <div className="adm-segmented" role="group" aria-label="Filtrer">
            {(
              [
                ["all", "Toutes"],
                ["grace", "Encore visibles (24 h)"],
                ["hidden", "Retirées du site"],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" className={filter === value ? "is-active" : undefined} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {loading && announcements.length === 0 ? (
        <EmptyState text="Chargement…" />
      ) : rows.length === 0 ? (
        <EmptyState text={mode === "expired" ? "Aucune offre expirée." : "Aucune offre ne correspond."} />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Offre</th>
                <th>Catégorie</th>
                <th>Expiration</th>
                <th>Statut</th>
                <th className="adm-num">Vues</th>
                <th className="adm-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const status = offerStatus(item);
                return (
                  <tr key={String(item.id)}>
                    <td>
                      <strong>{decodeEntities(item.title)}</strong>
                      <span>
                        {decodeEntities(item.company)} · {decodeEntities(item.location)}
                        {item.contract_type ? ` · ${item.contract_type}` : ""}
                      </span>
                    </td>
                    <td>{item.category}</td>
                    <td>
                      {item.deadline ? formatDate(item.deadline) : "Non précisée"}
                      <small>Publiée le {formatDate(item.created_at)}</small>
                    </td>
                    <td>
                      <span className={`adm-status is-${status}`}>{STATUS_LABELS[status]}</span>
                    </td>
                    <td className="adm-num">{Number(item.views || 0).toLocaleString("fr-FR")}</td>
                    <td className="adm-actions-col">
                      <button
                        type="button"
                        className="adm-icon-btn"
                        onClick={() => onEdit(item)}
                        title="Modifier"
                        aria-label={`Modifier ${item.title}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="adm-icon-btn is-accent"
                        onClick={() => onExtend(item)}
                        title="Prolonger la date"
                        aria-label={`Prolonger la date de ${item.title}`}
                      >
                        <CalendarPlus size={16} />
                      </button>
                      {status !== "hidden" && (
                        <Link className="adm-icon-btn" href={detailHref(item)} target="_blank" title="Voir l’offre" aria-label="Voir l’offre">
                          <Eye size={16} />
                        </Link>
                      )}
                      <button type="button" className="adm-icon-btn is-danger" onClick={() => onDelete(item)} title="Supprimer" aria-label={`Supprimer ${item.title}`}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="adm-table-footer">
        {rows.length} offre{rows.length > 1 ? "s" : ""} affichée{rows.length > 1 ? "s" : ""} sur {scoped.length}
      </p>
    </section>
  );
}

/* ----- Prolongation de la date d'expiration ----- */

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ExtendDialog({
  item,
  onClose,
  onSave,
}: {
  item: Announcement;
  onClose: () => void;
  onSave: (deadline: string) => Promise<void>;
}) {
  const today = toIsoDate(new Date());
  // Les raccourcis partent de la date actuelle si elle est encore à venir, sinon d'aujourd'hui.
  const base = item.deadline && item.deadline > today ? new Date(`${item.deadline}T12:00:00`) : new Date();
  const plus = (days: number) => toIsoDate(new Date(base.getTime() + days * 86_400_000));
  const [value, setValue] = useState(plus(14));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!value || value < today) return setError("Choisissez une date à partir d’aujourd’hui.");
    setPending(true);
    setError("");
    try {
      await onSave(value);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible de prolonger.");
      setPending(false);
    }
  }

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <form className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="extend-title" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2 id="extend-title">Prolonger la date d’expiration</h2>
        <p className="adm-muted-text">
          <strong>{decodeEntities(item.title)}</strong>
          <br />
          Date actuelle : {item.deadline ? formatDate(item.deadline) : "non précisée"}
        </p>
        <div className="adm-quick-dates">
          {[7, 14, 30].map((days) => (
            <button key={days} type="button" className={value === plus(days) ? "is-active" : undefined} onClick={() => setValue(plus(days))}>
              + {days} jours
            </button>
          ))}
        </div>
        <label className="adm-field">
          <span>Nouvelle date d’expiration</span>
          <input type="date" min={today} value={value} onChange={(event) => setValue(event.target.value)} required />
        </label>
        <p className="adm-muted-text">L’offre restera en ligne jusqu’au lendemain de cette date, puis passera dans « Offres expirées ».</p>
        {error && (
          <p className="adm-alert adm-alert-error" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        <div className="adm-form-actions">
          <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={pending}>
            <CalendarPlus size={16} /> {pending ? "Enregistrement…" : "Prolonger"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ----- Messages ----- */

// Vérifie que les alertes e-mail des messages de contact partent bien, et affiche la cause sinon.
function EmailAlertTest() {
  const [state, setState] = useState<{ status: "idle" | "pending" | "ok" | "error"; text: string }>({ status: "idle", text: "" });

  async function runTest() {
    setState({ status: "pending", text: "" });
    try {
      const result = await apiRequest<{ to: string; methods: string }>("/admin/test-email", { method: "POST", headers: adminHeaders() });
      setState({ status: "ok", text: `E-mail de test envoyé à ${result.to} (via ${result.methods}). Vérifiez aussi le dossier Spam.` });
    } catch (error) {
      setState({ status: "error", text: error instanceof Error ? error.message : "Envoi impossible." });
    }
  }

  return (
    <section className="adm-card adm-email-test">
      <div>
        <h2>Alerte e-mail des messages</h2>
        <p className="adm-muted-text">Chaque message reçu vous est aussi envoyé par e-mail. Testez l’envoi ici.</p>
      </div>
      <button type="button" className="adm-btn adm-btn-ghost" onClick={runTest} disabled={state.status === "pending"}>
        <Mail size={16} /> {state.status === "pending" ? "Envoi…" : "Tester l’alerte e-mail"}
      </button>
      {state.status === "ok" && (
        <p className="adm-alert adm-alert-success" role="status">
          <CircleCheck size={16} /> {state.text}
        </p>
      )}
      {state.status === "error" && (
        <p className="adm-alert adm-alert-error" role="alert">
          <TriangleAlert size={16} /> {state.text}
        </p>
      )}
    </section>
  );
}

function MessagesList({
  messages,
  loading,
  onDelete,
  onOpen,
  onReplied,
}: {
  messages: ContactMessage[];
  loading: boolean;
  onDelete: (message: ContactMessage) => void;
  onOpen: (message: ContactMessage) => void;
  onReplied: (id: ContactMessage["id"], reply: string, repliedAt: string) => void;
}) {
  const [replyingTo, setReplyingTo] = useState<ContactMessage["id"] | null>(null);
  // Un seul message déplié à la fois ; la liste reste compacte (nom, objet, début du message, date).
  const [openId, setOpenId] = useState<ContactMessage["id"] | null>(null);
  if (loading && messages.length === 0) return <section className="adm-card"><EmptyState text="Chargement…" /></section>;
  if (messages.length === 0) return <section className="adm-card"><EmptyState text="Aucun message reçu pour le moment." /></section>;
  const unread = messages.filter((message) => !message.read_at).length;

  return (
    <section className="adm-card adm-inbox">
      <header className="adm-card-header">
        <h2>Boîte de réception</h2>
        <span className="adm-muted">
          {messages.length} message{messages.length > 1 ? "s" : ""}
          {unread > 0 ? ` · ${unread} non lu${unread > 1 ? "s" : ""}` : ""}
        </span>
      </header>
      <ul className="adm-inbox-list">
      {messages.map((message) => {
        const isOpen = openId === message.id;
        const isUnread = !message.read_at;
        return (
        <li key={String(message.id)} className={`adm-inbox-item${isOpen ? " is-open" : ""}${isUnread ? " is-unread" : ""}`}>
          <button
            type="button"
            className="adm-inbox-row"
            aria-expanded={isOpen}
            onClick={() => {
              setOpenId(isOpen ? null : message.id);
              if (!isOpen) {
                setReplyingTo(null);
                onOpen(message);
              }
            }}
          >
            <span className="adm-avatar" aria-hidden="true">
              {message.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span className="adm-inbox-text">
              <span className="adm-inbox-top">
                <strong className="adm-ellipsis">{message.name}</strong>
                {isUnread && <em className="adm-inbox-dot" aria-label="Non lu" />}
                {message.reply && (
                  <span className="adm-inbox-replied" title="Répondu">
                    <Reply size={12} /> Répondu
                  </span>
                )}
                <time>{formatDate(message.created_at || message.date)}</time>
              </span>
              <span className="adm-inbox-preview adm-ellipsis">
                <b>{message.subject}</b> — {message.message.replace(/\s+/g, " ")}
              </span>
            </span>
            <ChevronDown size={16} className="adm-inbox-chevron" aria-hidden="true" />
          </button>
          {isOpen && (
        <div className="adm-message">
          <p className="adm-message-from">
            <a href={`mailto:${message.email}`}>{message.email}</a>
          </p>
          <h3>{message.subject}</h3>
          <p>{message.message}</p>
          {message.reply && (
            <div className="adm-message-reply">
              <span className="adm-message-reply-label">
                <CircleCheck size={14} /> Répondu{message.replied_at ? ` le ${formatDate(message.replied_at)}` : ""}
              </span>
              <p>{message.reply}</p>
            </div>
          )}
          {replyingTo === message.id ? (
            <ReplyForm
              message={message}
              onCancel={() => setReplyingTo(null)}
              onSent={(reply, repliedAt) => {
                setReplyingTo(null);
                onReplied(message.id, reply, repliedAt);
              }}
            />
          ) : (
            <footer>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setReplyingTo(message.id)}>
                <Reply size={15} /> {message.reply ? "Répondre à nouveau" : "Répondre"}
              </button>
              <button type="button" className="adm-btn adm-btn-danger-ghost" onClick={() => onDelete(message)}>
                <Trash2 size={15} /> Supprimer
              </button>
            </footer>
          )}
        </div>
          )}
        </li>
        );
      })}
      </ul>
    </section>
  );
}

// Réponse écrite dans l'admin et envoyée par e-mail à l'adresse que le visiteur a indiquée.
function ReplyForm({
  message,
  onCancel,
  onSent,
}: {
  message: ContactMessage;
  onCancel: () => void;
  onSent: (reply: string, repliedAt: string) => void;
}) {
  const [text, setText] = useState(`Bonjour ${message.name.trim()},\n\n`);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const saved = await apiRequest<{ reply: string; replied_at: string }>(`/messages/${message.id}/reply`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ reply: text }),
      });
      onSent(saved.reply, saved.replied_at);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "La réponse n’a pas pu être envoyée.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="adm-reply-form" onSubmit={send}>
      <label className="adm-field">
        <span>
          Votre réponse à <strong>{message.email}</strong>
        </span>
        <textarea
          rows={7}
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoFocus
          required
          maxLength={5000}
        />
      </label>
      <p className="adm-muted adm-reply-hint">
        Envoyée par e-mail avec l’objet « Re : {message.subject} », signée « L’équipe Carrières RDC ». Son message d’origine est cité en dessous.
      </p>
      {error && (
        <p className="adm-alert adm-alert-error" role="alert">
          <TriangleAlert size={16} /> {error}
        </p>
      )}
      <footer>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel} disabled={pending}>
          Annuler
        </button>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={pending || text.trim().length < 2}>
          <Send size={15} /> {pending ? "Envoi…" : "Envoyer la réponse"}
        </button>
      </footer>
    </form>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="adm-empty">{text}</p>;
}

/* ===================== Pièces jointes ===================== */

const ALLOWED_MEDIA_TYPES = new Set<AnnouncementMedia["type"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

async function filesToMedia(files: FileList | null): Promise<AnnouncementMedia[]> {
  const selectedFiles = Array.from(files || []);
  if (selectedFiles.some((file) => !ALLOWED_MEDIA_TYPES.has(file.type as AnnouncementMedia["type"]))) {
    throw new Error("Utilisez uniquement des fichiers JPG, PNG, WEBP ou PDF.");
  }
  const media = await Promise.all(
    selectedFiles.map(async (file) => {
      if (file.type.startsWith("image/")) return optimizeImage(file);
      return { name: file.name, type: file.type as AnnouncementMedia["type"], dataUrl: await readAsDataUrl(file) };
    })
  );
  const encodedSize = media.reduce((total, file) => total + file.dataUrl.length, 0);
  if (encodedSize > 5_500_000) throw new Error("La taille totale des fichiers ne doit pas dépasser 4 Mo après compression.");
  return media;
}

async function optimizeImage(file: File): Promise<AnnouncementMedia> {
  const source = await loadImage(file);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de préparer l’image.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { name: file.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.7) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de lire l’image sélectionnée."));
    image.src = URL.createObjectURL(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
