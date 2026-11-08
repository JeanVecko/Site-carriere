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

/**
 * Révèle les éléments au défilement, avec l'API d'animation du navigateur : aucune classe ni attribut
 * n'est modifié, ce qui évite tout conflit avec React (hydratation, nouveaux rendus).
 * - Au chargement, ce qui est déjà à l'écran reste visible ; ce qui est plus bas apparaît quand on y arrive.
 * - Les éléments ajoutés ensuite (offres chargées, « Afficher plus », filtres) apparaissent en cascade.
 * - Désactivé si l'utilisateur a demandé moins d'animations dans son système.
 */
export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof Element.prototype.animate !== "function") return;

    const seen = new WeakSet<Element>();
    const waiting = new Map<Element, Animation>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const animation = waiting.get(entry.target);
          waiting.delete(entry.target);
          if (!animation) continue;
          // À la fin, l'animation est retirée : les styles normaux (et les effets de survol) reprennent la main.
          animation.onfinish = () => animation.cancel();
          animation.play();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    const prepare = (element: HTMLElement, animateIfVisible: boolean) => {
      if (seen.has(element)) return;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView && !animateIfVisible) return;
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
      waiting.set(element, animation);
      observer.observe(element);
    };

    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((element) => prepare(element, false));

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(SELECTOR)) prepare(node, true);
          node.querySelectorAll<HTMLElement>(SELECTOR).forEach((element) => prepare(element, true));
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    // Saut rapide (touche Fin, lien d'ancre) : les éléments dépassés sans avoir été vus sont affichés directement.
    let frame = 0;
    const revealPassed = () => {
      frame = 0;
      waiting.forEach((animation, element) => {
        if (element.getBoundingClientRect().bottom >= 0) return;
        observer.unobserve(element);
        waiting.delete(element);
        animation.cancel();
      });
    };
    const onScroll = () => {
      if (!frame && waiting.size) frame = window.requestAnimationFrame(revealPassed);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      // Éléments encore masqués : on annule leur animation pour qu'ils ne restent jamais invisibles
      // (changement de page, ou double exécution des effets en développement).
      waiting.forEach((animation) => animation.cancel());
      waiting.clear();
    };
  }, [pathname]);

  return null;
}
