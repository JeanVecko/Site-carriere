"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { SOCIAL_NETWORKS } from "./SocialLinks";

const icon = (name: string) => SOCIAL_NETWORKS.find((network) => network.name === name)?.path || "";

// Boutons de partage d'une offre (WhatsApp, Facebook, copie du lien).
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${title} — ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiez le lien de l’offre :", url);
    }
  }

  return (
    <div className="pub-share-buttons">
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d={icon("WhatsApp")} />
        </svg>
        WhatsApp
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d={icon("Facebook")} />
        </svg>
        Facebook
      </a>
      <button type="button" onClick={copy}>
        {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
