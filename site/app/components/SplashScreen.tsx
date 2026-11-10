"use client";

import { useEffect, useRef, useState } from "react";

import { SPLASH_SEEN_KEY as SEEN_KEY } from "../lib/splash";
// Durée du chargement (logo qui tourne + barre qui se remplit). À garder identique aux durées de animations.css
// (.splash : splash-out 2s ; .splash-bar-fill : splash-fill 2s).
const DURATION_MS = 2000;
const EXIT_MS = 600; // fondu de sortie

// Décision prise au premier montage de la page (null = pas encore décidé), conservée pendant la visite.
let shouldSplash: boolean | null = null;

// Le script qui décide d'afficher l'écran est dans lib/splash.ts (exécuté dans <head> par layout.tsx).

/**
 * Écran d'accueil : logo qui tourne pendant 2 secondes, barre de chargement avec pourcentage sous le texte,
 * puis la page apparaît. Affiché une seule fois par visite (onglet).
 * Les animations et la sortie sont en CSS (fonctionnent même sans JavaScript) ; le script mémorise la visite,
 * bloque le défilement pendant l'attente et affiche le pourcentage.
 */
export default function SplashScreen() {
  const [done, setDone] = useState(false);
  const percentRef = useRef<HTMLSpanElement>(null);

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

    // Pourcentage affiché sous la barre, synchronisé avec son remplissage.
    let frame = 0;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started) / DURATION_MS);
      // Même courbe que la barre (accélération puis ralentissement), pour que le chiffre suive le remplissage.
      const eased = 1 - Math.pow(1 - progress, 2.2);
      if (percentRef.current) percentRef.current.textContent = `${Math.round(eased * 100)} %`;
      if (progress < 1 && !cancelled) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    const remaining = Math.max(0, DURATION_MS - (performance.now() - started));
    const releaseTimer = window.setTimeout(release, remaining);
    const removeTimer = window.setTimeout(() => !cancelled && setDone(true), remaining + EXIT_MS);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
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
          <div className="splash-logo">
            <span className="splash-ring" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
            <img src="/LOGO/Logo.png" alt="" />
          </div>
          <p className="splash-name">
            Carrières <em>RDC</em>
          </p>
          <p className="splash-tagline">Les opportunités de la RDC, au même endroit</p>

          <div className="splash-loader" aria-hidden="true">
            <div className="splash-bar">
              <span className="splash-bar-fill" />
            </div>
            <div className="splash-loader-text">
              <span>Chargement des offres</span>
              <span ref={percentRef} className="splash-percent">
                0 %
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
