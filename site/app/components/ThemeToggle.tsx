"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_EVENT, THEME_KEY } from "../lib/theme";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}
const readTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Bouton de l'en-tête : bascule entre le thème clair et le thème sombre (choix gardé dans ce navigateur). */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light");
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // stockage indisponible : le choix vaut pour cette page seulement
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      className="pub-theme-toggle"
      onClick={toggle}
      aria-label={next === "dark" ? "Passer au thème sombre" : "Passer au thème clair"}
      title={next === "dark" ? "Thème sombre" : "Thème clair"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
