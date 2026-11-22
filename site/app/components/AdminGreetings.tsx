"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Copy, Download, RefreshCw, Shuffle, Share2, TriangleAlert } from "lucide-react";
import { adminHeaders } from "../lib/api";
import {
  GREETING_FORMATS,
  GREETING_STYLES,
  GreetingFormat,
  GreetingStyle,
  OCCASIONS,
  Occasion,
  dayValue,
  greetingCaption,
  greetingText,
  parseDay,
  roundedCount,
  suggestOccasion,
  upcomingDates,
} from "../lib/greetings";
import { copyDialog } from "./Dialogs";

// Affiches de vœux aux couleurs de Carrières RDC (début de semaine, de mois, d'année, fêtes) à publier
// sur la page Facebook, la chaîne WhatsApp ou TikTok. Aperçu en direct, texte modifiable, image PNG.
export default function AdminGreetings({ openOffers }: { openOffers: number }) {
  const shortcuts = useMemo(() => upcomingDates(), []);
  // Par défaut : l’affiche de demain (le dimanche, celle du lundi).
  const [date, setDate] = useState(() => {
    const today = new Date();
    return dayValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  });
  const [occasion, setOccasion] = useState<Occasion>(() => suggestOccasion(parseDay(date)));
  const base = useMemo(() => greetingText(occasion, parseDay(date)), [occasion, date]);
  const [variant, setVariant] = useState(0);
  const [title, setTitle] = useState(base.title);
  const [eyebrow, setEyebrow] = useState(base.eyebrow);
  const [message, setMessage] = useState(base.messages[0]);
  const [caption, setCaption] = useState(greetingCaption(base.caption));
  const [format, setFormat] = useState<GreetingFormat>("square");
  const [style, setStyle] = useState<GreetingStyle>("navy");
  const [showStat, setShowStat] = useState(openOffers > 0);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const urlRef = useRef<string | null>(null);

  // Nouvelle date ou nouvelle occasion : textes proposés pour cette occasion.
  function applyText(nextOccasion: Occasion, nextDate: string) {
    const text = greetingText(nextOccasion, parseDay(nextDate));
    setVariant(0);
    setTitle(text.title);
    setEyebrow(text.eyebrow);
    setMessage(text.messages[0]);
    setCaption(greetingCaption(text.caption));
  }
  function chooseDate(value: string, forced?: Occasion) {
    if (!value) return;
    const nextOccasion = forced || suggestOccasion(parseDay(value));
    setDate(value);
    setOccasion(nextOccasion);
    applyText(nextOccasion, value);
  }
  function chooseOccasion(value: Occasion) {
    setOccasion(value);
    applyText(value, date);
  }
  function otherMessage() {
    const next = (variant + 1) % base.messages.length;
    setVariant(next);
    setMessage(base.messages[next]);
  }

  const stat = showStat && openOffers > 0 ? roundedCount(openOffers) : "";
  const payload = useMemo(
    () => JSON.stringify({ title, eyebrow, message, decor: base.decor, format, style, stat, statLabel: "offres, annonces et appels d’offres en ligne" }),
    [title, eyebrow, message, base.decor, format, style, stat]
  );

  // Aperçu régénéré peu après la dernière modification.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/souhait", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...adminHeaders() },
          body: payload,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.status === 403 ? "Session expirée : reconnectez-vous à l’admin." : "Image indisponible, réessayez.");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setImage({ url, blob });
      } catch (fetchError) {
        if (!controller.signal.aborted) setError(fetchError instanceof Error ? fetchError.message : "Image indisponible.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [payload]);
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const filename = `carrieres-rdc-voeux-${occasion}-${date}-${GREETING_FORMATS.find((entry) => entry.id === format)!.label.toLowerCase()}.png`;
  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator;

  async function share() {
    if (!image) return;
    const file = new File([image.blob], filename, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: caption });
      else throw new Error("partage indisponible");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      const link = document.createElement("a");
      link.href = image.url;
      link.download = filename;
      link.click();
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      void copyDialog({ title: "Copiez la légende", message: "La copie automatique n’est pas disponible sur cet appareil.", text: caption });
    }
  }

  const current = GREETING_FORMATS.find((entry) => entry.id === format)!;

  return (
    <div className="adm-greet">
      <section className="adm-card adm-greet-form">
        <header className="adm-card-header">
          <h2>Préparer une affiche de vœux</h2>
        </header>

        <div className="adm-greet-shortcuts" aria-label="Prochaines dates">
          {shortcuts.map((entry) => (
            <button
              key={entry.occasion}
              type="button"
              className={date === entry.date && occasion === entry.occasion ? "is-active" : undefined}
              onClick={() => chooseDate(entry.date, entry.occasion)}
            >
              <CalendarDays size={14} /> {entry.label}
            </button>
          ))}
        </div>

        <div className="adm-greet-row">
          <label className="adm-field">
            <span>Date de publication</span>
            <input type="date" value={date} onChange={(event) => chooseDate(event.target.value)} />
          </label>
          <label className="adm-field">
            <span>Occasion</span>
            <select value={occasion} onChange={(event) => chooseOccasion(event.target.value as Occasion)}>
              {OCCASIONS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="adm-field">
          <span>Titre</span>
          <input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="adm-field">
          <span>Date affichée</span>
          <input value={eyebrow} maxLength={50} onChange={(event) => setEyebrow(event.target.value)} placeholder="Laisser vide pour ne rien afficher" />
        </label>
        <label className="adm-field">
          <span className="adm-greet-label">
            Message
            {base.messages.length > 1 && (
              <button type="button" className="adm-greet-link" onClick={otherMessage}>
                <Shuffle size={13} /> Autre proposition
              </button>
            )}
          </span>
          <textarea rows={4} value={message} maxLength={280} onChange={(event) => setMessage(event.target.value)} />
          <small className="adm-greet-count">{message.length} / 280</small>
        </label>

        <div className="adm-greet-row">
          <div className="adm-field">
            <span>Format</span>
            <div className="adm-segmented" role="radiogroup" aria-label="Format">
              {GREETING_FORMATS.map((entry) => (
                <button key={entry.id} type="button" role="radio" aria-checked={format === entry.id} className={format === entry.id ? "is-active" : undefined} onClick={() => setFormat(entry.id)} title={entry.hint}>
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
          <div className="adm-field">
            <span>Couleurs</span>
            <div className="adm-greet-swatches" role="radiogroup" aria-label="Couleurs">
              {GREETING_STYLES.map((entry) => (
                <button key={entry.id} type="button" role="radio" aria-checked={style === entry.id} className={`is-${entry.id}${style === entry.id ? " is-active" : ""}`} onClick={() => setStyle(entry.id)} title={entry.label}>
                  <span aria-hidden="true" />
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {openOffers > 0 && (
          <label className="adm-greet-check">
            <input type="checkbox" checked={showStat} onChange={(event) => setShowStat(event.target.checked)} />
            Afficher « {roundedCount(openOffers)} offres, annonces et appels d’offres en ligne »
          </label>
        )}

        <label className="adm-field">
          <span>Légende à publier avec l’image</span>
          <textarea rows={6} value={caption} onChange={(event) => setCaption(event.target.value)} />
        </label>
        <div className="adm-form-actions">
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => applyText(occasion, date)} title="Revenir aux textes proposés">
            <RefreshCw size={16} /> Rétablir
          </button>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => void copyCaption()}>
            <Copy size={16} /> {copied ? "Légende copiée" : "Copier la légende"}
          </button>
        </div>
      </section>

      <section className="adm-card adm-greet-preview">
        <header className="adm-card-header">
          <h2>Aperçu</h2>
          <span className="adm-greet-size">
            {current.label} · {current.width} × {current.height} · {current.hint}
          </span>
        </header>
        <div className={`adm-greet-frame is-${format}${loading ? " is-loading" : ""}`}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- image générée à la demande
            <img key={image.url} src={image.url} alt={`Affiche « ${title} »`} />
          ) : (
            <div className="adm-greet-placeholder">{error ? "" : "Préparation de l’affiche…"}</div>
          )}
          {loading && <span className="adm-greet-spinner" aria-label="Génération en cours" />}
        </div>
        {error && (
          <p className="adm-alert adm-alert-error" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        <div className="adm-form-actions">
          {canShareFiles && (
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => void share()} disabled={!image || loading}>
              <Share2 size={16} /> Partager
            </button>
          )}
          <a
            className={`adm-btn adm-btn-primary${!image || loading ? " is-disabled" : ""}`}
            href={image?.url}
            download={filename}
            aria-disabled={!image || loading}
            onClick={(event) => (!image || loading) && event.preventDefault()}
          >
            <Download size={16} /> Télécharger l’image
          </a>
        </div>
        <p className="adm-kit-hint">Publiez l’image sur la page Facebook, la chaîne WhatsApp ou TikTok, puis collez la légende.</p>
      </section>
    </div>
  );
}
