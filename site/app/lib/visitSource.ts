// Provenance d'une visite (Facebook, WhatsApp, Google…), pour le bilan envoyé aux recruteurs.
// Calculée à l'arrivée sur le site puis gardée pour l'onglet : un clic « Postuler » garde la provenance de la visite.
const KEY = "carrieres-provenance";

const HOSTS: Array<[RegExp, string]> = [
  // Messageries web d'abord : mail.google.com ne doit pas compter comme Google
  [/(^|\.)(mail\.google\.com|outlook\.|mail\.yahoo\.)/, "email"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
];
const KNOWN = ["facebook", "whatsapp", "google", "linkedin", "tiktok", "email"];

function detect(): string {
  // Lien partagé avec ?src=whatsapp (boutons de partage, alertes e-mail…) ou ?utm_source=facebook
  const params = new URLSearchParams(window.location.search);
  const tag = (params.get("src") || params.get("utm_source") || "").toLowerCase();
  if (tag) return KNOWN.includes(tag) ? tag : "autre";
  if (!document.referrer) return "direct"; // WhatsApp et les applications mobiles n'envoient souvent rien
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    if (host === window.location.hostname) return "site";
    return HOSTS.find(([pattern]) => pattern.test(host))?.[1] || "autre";
  } catch {
    return "autre";
  }
}

export function visitSource(): string {
  try {
    // Un lien marqué (?src=…) l'emporte toujours ; sinon on garde la provenance de l'arrivée sur le site.
    const tagged = new URLSearchParams(window.location.search).has("src") || new URLSearchParams(window.location.search).has("utm_source");
    const saved = sessionStorage.getItem(KEY);
    if (saved && !tagged) return saved;
    const source = detect();
    sessionStorage.setItem(KEY, source);
    return source;
  } catch {
    return detect();
  }
}
