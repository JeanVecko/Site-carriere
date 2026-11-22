"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { SOCIAL_NETWORKS } from "./SocialLinks";
import { copyDialog } from "./Dialogs";

const icon = (name: string) => SOCIAL_NETWORKS.find((network) => network.name === name)?.path || "";

// Boutons de partage d'une offre (WhatsApp, Facebook, copie du lien).
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // Liens partagés marqués ?src=… : le bilan du recruteur sait que la visite vient de WhatsApp ou de Facebook.
  const tagged = (src: string) => `${url}${url.includes("?") ? "&" : "?"}src=${src}`;
  const text = `${title} — ${tagged("whatsapp")}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      void copyDialog({ title: "Copiez le lien de l’offre", message: "La copie automatique n’est pas disponible sur cet appareil.", text: url });
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
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tagged("facebook"))}`} target="_blank" rel="noreferrer">
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
