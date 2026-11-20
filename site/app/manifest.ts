import type { MetadataRoute } from "next";

// Application installable (PWA) : nom, icônes et couleurs affichés quand Carrières RDC est ajouté à l'écran d'accueil.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Carrières RDC — Offres d’emploi en RDC",
    short_name: "Carrières RDC",
    description: "Offres d’emploi, annonces et appels d’offres en République démocratique du Congo, publiés chaque jour.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#092d63",
    theme_color: "#092d63",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Offres d’emploi", url: "/offres", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Appels d’offres", url: "/appels-offres", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Alertes e-mail", url: "/alertes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
