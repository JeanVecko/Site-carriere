"use client";

import { useEffect, useState } from "react";

import { SPLASH_SEEN_KEY as SEEN_KEY } from "../lib/splash";
// Durée de l’écran avant que le voile remonte. À garder identique au délai de .splash dans animations.css (2s).
const DURATION_MS = 2000;
const EXIT_MS = 750; // le voile remonte

// Décision prise au premier montage de la page (null = pas encore décidé), conservée pendant la visite.
let shouldSplash: boolean | null = null;

// Le script qui décide d'afficher l'écran est dans lib/splash.ts (exécuté dans <head> par layout.tsx).

/**
 * Écran d'accueil sobre : logo posé, nom qui se dévoile, filet doré tracé, puis le voile remonte (2 secondes). Affiché une seule fois par visite (onglet).
 * Les animations et la sortie sont en CSS (fonctionnent même sans JavaScript) ; le script mémorise la visite,
 * et bloque le défilement pendant l'attente.
 */
export default function SplashScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    // Seul le script d'en-tête décide d'afficher l'écran (chargement complet de l'accueil, première fois).
    // La décision est lue une seule fois et mémorisée : le nettoyage d'un effet ne doit pas la défaire.
    if (shouldSplash === null) shouldSplash = root.classList.contains("is-splashing");
    if (!shouldSplash) {
      root.classList.add("splash-seen");
      return;
    }
    root.classList.add("is-splashing");
    let cancelled = false;
    const release = () => {
      if (cancelled) return;
      shouldSplash = false;
      root.classList.remove("is-splashing");
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // stockage indisponible : l'écran sera simplement montré à nouveau
      }
    };

    // On se cale sur l'animation CSS de sortie (démarrée dès l'affichage de la page, avant JavaScript) :
    // la page d'accueil se libère exactement quand l'écran commence à disparaître.
    const exitAnimation = document
      .querySelector(".splash")
      ?.getAnimations()
      .find((animation) => (animation as CSSAnimation).animationName === "splash-out");
    const started = performance.now() - (exitAnimation?.currentTime != null ? Number(exitAnimation.currentTime) : 0);

    const remaining = Math.max(0, DURATION_MS - (performance.now() - started));
    const releaseTimer = window.setTimeout(release, remaining);
    const removeTimer = window.setTimeout(() => !cancelled && setDone(true), remaining + EXIT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(releaseTimer);
      window.clearTimeout(removeTimer);
      root.classList.remove("is-splashing");
    };
  }, []);

  if (done) return null;

  return (
    <>
      <div className="splash" role="status" aria-label="Chargement de Carrières RDC">
        <div className="splash-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
          <img className="splash-mark" src="/LOGO/Logo.png" alt="" />
          <p className="splash-name splash-line">
            <span>
              Carrières <em>RDC</em>
            </span>
          </p>
          <span className="splash-rule" aria-hidden="true" />
          <p className="splash-tagline splash-line">
            <span>Les opportunités de la RDC, au même endroit</span>
          </p>
        </div>
      </div>
    </>
  );
}
