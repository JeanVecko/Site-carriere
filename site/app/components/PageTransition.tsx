"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Le logo n'apparaît que si la page suivante tarde (connexion lente) : avec une bonne connexion,
// la page s'affiche directement, sans attente artificielle.
const SHOW_AFTER_MS = 400;
const LEAVE_MS = 350; // fondu de sortie
const MAX_VISIBLE_MS = 10000; // sécurité : le voile ne reste jamais bloqué

/**
 * Transition entre les pages : quand on clique sur un lien interne vers une autre page (ou qu'on utilise
 * « Précédent / Suivant »), un voile avec le logo qui tourne apparaît seulement si le chargement dure,
 * puis disparaît dès que la nouvelle page est affichée.
 * Ignoré pour les liens externes, les ancres de la même page, les nouveaux onglets et l'administration.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const [state, setState] = useState<"hidden" | "visible" | "leaving">("hidden");
  const navigating = useRef(false);
  const showTimer = useRef(0);
  const safety = useRef(0);
  const viaLink = useRef(false); // true : clic sur un lien (et non « Précédent / Suivant »)

  // Démarrage : clic sur un lien interne vers une autre page.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const start = (fromLink: boolean) => {
      viaLink.current = fromLink;
      navigating.current = true;
      window.clearTimeout(showTimer.current);
      window.clearTimeout(safety.current);
      if (!reduced) showTimer.current = window.setTimeout(() => setState("visible"), SHOW_AFTER_MS);
      safety.current = window.setTimeout(() => {
        navigating.current = false;
        setState("hidden");
      }, MAX_VISIBLE_MS);
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
      start(true);
    };

    const onPopState = () => start(false);

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.clearTimeout(showTimer.current);
      window.clearTimeout(safety.current);
    };
  }, []);

  // Fin : la nouvelle page est affichée → le voile (s'il est apparu) disparaît aussitôt en fondu.
  useEffect(() => {
    if (!navigating.current) return;
    navigating.current = false;
    window.clearTimeout(showTimer.current);
    window.clearTimeout(safety.current);
    // Nouvelle page ouverte par un lien : on l'affiche depuis le haut (sauf lien vers une ancre précise).
    // Avec « Précédent / Suivant », le navigateur restaure lui-même la position de défilement.
    if (viaLink.current && !window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const leave = window.setTimeout(() => setState((current) => (current === "visible" ? "leaving" : current)), 0);
    const done = window.setTimeout(() => setState("hidden"), LEAVE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
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
