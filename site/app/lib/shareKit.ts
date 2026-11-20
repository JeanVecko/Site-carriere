// Kit de diffusion : textes prêts à publier sur Facebook, WhatsApp et TikTok pour une offre.
// Chaque lien porte ?src=… : la visite est comptée sur le bon réseau dans le bilan du recruteur.
import { type Announcement, decodeEntities, detailHref, formatDate } from "./api";

export const PUBLIC_SITE_URL = "https://www.carrieresrdc.com";
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61595124292252";

export type Network = "facebook" | "whatsapp" | "tiktok";
export const NETWORKS: Array<{ id: Network; label: string }> = [
  { id: "facebook", label: "Facebook" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "tiktok", label: "TikTok" },
];

export function offerUrl(item: Announcement, network: Network): string {
  return `${PUBLIC_SITE_URL}${detailHref(item)}?src=${network}`;
}

// Mot-clé du titre → hashtag métier (le premier trouvé).
const TRADES: Array<[RegExp, string]> = [
  [/comptab|audit|fiscal/, "Comptabilité"],
  [/financ|tr[ée]sor|banque|cr[ée]dit/, "Finance"],
  [/informati|d[ée]veloppeur|r[ée]seau|syst[èe]me|data|web|digital|num[ée]rique/, "Informatique"],
  [/logisti|approvisionnement|achat|magasin|stock/, "Logistique"],
  [/commercial|vente|vendeur|marketing|client/, "Commercial"],
  [/chauffeur|conducteur|livreur/, "Chauffeur"],
  [/infirmi|m[ée]decin|sant[ée]|pharmac|sage-femme|clinique/, "Santé"],
  [/enseignant|professeur|formateur|[ée]ducat/, "Enseignement"],
  [/ing[ée]nieur|technicien|[ée]lectric|m[ée]cani|btp|g[ée]nie civil|construction/, "Ingénierie"],
  [/ressources humaines|\brh\b|recrutement/, "RessourcesHumaines"],
  [/juriste|avocat|juridique/, "Juridique"],
  [/agronom|agricol|environnement/, "Agriculture"],
  [/minier|mine\b|g[ée]olog/, "Mines"],
  [/s[ée]curit[ée]|gardien/, "Sécurité"],
  [/secr[ée]taire|assistant|administratif|r[ée]ception/, "Administration"],
  [/humanitaire|programme|projet|suivi.?[ée]valuation|ong\b/, "Humanitaire"],
  [/stag/, "Stage"],
];

function hashtagWord(value: string): string {
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
}

function cityOf(location: string): string {
  return location.split(/[·,\-–(/]/)[0].trim();
}

function hashtags(item: Announcement, title: string, city: string): string {
  const tags: string[] = [];
  if (item.category === "Appel d’offre") tags.push("AppelDOffres", "MarchésPublics", "RDC");
  else if (item.category === "Annonce") tags.push("RDC", "Opportunité");
  else tags.push("EmploiRDC");
  const cityTag = hashtagWord(city);
  if (cityTag) tags.push(cityTag);
  if (item.category === "Offre d’emploi") tags.push("OffreDEmploi");
  const trade = TRADES.find(([pattern]) => pattern.test(title.toLowerCase()))?.[1];
  if (trade && item.category !== "Appel d’offre") tags.push(trade);
  if (item.category === "Offre d’emploi" && item.contract_type === "Stage" && trade !== "Stage") tags.push("Stage");
  tags.push("CarrièresRDC");
  return [...new Set(tags)].map((tag) => `#${tag}`).join(" ");
}

const lines = (...parts: Array<string | false | null | undefined>) => parts.filter((part) => part !== false && part != null).join("\n");

export function buildCaption(item: Announcement, network: Network): string {
  const title = decodeEntities(item.title);
  const company = decodeEntities(item.company);
  const location = decodeEntities(item.location);
  const city = cityOf(location) || location;
  const contract = item.contract_type && item.contract_type !== "Autre" ? item.contract_type : "";
  const salary = item.salary ? decodeEntities(item.salary) : "";
  const deadline = item.deadline ? formatDate(item.deadline) : "";
  const url = offerUrl(item, network);
  const tags = hashtags(item, title, city);
  const isTender = item.category === "Appel d’offre";
  const isNotice = item.category === "Annonce";

  if (network === "facebook") {
    const header = isTender ? `📑 APPEL D’OFFRES | ${title}` : isNotice ? `📣 ANNONCE | ${title}` : `📢 OFFRE D’EMPLOI | ${title}`;
    const hook = isTender
      ? "Entreprises et fournisseurs intéressés : consultez le dossier et soumissionnez dans les délais."
      : isNotice
        ? "Toutes les informations et les modalités de participation sont sur notre site."
        : "Vous avez le profil recherché ? Postulez dès maintenant.";
    return lines(
      header,
      "",
      `🏢 ${company}`,
      `📍 ${location}`,
      contract ? `${isNotice ? "📌" : "📄"} ${contract}` : null,
      salary ? `💰 ${salary}` : null,
      deadline ? (isTender ? `⏳ Soumission avant le ${deadline}` : `⏳ Date limite : ${deadline}`) : null,
      "",
      hook,
      "",
      `👉 ${isTender ? "Dossier et modalités" : isNotice ? "Détails et inscription" : "Détails et candidature"} : ${url}`,
      "",
      "Partagez à quelqu’un que ça peut intéresser 🙏",
      "",
      tags
    );
  }

  if (network === "whatsapp") {
    const header = isTender ? `*📑 Appel d’offres : ${title}*` : isNotice ? `*📣 Annonce : ${title}*` : `*📢 Offre d’emploi : ${title}*`;
    return lines(
      header,
      `🏢 ${company}`,
      `📍 ${[location, contract].filter(Boolean).join(" | ")}`,
      salary ? `💰 ${salary}` : null,
      deadline ? (isTender ? `⏳ Soumission avant le ${deadline}` : `⏳ Jusqu’au ${deadline}`) : null,
      "",
      `👉 ${url}`,
      "",
      "_Faites suivre à vos contacts 🙏_",
      `📘 Suivez-nous sur Facebook : ${FACEBOOK_PAGE_URL}`
    );
  }

  // TikTok : les liens ne sont pas cliquables dans les légendes, d'où le renvoi vers la bio.
  const sentence = isTender
    ? `${company} lance un appel d’offres : ${title} 📑${deadline ? ` Soumission avant le ${deadline}.` : ""}`
    : isNotice
      ? `${title} — ${company} 📣${deadline ? ` Date limite le ${deadline}.` : ""}`
      : `${company} recrute : ${title} à ${city} 💼${contract ? ` ${contract}` : ""}${deadline ? `${contract ? "," : ""} date limite le ${deadline}` : ""}.`;
  return lines(`${sentence} Le lien est dans notre bio 👆 ou sur carrieresrdc.com`, "", tags);
}
