"use client";

import { useEffect } from "react";
import { API_BASE } from "../lib/api";

// Signale une consultation de l'offre à l'API (une seule fois par onglet et par offre).
export default function ViewTracker({ id }: { id: number | string }) {
  useEffect(() => {
    const key = `carrieres-vue-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible (navigation privée) : on compte quand même, l'API limite les doublons.
    }
    fetch(`${API_BASE}/announcements/${encodeURIComponent(String(id))}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, [id]);
  return null;
}
