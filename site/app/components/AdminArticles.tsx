"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  BookOpenText,
  ExternalLink,
  Eye,
  EyeOff,
  Heading2,
  Heading3,
  ImagePlus,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { adminHeaders, apiRequest } from "../lib/api";
import { ARTICLE_CATEGORIES, AdminArticle, articleDate, articleHref } from "../lib/articles";
import { ARTICLE_TEMPLATES, ArticleTemplate } from "../lib/articleTemplates";
import { coverToDataUrl } from "../lib/media";
import ArticleBody from "./ArticleBody";
import { confirmDialog, promptDialog } from "./Dialogs";

type Toast = (toast: { type: "success" | "error"; text: string }) => void;
type Draft = { id?: number; status: "draft" | "published"; slug?: string; title: string; category: string; excerpt: string; body: string; cover: string | null; coverChanged: boolean };

const EMPTY: Draft = { status: "draft", title: "", category: ARTICLE_CATEGORIES[0], excerpt: "", body: "", cover: null, coverChanged: false };

// Conseils carrière : liste des articles, rédaction et publication (rien n'est visible avant « Publier »).
export default function AdminArticles({ setToast }: { setToast: Toast }) {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  // Rechargement de la liste : chaque appel à load() incrémente la version.
  const [version, setVersion] = useState(0);
  const load = useCallback(async () => setVersion((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    apiRequest<{ articles: AdminArticle[] }>("/admin/articles", { headers: adminHeaders() })
      .then((data) => {
        if (!active) return;
        setArticles(data.articles);
        setError("");
      })
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : "Chargement impossible."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [version]);

  async function edit(article: AdminArticle) {
    try {
      const full = await apiRequest<AdminArticle>(`/admin/articles/${article.id}`, { headers: adminHeaders() });
      setDraft({ id: full.id, status: full.status, slug: full.slug, title: full.title, category: full.category, excerpt: full.excerpt, body: full.body || "", cover: full.cover || null, coverChanged: false });
    } catch (editError) {
      setToast({ type: "error", text: editError instanceof Error ? editError.message : "Article introuvable." });
    }
  }

  async function togglePublish(article: AdminArticle) {
    const publish = article.status !== "published";
    const ok = await confirmDialog(
      publish
        ? { tone: "success", title: "Publier cet article ?", message: `« ${article.title} » sera visible sur le site, dans les Conseils carrière et sur Google.`, confirmLabel: "Publier" }
        : { tone: "warning", title: "Retirer cet article du site ?", message: `« ${article.title} » repassera en brouillon. Vous pourrez le republier plus tard.`, confirmLabel: "Retirer" }
    );
    if (!ok) return;
    try {
      await apiRequest(`/admin/articles/${article.id}/publish`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ published: publish }) });
      setToast({ type: "success", text: publish ? "Article publié." : "Article retiré du site." });
      await load();
    } catch (publishError) {
      setToast({ type: "error", text: publishError instanceof Error ? publishError.message : "Action impossible." });
    }
  }

  async function remove(article: AdminArticle) {
    if (!(await confirmDialog({ tone: "danger", title: "Supprimer cet article ?", message: `« ${article.title} » sera supprimé définitivement.`, confirmLabel: "Supprimer" }))) return;
    try {
      await apiRequest(`/admin/articles/${article.id}`, { method: "DELETE", headers: adminHeaders() });
      setToast({ type: "success", text: "Article supprimé." });
      await load();
    } catch (deleteError) {
      setToast({ type: "error", text: deleteError instanceof Error ? deleteError.message : "Suppression impossible." });
    }
  }

  if (draft) {
    return (
      <ArticleEditor
        initial={draft}
        onClose={() => setDraft(null)}
        onSaved={async (text) => {
          setToast({ type: "success", text });
          setDraft(null);
          await load();
        }}
        setToast={setToast}
      />
    );
  }

  const existing = new Set(articles.map((article) => article.title));
  const templates = ARTICLE_TEMPLATES.filter((template) => !existing.has(template.title));

  return (
    <div className="adm-articles">
      <section className="adm-card">
        <header className="adm-card-header adm-articles-head">
          <div>
            <h2>Conseils carrière</h2>
            <p>Les articles restent en brouillon, invisibles sur le site, tant que vous ne cliquez pas sur « Publier ».</p>
          </div>
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => setDraft({ ...EMPTY })}>
            <Plus size={16} /> Nouvel article
          </button>
        </header>

        {error && (
          <p className="adm-alert adm-alert-error" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        {loading && !articles.length ? (
          <p className="adm-muted">Chargement…</p>
        ) : articles.length === 0 ? (
          <p className="adm-muted">Aucun article pour le moment. Écrivez le premier, ou partez d’un modèle ci-dessous.</p>
        ) : (
          <ul className="adm-article-list">
            {articles.map((article) => (
              <li key={article.id}>
                <div className="adm-article-info">
                  <span className={`adm-article-status is-${article.status}`}>{article.status === "published" ? "Publié" : "Brouillon"}</span>
                  <strong>{article.title}</strong>
                  <small>
                    {article.category} · {article.reading_minutes} min de lecture ·{" "}
                    {article.status === "published" ? `publié le ${articleDate(article.published_at)}` : `modifié le ${articleDate(article.updated_at)}`}
                  </small>
                </div>
                <div className="adm-article-actions">
                  {article.status === "published" && (
                    <a className="adm-icon-btn" href={articleHref(article.slug)} target="_blank" rel="noreferrer" title="Voir sur le site" aria-label="Voir sur le site">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button type="button" className="adm-icon-btn" onClick={() => void edit(article)} title="Modifier" aria-label="Modifier">
                    <Pencil size={16} />
                  </button>
                  <button type="button" className={`adm-btn ${article.status === "published" ? "adm-btn-ghost" : "adm-btn-primary"}`} onClick={() => void togglePublish(article)}>
                    {article.status === "published" ? (
                      <>
                        <EyeOff size={15} /> Retirer
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Publier
                      </>
                    )}
                  </button>
                  <button type="button" className="adm-icon-btn adm-icon-danger" onClick={() => void remove(article)} title="Supprimer" aria-label="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {templates.length > 0 && (
        <section className="adm-card">
          <header className="adm-card-header">
            <h2>Partir d’un modèle</h2>
          </header>
          <p className="adm-muted">Des articles déjà rédigés, à relire et adapter. Ils s’ouvrent en brouillon : rien n’est publié sans votre clic.</p>
          <div className="adm-article-templates">
            {templates.map((template: ArticleTemplate) => (
              <button
                key={template.title}
                type="button"
                onClick={() => setDraft({ ...EMPTY, title: template.title, category: template.category, excerpt: template.excerpt, body: template.body })}
              >
                <BookOpenText size={20} />
                <span>
                  <strong>{template.title}</strong>
                  <small>{template.category}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ArticleEditor({ initial, onClose, onSaved, setToast }: { initial: Draft; onClose: () => void; onSaved: (text: string) => Promise<void>; setToast: Toast }) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  // Barre d'outils : insère la mise en forme autour de la sélection.
  function wrap(before: string, after = "", placeholder = "texte") {
    const element = area.current;
    if (!element) return;
    const { selectionStart: start, selectionEnd: end, value } = element;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    update({ body: next });
    window.requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }
  function linePrefix(prefix: string, placeholder: string) {
    const element = area.current;
    if (!element) return;
    const { selectionStart: start, selectionEnd: end, value } = element;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selected = value.slice(lineStart, end) || placeholder;
    const lines = selected.split("\n").map((line, index) => (prefix === "1. " ? `${index + 1}. ` : prefix) + line.replace(/^(#{2,3}\s|[-*•]\s|\d+[.)]\s|>\s?)/, ""));
    const next = value.slice(0, lineStart) + lines.join("\n") + value.slice(end);
    update({ body: next });
    window.requestAnimationFrame(() => element.focus());
  }
  async function link() {
    const url = await promptDialog({ tone: "info", title: "Ajouter un lien", label: "Adresse du lien", placeholder: "https://… ou /offres", required: true, confirmLabel: "Insérer" });
    if (!url) return;
    const href = /^(https?:\/\/|\/)/.test(url) ? url : `https://${url}`;
    wrap("[", `](${href})`, "texte du lien");
  }

  async function chooseCover(file: File | undefined) {
    if (!file) return;
    try {
      update({ cover: await coverToDataUrl(file), coverChanged: true });
    } catch (coverError) {
      setToast({ type: "error", text: coverError instanceof Error ? coverError.message : "Image illisible." });
    }
  }

  async function save(publish: boolean) {
    setError("");
    if (publish && !(await confirmDialog({ tone: "success", title: "Publier cet article ?", message: "Il sera visible sur le site, dans les Conseils carrière et sur Google.", confirmLabel: "Publier" }))) return;
    setSaving(true);
    try {
      const payload = {
        title: draft.title,
        category: draft.category,
        excerpt: draft.excerpt,
        body: draft.body,
        ...(draft.coverChanged ? { cover: draft.cover } : {}),
      };
      const saved = await apiRequest<{ id: number }>(draft.id ? `/admin/articles/${draft.id}` : "/admin/articles", {
        method: draft.id ? "PUT" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      if (publish) await apiRequest(`/admin/articles/${saved.id}/publish`, { method: "POST", headers: adminHeaders(), body: JSON.stringify({ published: true }) });
      await onSaved(publish ? "Article publié sur le site." : draft.status === "published" ? "Article mis à jour sur le site." : "Brouillon enregistré.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const excerptLength = draft.excerpt.trim().length;

  return (
    <div className="adm-article-editor">
      <div className="adm-article-editor-bar">
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onClose}>
          <ArrowLeft size={16} /> Retour aux articles
        </button>
        <span className={`adm-article-status is-${draft.status}`}>{draft.status === "published" ? "Publié" : "Brouillon"}</span>
      </div>

      <section className="adm-card adm-article-form">
        <label className="adm-field">
          <span>Titre</span>
          <input value={draft.title} maxLength={140} onChange={(event) => update({ title: event.target.value })} placeholder="Ex. Comment rédiger un CV qui retient l’attention" />
        </label>
        <div className="adm-greet-row">
          <label className="adm-field">
            <span>Catégorie</span>
            <select value={draft.category} onChange={(event) => update({ category: event.target.value })}>
              {ARTICLE_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <div className="adm-field">
            <span>Image de couverture (facultative)</span>
            <div className="adm-article-cover">
              {draft.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local
                <img src={draft.cover} alt="" />
              ) : (
                <span className="adm-article-cover-empty">
                  <ImagePlus size={18} /> Format 16:9 conseillé
                </span>
              )}
              <div>
                <label className="adm-btn adm-btn-ghost">
                  <ImagePlus size={15} /> {draft.cover ? "Changer" : "Choisir une image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void chooseCover(event.target.files?.[0])} />
                </label>
                {draft.cover && (
                  <button type="button" className="adm-btn adm-btn-danger-ghost" onClick={() => update({ cover: null, coverChanged: true })}>
                    Retirer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <label className="adm-field">
          <span>Résumé (affiché sur Google et dans la liste des conseils)</span>
          <textarea rows={2} value={draft.excerpt} maxLength={300} onChange={(event) => update({ excerpt: event.target.value })} />
          <small className={`adm-greet-count${excerptLength > 0 && (excerptLength < 40 || excerptLength > 170) ? " is-warn" : ""}`}>
            {excerptLength} caractères · idéal entre 120 et 160
          </small>
        </label>

        <div className="adm-field">
          <span className="adm-greet-label">
            Texte de l’article
            <span className="adm-segmented" role="tablist" aria-label="Mode">
              <button type="button" role="tab" aria-selected={tab === "write"} className={tab === "write" ? "is-active" : undefined} onClick={() => setTab("write")}>
                <Pencil size={14} /> Écrire
              </button>
              <button type="button" role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "is-active" : undefined} onClick={() => setTab("preview")}>
                <Eye size={14} /> Aperçu
              </button>
            </span>
          </span>
          {tab === "write" ? (
            <>
              <div className="adm-article-toolbar" role="toolbar" aria-label="Mise en forme">
                <button type="button" onClick={() => linePrefix("## ", "Titre de partie")} title="Titre de partie (##)">
                  <Heading2 size={16} />
                </button>
                <button type="button" onClick={() => linePrefix("### ", "Sous-titre")} title="Sous-titre (###)">
                  <Heading3 size={16} />
                </button>
                <button type="button" onClick={() => wrap("**", "**")} title="Gras (**texte**)">
                  <Bold size={16} />
                </button>
                <button type="button" onClick={() => linePrefix("- ", "élément")} title="Liste à puces (- )">
                  <List size={16} />
                </button>
                <button type="button" onClick={() => linePrefix("1. ", "étape")} title="Liste numérotée (1. )">
                  <ListOrdered size={16} />
                </button>
                <button type="button" onClick={() => linePrefix("> ", "Le point essentiel à retenir")} title="Encadré « À retenir » (> )">
                  <Lightbulb size={16} />
                </button>
                <button type="button" onClick={() => void link()} title="Lien [texte](adresse)">
                  <Link2 size={16} />
                </button>
              </div>
              <textarea ref={area} className="adm-article-text" rows={22} value={draft.body} onChange={(event) => update({ body: event.target.value })} />
              <small className="adm-muted">
                ## titre de partie · ### sous-titre · **gras** · « - » liste · « 1. » liste numérotée · « &gt; » encadré À retenir · [texte](lien). Une ligne vide sépare les paragraphes.
              </small>
            </>
          ) : (
            <div className="adm-article-preview">
              {draft.body.trim() ? <ArticleBody body={draft.body} /> : <p className="adm-muted">Rien à afficher pour l’instant.</p>}
            </div>
          )}
        </div>

        {error && (
          <p className="adm-alert adm-alert-error" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        <div className="adm-form-actions">
          {draft.status === "published" && draft.slug && (
            <a className="adm-btn adm-btn-ghost" href={articleHref(draft.slug)} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Voir sur le site
            </a>
          )}
          <button type="button" className={`adm-btn ${draft.status === "published" ? "adm-btn-primary" : "adm-btn-ghost"}`} disabled={saving} onClick={() => void save(false)}>
            {draft.status === "published" ? "Enregistrer les modifications" : "Enregistrer le brouillon"}
          </button>
          {draft.status !== "published" && (
            <button type="button" className="adm-btn adm-btn-primary" disabled={saving} onClick={() => void save(true)}>
              <Send size={16} /> Enregistrer et publier
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
