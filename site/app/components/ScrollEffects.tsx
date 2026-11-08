"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

/**
 * Effets liés au défilement, sur les pages publiques :
 * - ombre de l'en-tête dès qu'on quitte le haut de page ;
 * - barre de progression de lecture sur la page d'une offre ;
 * - bouton « retour en haut » après un long défilement.
 */
export default function ScrollEffects() {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);
  const isOffer = pathname.startsWith("/offre/");

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      document.documentElement.classList.toggle("is-scrolled", y > 8);
      setShowTop(y > 700);
      const bar = document.querySelector<HTMLElement>(".reading-progress span");
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <>
      {isOffer && (
        <div className="reading-progress" aria-hidden="true">
          <span />
        </div>
      )}
      <button
        type="button"
        className={`back-to-top${showTop ? " is-shown" : ""}`}
        aria-label="Revenir en haut de la page"
        tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ArrowUp size={18} />
      </button>
    </>
  );
}
