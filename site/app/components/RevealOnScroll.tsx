"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Éléments animés à leur apparition (fondu + légère montée, en cascade dans une liste).
const SELECTOR = [
  ".pub-job",
  ".pub-tile",
  ".pub-recruit",
  ".pub-follow",
  ".pub-offer-card",
  ".pub-warning",
  ".pub-similar .pub-list-head",
  ".pub-results-bar",
  ".pub-empty",
  ".pub-prose-page",
  ".pub-footer-grid > div",
].join(",");

const KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: "translateY(22px)" },
  { opacity: 1, transform: "none" },
];
const DURATION = 650;
const EASING = "cubic-bezier(.2, .7, .2, 1)";
// Re-vérifications après l'ajout d'éléments (le temps que la page se mette en place : chargement, défilement…).
const RECHECK_DELAYS_MS = [120, 400, 1000, 2000];

/**
 * Révèle les éléments au défilement, avec l'API d'animation du navigateur (aucune classe ni attribut modifié,
 * donc aucun conflit avec React).
 * Règles, vérifiées à chaque défilement, redimensionnement, et plusieurs fois juste après l'ajout d'éléments :
 * - un élément qui entre à l'écran apparaît en fondu ;
 * - un élément déjà dépassé (au-dessus de l'écran) est affiché immédiatement, sans animation ;
 * - un élément plus bas attend qu'on y arrive.
 * Désactivé si l'utilisateur a demandé moins d'animations dans son système.
 */
export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof Element.prototype.animate !== "function") return;

    const seen = new WeakSet<Element>();
    const waiting = new Map<Element, { animation: Animation }>();
    const timers = new Set<number>();
    let frame = 0;

    const reveal = (element: Element, animate: boolean) => {
      const entry = waiting.get(element);
      if (!entry) return;
      waiting.delete(element);
      if (!animate) return entry.animation.cancel();
      // À la fin, l'animation est retirée : les styles normaux (et les effets de survol) reprennent la main.
      entry.animation.onfinish = () => entry.animation.cancel();
      entry.animation.play();
    };

    const check = () => {
      frame = 0;
      const viewport = window.innerHeight;
      waiting.forEach((_entry, element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0) reveal(element, false); // déjà dépassé : affiché sans animation
        else if (rect.top < viewport * 0.96) reveal(element, true); // à l'écran : apparition en fondu
      });
    };
    const schedule = () => {
      if (!frame && waiting.size) frame = window.requestAnimationFrame(check);
    };
    const scheduleSoon = () => {
      schedule();
      for (const delay of RECHECK_DELAYS_MS) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          schedule();
        }, delay);
        timers.add(timer);
      }
    };

    const prepare = (element: HTMLElement, animateIfVisible: boolean) => {
      if (seen.has(element)) return;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView && !animateIfVisible) return;
      if (rect.bottom < 0) return; // au-dessus de l'écran : rien à animer
      // Décalage en cascade selon la position dans la liste (plafonné pour rester vif).
      const item = (element.closest("li") as HTMLElement | null) ?? element;
      const index = item.parentElement ? Array.prototype.indexOf.call(item.parentElement.children, item) : 0;
      const animation = element.animate(KEYFRAMES, {
        duration: DURATION,
        delay: Math.min(index % 12, 6) * 70,
        easing: EASING,
        fill: "both",
      });
      animation.pause(); // masqué en attendant d'arriver à l'écran
      waiting.set(element, { animation });
    };

    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((element) => prepare(element, false));
    scheduleSoon();

    const mutations = new MutationObserver((records) => {
      let added = false;
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(SELECTOR)) prepare(node, true);
          node.querySelectorAll<HTMLElement>(SELECTOR).forEach((element) => prepare(element, true));
          added = true;
        });
      }
      if (added) scheduleSoon();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      mutations.disconnect();
      // Éléments encore masqués : on annule leur animation pour qu'ils ne restent jamais invisibles
      // (changement de page, ou double exécution des effets en développement).
      waiting.forEach((entry) => entry.animation.cancel());
      waiting.clear();
    };
  }, [pathname]);

  return null;
}
