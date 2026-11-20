"use client";

import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink, RotateCcw, Share2, X } from "lucide-react";
import { Announcement, decodeEntities } from "../lib/api";
import { FACEBOOK_PAGE_URL, NETWORKS, Network, buildCaption, offerUrl } from "../lib/shareKit";

// Kit de diffusion d'une offre : texte prêt à publier pour chaque réseau (modifiable) et images à télécharger.
export default function AdminShareKit({ item, onClose }: { item: Announcement; onClose: () => void }) {
  const [network, setNetwork] = useState<Network>("facebook");
  const [texts, setTexts] = useState<Record<Network, string>>(() => ({
    facebook: buildCaption(item, "facebook"),
    whatsapp: buildCaption(item, "whatsapp"),
    tiktok: buildCaption(item, "tiktok"),
  }));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const text = texts[network];
  const id = encodeURIComponent(String(item.id));
  const images = [
    { format: "wide", label: "Horizontal 16:9 · Facebook, YouTube, LinkedIn", file: `carrieres-rdc-${item.id}-horizontal.png` },
    { format: "square", label: "Carré · Facebook", file: `carrieres-rdc-${item.id}-carre.png` },
    { format: "story", label: "Vertical · statut WhatsApp, TikTok", file: `carrieres-rdc-${item.id}-story.png` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez le texte :", text);
    }
  }

  const openHref =
    network === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : network === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(offerUrl(item, "facebook"))}`
        : "https://www.tiktok.com/upload";
  const openLabel = network === "whatsapp" ? "Ouvrir WhatsApp" : network === "facebook" ? "Partager sur Facebook" : "Ouvrir TikTok";

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal adm-kit" role="dialog" aria-modal="true" aria-labelledby="kit-title" onClick={(event) => event.stopPropagation()}>
        <div className="adm-kit-head">
          <h2 id="kit-title">
            <Share2 size={18} /> Diffuser « {decodeEntities(item.title)} »
          </h2>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className="adm-kit-body">
          <div className="adm-kit-text">
            <div className="adm-segmented" role="tablist" aria-label="Réseau">
              {NETWORKS.map(({ id: value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={network === value}
                  className={network === value ? "is-active" : undefined}
                  onClick={() => setNetwork(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="adm-field">
              <span>Texte à publier (modifiable)</span>
              <textarea
                rows={14}
                value={text}
                onChange={(event) => setTexts((current) => ({ ...current, [network]: event.target.value }))}
              />
            </label>
            <p className="adm-kit-hint">
              {network === "facebook" &&
                "Collez le texte dans une publication de la page, avec l’image carrée. « Partager sur Facebook » n’envoie que le lien : le texte doit être collé."}
              {network === "whatsapp" && "« Ouvrir WhatsApp » prépare le message. Pour la chaîne ou un statut, copiez le texte et joignez l’image verticale."}
              {network === "tiktok" && "TikTok ne rend pas les liens cliquables : la légende renvoie vers la bio. Publiez l’image verticale."}
            </p>
            <div className="adm-form-actions">
              <button
                type="button"
                className="adm-btn adm-btn-ghost"
                onClick={() => setTexts((current) => ({ ...current, [network]: buildCaption(item, network) }))}
                title="Revenir au texte d’origine"
              >
                <RotateCcw size={16} /> Rétablir
              </button>
              <a className="adm-btn adm-btn-ghost" href={openHref} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> {openLabel}
              </a>
              <button type="button" className="adm-btn adm-btn-primary" onClick={() => void copy()}>
                <Copy size={16} /> {copied ? "Texte copié" : "Copier le texte"}
              </button>
            </div>
            {network === "facebook" && (
              <p className="adm-kit-hint">
                Page Facebook :{" "}
                <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer">
                  Carrières RDC
                </a>
              </p>
            )}
          </div>

          <div className="adm-kit-images">
            {images.map((image) => (
              <figure key={image.format} className={`adm-kit-image is-${image.format}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- image générée à la demande */}
                <img src={`/api/kit/${id}?format=${image.format}`} alt={`Visuel ${image.label}`} loading="lazy" />
                <figcaption>
                  <span>{image.label}</span>
                  <a className="adm-btn adm-btn-ghost" href={`/api/kit/${id}?format=${image.format}`} download={image.file}>
                    <Download size={15} /> Télécharger
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
