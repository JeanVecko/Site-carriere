"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";

// Événement « beforeinstallprompt » (Chrome, Edge, Samsung Internet sur Android et ordinateur).
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "carrieres-install-dismissed";
const DISMISS_DAYS = 30;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

/**
 * Application installable : enregistre le service worker (site déployé seulement) et propose, après quelques secondes,
 * d'installer Carrières RDC sur l'écran d'accueil. Sur iPhone, explique comment faire depuis Safari.
 * Refusée, l'invitation ne revient pas avant 30 jours.
 */
export default function AppInstall() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    } else {
      // En développement : pas de cache, pour toujours voir la dernière version du code.
      navigator.serviceWorker.getRegistrations().then((list) => list.forEach((registration) => void registration.unregister()));
    }
  }, []);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    let timer = 0;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
      timer = window.setTimeout(() => setMode("prompt"), 6000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (isIos()) timer = window.setTimeout(() => setMode("ios"), 8000);
    const onInstalled = () => setMode("hidden");
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setMode("hidden");
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // stockage indisponible
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setInstallEvent(null);
    if (choice.outcome === "accepted") setMode("hidden");
    else dismiss();
  }

  // Jamais dans l'administration ni dans le bilan imprimable.
  if (mode === "hidden" || /^\/(admin|espace-recruteur\/bilan)/.test(pathname)) return null;

  return (
    <aside className="pub-install" role="dialog" aria-labelledby="install-title">
      {/* eslint-disable-next-line @next/next/no-img-element -- icône statique */}
      <img src="/icons/icon-192.png" alt="" width={48} height={48} />
      <div className="pub-install-text">
        <strong id="install-title">Installez l’application Carrières RDC</strong>
        {mode === "ios" ? (
          <span>
            Touchez <Share size={14} aria-label="Partager" /> puis « Sur l’écran d’accueil ».
          </span>
        ) : (
          <span>Les offres en un geste, depuis votre écran d’accueil. Gratuit et léger.</span>
        )}
      </div>
      {mode === "prompt" && (
        <button type="button" className="pub-btn pub-btn-gold" onClick={() => void install()}>
          <Download size={16} /> Installer
        </button>
      )}
      <button type="button" className="pub-install-close" onClick={dismiss} aria-label="Plus tard">
        <X size={18} />
      </button>
    </aside>
  );
}
