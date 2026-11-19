"use client";

import { useEffect } from "react";
import { API_BASE } from "../lib/api";
import { visitSource } from "../lib/visitSource";

// Signale à l'API une consultation de l'offre (une seule fois par onglet et par offre) et, à chaque clic sur un
// bouton « Postuler » de la page (liens marqués data-apply), l'ouverture du lien, de l'e-mail ou du WhatsApp du recruteur.
export default function ViewTracker({ id }: { id: number | string }) {
  useEffect(() => {
    const base = `${API_BASE}/announcements/${encodeURIComponent(String(id))}`;
    const source = visitSource();
    const send = (path: string, query: Record<string, string>) =>
      fetch(`${base}/${path}?${new URLSearchParams(query)}`, { method: "POST", keepalive: true }).catch(() => {});

    const key = `carrieres-vue-${id}`;
    let alreadyCounted = false;
    try {
      alreadyCounted = Boolean(sessionStorage.getItem(key));
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible (navigation privée) : on compte quand même, l'API limite les doublons.
    }
    if (!alreadyCounted) send("view", { source });

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[data-apply]");
      if (link) send("apply", { source, channel: link.getAttribute("data-apply") || "" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [id]);
  return null;
}
