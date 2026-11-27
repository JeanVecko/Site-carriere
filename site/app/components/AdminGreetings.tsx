"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Copy, Download, Megaphone, PartyPopper, RefreshCw, Shuffle, Share2, Sparkles, TriangleAlert } from "lucide-react";
import { adminHeaders } from "../lib/api";
import {
  GREETING_FORMATS,
  GREETING_STYLES,
  GreetingFormat,
  GreetingStyle,
  OCCASIONS,
  Occasion,
  PROMO_THEMES,
  PromoOffer,
  PromoTheme,
  promoText,
  suggestPromoTheme,
  dayValue,
  greetingCaption,
  greetingText,
  parseDay,
  roundedCount,
  suggestOccasion,
  upcomingDates,
} from "../lib/greetings";
import { copyDialog } from "./Dialogs";

// Affiches aux couleurs de Carrières RDC à publier sur la page Facebook, la chaîne WhatsApp ou TikTok :
// vœux (début de semaine, de mois, d'année, fêtes) et promotion du site (un thème par jour).
// Aperçu en direct, texte modifiable, image PNG.
type Mode = "voeux" | "promo";

export default function AdminGreetings({ openOffers, offers = [] }: { openOffers: number; offers?: PromoOffer[] }) {
  const shortcuts = useMemo(() => upcomingDates(), []);
  const [mode, setMode] = useState<Mode>("voeux");
  // Par défaut : l’affiche de demain (le dimanche, celle du lundi).
  const [date, setDate] = useState(() => {
    const today = new Date();
    return dayValue(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  });
  const [occasion, setOccasion] = useState<Occasion>(() => suggestOccasion(parseDay(date)));
  const [theme, setTheme] = useState<PromoTheme>(() => suggestPromoTheme(parseDay(date)));
  const textFor = (nextMode: Mode, key: Occasion | PromoTheme, day: string) =>
    nextMode === "voeux" ? (() => { const text = greetingText(key as Occasion, parseDay(day)); return { ...text, caption: greetingCaption(text.caption), points: [] as string[], cta: "", url: "" }; })() : promoText(key as PromoTheme, parseDay(day), offers, openOffers);
  const base = useMemo(() => textFor(mode, mode === "voeux" ? occasion : theme, date), [mode, occasion, theme, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const [variant, setVariant] = useState(0);
  const [title, setTitle] = useState(base.title);
  const [eyebrow, setEyebrow] = useState(base.eyebrow);
  const [message, setMessage] = useState(base.messages[0]);
  const [points, setPoints] = useState("");
  const [cta, setCta] = useState("");
  const [link, setLink] = useState("");
  const [caption, setCaption] = useState(base.caption);
  const [format, setFormat] = useState<GreetingFormat>("square");
  const [style, setStyle] = useState<GreetingStyle>("navy");
  const [showStat, setShowStat] = useState(openOffers > 0);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const urlRef = useRef<string | null>(null);

  // Nouvelle date, occasion ou thème : textes proposés.
  function applyText(nextMode: Mode, key: Occasion | PromoTheme, nextDate: string) {
    const text = textFor(nextMode, key, nextDate);
    setVariant(0);
    setTitle(text.title);
    setEyebrow(text.eyebrow);
    setMessage(text.messages[0]);
    setPoints(text.points.join("\n"));
    setCta(text.cta);
    setLink(text.url);
    setCaption(text.caption);
  }
  function chooseDate(value: string, forced?: Occasion) {
    if (!value) return;
    setDate(value);
    if (mode === "voeux") {
      const nextOccasion = forced || suggestOccasion(parseDay(value));
      setOccasion(nextOccasion);
      applyText("voeux", nextOccasion, value);
    } else {
      const nextTheme = suggestPromoTheme(parseDay(value));
      setTheme(nextTheme);
      applyText("promo", nextTheme, value);
    }
  }
  function chooseOccasion(value: Occasion) {
    setOccasion(value);
    applyText("voeux", value, date);
  }
  function chooseTheme(value: PromoTheme) {
    setTheme(value);
    applyText("promo", value, date);
  }
  function chooseMode(value: Mode) {
    if (value === mode) return;
    setMode(value);
    // Promotion : l'affiche du jour même (une publication par jour) ; vœux : celle de demain.
    const today = new Date();
    const day = dayValue(value === "promo" ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
    setDate(day);
    if (value === "promo") {
      const nextTheme = suggestPromoTheme(parseDay(day));
      setTheme(nextTheme);
      applyText("promo", nextTheme, day);
    } else {
      const nextOccasion = suggestOccasion(parseDay(day));
      setOccasion(nextOccasion);
      applyText("voeux", nextOccasion, day);
    }
  }
  function otherMessage() {
    const next = (variant + 1) % base.messages.length;
    setVariant(next);
    setMessage(base.messages[next]);
  }

  // Le compteur d'offres ne va que sur les vœux (les affiches de promotion ont déjà leurs points forts).
  const stat = mode === "voeux" && showStat && openOffers > 0 ? roundedCount(openOffers) : "";
  const pointList = useMemo(() => (mode === "promo" ? points.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 4) : []), [mode, points]);
  const payload = useMemo(
    () =>
      JSON.stringify({
        title, eyebrow, message, decor: base.decor, format, style, stat, statLabel: "offres, annonces et appels d’offres en ligne",
        ...(mode === "promo" ? { points: pointList, cta, url: link } : {}),
      }),
    [title, eyebrow, message, base.decor, format, style, stat, mode, pointList, cta, link]
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

  const filename = `carrieres-rdc-${mode === "promo" ? `promo-${theme}` : `voeux-${occasion}`}-${date}-${GREETING_FORMATS.find((entry) => entry.id === format)!.label.toLowerCase()}.png`;
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
        <header className="adm-card-header adm-greet-head">
          <h2>{mode === "voeux" ? "Préparer une affiche de vœux" : "Préparer une affiche de promotion"}</h2>
          <div className="adm-segmented" role="tablist" aria-label="Type d’affiche">
            <button type="button" role="tab" aria-selected={mode === "voeux"} className={mode === "voeux" ? "is-active" : undefined} onClick={() => chooseMode("voeux")}>
              <PartyPopper size={14} /> Vœux
            </button>
            <button type="button" role="tab" aria-selected={mode === "promo"} className={mode === "promo" ? "is-active" : undefined} onClick={() => chooseMode("promo")}>
              <Megaphone size={14} /> Promotion
            </button>
          </div>
        </header>

        {mode === "promo" && (
          <div className="adm-greet-shortcuts" aria-label="Thèmes">
            {PROMO_THEMES.map((entry) => (
              <button key={entry.id} type="button" className={theme === entry.id ? "is-active" : undefined} onClick={() => chooseTheme(entry.id)}>
                {entry.id === suggestPromoTheme(parseDay(date)) && <Sparkles size={13} aria-label="Thème conseillé ce jour" />} {entry.label}
              </button>
            ))}
          </div>
        )}
        {mode === "promo" && <p className="adm-muted adm-greet-tip"><Sparkles size={13} aria-hidden="true" /> Thème conseillé pour ce jour : chaque jour de la semaine a le sien, pour varier vos publications.</p>}
        {mode === "promo" && theme === "offres" && offers.length === 0 && <p className="adm-alert adm-alert-error" role="alert"><TriangleAlert size={16} /> Aucune offre en ligne à afficher pour le moment.</p>}

        {mode === "voeux" && <div className="adm-greet-shortcuts" aria-label="Prochaines dates">
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
        </div>}

        <div className="adm-greet-row">
          <label className="adm-field">
            <span>Date de publication</span>
            <input type="date" value={date} onChange={(event) => chooseDate(event.target.value)} />
          </label>
          {mode === "voeux" ? (
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
          ) : (
            <label className="adm-field">
              <span>Thème</span>
              <select value={theme} onChange={(event) => chooseTheme(event.target.value as PromoTheme)}>
                {PROMO_THEMES.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="adm-field">
          <span>Titre</span>
          <input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="adm-field">
          <span>{mode === "voeux" ? "Date affichée" : "Bandeau"}</span>
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
          <textarea rows={mode === "promo" ? 2 : 4} value={message} maxLength={280} onChange={(event) => setMessage(event.target.value)} placeholder={mode === "promo" ? "Facultatif" : undefined} />
          <small className="adm-greet-count">{message.length} / 280</small>
        </label>
        {mode === "promo" && (
          <>
            <label className="adm-field">
              <span>Points forts (un par ligne, 4 au plus)</span>
              <textarea rows={4} value={points} onChange={(event) => setPoints(event.target.value)} />
            </label>
            <div className="adm-greet-row">
              <label className="adm-field">
                <span>Phrase du bas</span>
                <input value={cta} maxLength={50} onChange={(event) => setCta(event.target.value)} />
              </label>
              <label className="adm-field">
                <span>Adresse affichée</span>
                <select value={link} onChange={(event) => setLink(event.target.value)}>
                  {["www.carrieresrdc.com", "www.carrieresrdc.com/offres", "www.carrieresrdc.com/recruteurs", "www.carrieresrdc.com/alertes", "www.carrieresrdc.com/appels-offres", "www.carrieresrdc.com/conseils"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

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

        {mode === "voeux" && openOffers > 0 && (
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
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => applyText(mode, mode === "voeux" ? occasion : theme, date)} title="Revenir aux textes proposés">
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
