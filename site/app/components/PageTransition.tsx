"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_VISIBLE_MS = 6000; // le logo tourne 6 secondes à chaque changement de page
const MAX_VISIBLE_MS = 10000; // sécurité : le voile ne reste jamais bloqué

/**
 * Transition entre les pages : quand on clique sur un lien interne vers une autre page (ou qu'on utilise
 * « Précédent / Suivant »), un voile apparaît avec le logo qui tourne, puis la nouvelle page s'affiche.
 * Ignoré pour les liens externes, les ancres de la même page, les nouveaux onglets et l'administration.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const [state, setState] = useState<"hidden" | "visible" | "leaving">("hidden");
  const startedAt = useRef(0);
  const safety = useRef(0);

  // Démarrage : clic sur un lien interne vers une autre page.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const start = () => {
      startedAt.current = performance.now();
      setState("visible");
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => setState("hidden"), MAX_VISIBLE_MS);
    };

    const onClick = (event: MouseEvent) => {
      // Écouté en phase de capture : les liens Next.js annulent le clic natif avant qu'il ne remonte au document.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/_next")) return;
      // Même page (simple ancre ou même adresse) : pas de transition.
      if (url.pathname === window.location.pathname) return;
      start();
    };

    const onPopState = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Fin : la nouvelle page est affichée → on laisse tourner le logo le temps minimum, puis fondu de sortie.
  useEffect(() => {
    if (!startedAt.current) return;
    const elapsed = performance.now() - startedAt.current;
    const hideTimer = window.setTimeout(() => {
      setState((current) => (current === "visible" ? "leaving" : current));
    }, Math.max(0, MIN_VISIBLE_MS - elapsed));
    const doneTimer = window.setTimeout(() => {
      startedAt.current = 0;
      window.clearTimeout(safety.current);
      setState("hidden");
    }, Math.max(0, MIN_VISIBLE_MS - elapsed) + 350);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [pathname]);

  if (state === "hidden") return null;

  return (
    <div className={`page-transition${state === "leaving" ? " is-leaving" : ""}`} role="status" aria-label="Chargement de la page">
      <div className="page-transition-logo">
        <span className="splash-ring" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/LOGO/Logo.png" alt="" />
      </div>
    </div>
  );
}
