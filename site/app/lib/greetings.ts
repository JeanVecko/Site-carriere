// Affiches de vœux (début de semaine, de mois, d'année, fêtes) : textes proposés, date et légende à publier.
// Utilisé par l'admin (formulaire) et par /api/souhait (image).

import { CONTACT_EMAIL, CONTACT_PHONE } from "./api";

export type Occasion = "semaine" | "weekend" | "mois" | "annee" | "noel" | "independance" | "libre";
export type GreetingFormat = "square" | "story" | "wide";
export type GreetingStyle = "navy" | "gold" | "light";

export const OCCASIONS: Array<{ id: Occasion; label: string }> = [
  { id: "semaine", label: "Début de semaine" },
  { id: "weekend", label: "Week-end" },
  { id: "mois", label: "Nouveau mois" },
  { id: "annee", label: "Nouvelle année" },
  { id: "noel", label: "Noël" },
  { id: "independance", label: "30 juin" },
  { id: "libre", label: "Autre occasion" },
];

export const GREETING_FORMATS: Array<{ id: GreetingFormat; label: string; hint: string; width: number; height: number }> = [
  { id: "square", label: "Carré", hint: "Facebook, Instagram", width: 1080, height: 1080 },
  { id: "story", label: "Vertical", hint: "Statut WhatsApp, TikTok", width: 1080, height: 1920 },
  { id: "wide", label: "Horizontal", hint: "LinkedIn, Facebook, écrans", width: 1920, height: 1080 },
];

export const GREETING_STYLES: Array<{ id: GreetingStyle; label: string }> = [
  { id: "navy", label: "Bleu nuit" },
  { id: "gold", label: "Or" },
  { id: "light", label: "Clair" },
];

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}
export function dayValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dayNumber(date: Date): string {
  return date.getDate() === 1 ? "1er" : String(date.getDate());
}
export function longDate(date: Date): string {
  return `${capitalize(DAYS[date.getDay()])} ${dayNumber(date)} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
export function shortDate(date: Date): string {
  return `${capitalize(DAYS[date.getDay()]).slice(0, 3)}. ${dayNumber(date)} ${MONTHS_SHORT[date.getMonth()]}`;
}
// « mois de mai », « mois d’avril »
function monthOf(date: Date): string {
  const month = MONTHS[date.getMonth()];
  return /^[aeiou]/.test(month) ? `d’${month}` : `de ${month}`;
}

// Occasion la plus probable pour une date donnée.
export function suggestOccasion(date: Date): Occasion {
  const day = date.getDate();
  const month = date.getMonth();
  if (month === 0 && day === 1) return "annee";
  if (month === 11 && day === 25) return "noel";
  if (month === 5 && day === 30) return "independance";
  if (day === 1) return "mois";
  if (date.getDay() === 1) return "semaine";
  if ([5, 6, 0].includes(date.getDay())) return "weekend";
  return "semaine";
}

// Prochaines dates utiles (raccourcis de l'admin), à partir de demain.
export function upcomingDates(today = new Date()): Array<{ date: string; occasion: Occasion; label: string }> {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const next = (test: (date: Date) => boolean) => {
    const date = new Date(start);
    for (let i = 0; i < 400 && !test(date); i++) date.setDate(date.getDate() + 1);
    return date;
  };
  const list = [
    { date: next((d) => d.getDay() === 1), occasion: "semaine" as Occasion },
    { date: next((d) => d.getDay() === 5), occasion: "weekend" as Occasion },
    { date: next((d) => d.getDate() === 1), occasion: "mois" as Occasion },
    { date: next((d) => d.getDate() === 1 && d.getMonth() === 0), occasion: "annee" as Occasion },
    { date: next((d) => d.getDate() === 25 && d.getMonth() === 11), occasion: "noel" as Occasion },
    { date: next((d) => d.getDate() === 30 && d.getMonth() === 5), occasion: "independance" as Occasion },
  ];
  return list
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ date, occasion }) => ({ date: dayValue(date), occasion, label: `${OCCASIONS.find((o) => o.id === occasion)!.label} · ${shortDate(date)}` }));
}

export type GreetingText = { title: string; eyebrow: string; decor: string; messages: string[]; caption: string };

export function greetingText(occasion: Occasion, date: Date): GreetingText {
  const year = date.getFullYear();
  const month = MONTHS[date.getMonth()];
  switch (occasion) {
    case "semaine":
      return {
        title: "Bonne semaine !",
        eyebrow: longDate(date),
        decor: DAYS[date.getDay()].toUpperCase(),
        messages: [
          "Une nouvelle semaine, de nouvelles opportunités. Toute l’équipe Carrières RDC vous souhaite une excellente semaine !",
          "Que cette semaine vous rapproche de vos objectifs. Restez motivés : votre prochaine opportunité est peut-être déjà en ligne.",
          "Nouveau départ, nouvelles offres. Mettez votre CV à jour et saisissez chaque opportunité cette semaine !",
          "Chaque lundi est une chance de recommencer plus fort. Excellente semaine à tous les chercheurs d’emploi et aux recruteurs !",
        ],
        caption: "Bonne semaine à toute la communauté Carrières RDC ! 💼\n\nDe nouvelles offres d’emploi, annonces et appels d’offres vous attendent cette semaine.",
      };
    case "weekend":
      return {
        title: "Bon week-end !",
        eyebrow: longDate(date),
        decor: "WEEK-END",
        messages: [
          "Reposez-vous bien et revenez en forme : de nouvelles opportunités vous attendent dès lundi sur Carrières RDC.",
          "Profitez de ce week-end pour peaufiner votre CV et votre lettre de motivation. Bon repos à tous !",
          "Merci pour votre confiance cette semaine. Toute l’équipe Carrières RDC vous souhaite un excellent week-end !",
        ],
        caption: "Bon week-end à toute la communauté Carrières RDC ! 🌿\n\nProfitez-en pour préparer vos candidatures : les offres restent en ligne tout le week-end.",
      };
    case "mois":
      return {
        title: `Bon mois ${monthOf(date)} !`,
        eyebrow: `${dayNumber(date)} ${month} ${year}`,
        decor: month.toUpperCase(),
        messages: [
          `Que ce mois ${monthOf(date)} vous apporte de belles réussites professionnelles. Carrières RDC reste à vos côtés.`,
          `Nouveau mois, nouveaux objectifs ! Restez connectés : de nombreuses offres vous attendent en ${month}.`,
          `Toute l’équipe Carrières RDC vous souhaite un mois ${monthOf(date)} riche en opportunités.`,
        ],
        caption: `Bon mois ${monthOf(date)} à toute la communauté Carrières RDC ! 📅\n\nNouveau mois, nouvelles opportunités : consultez les offres d’emploi et appels d’offres du moment.`,
      };
    case "annee":
      return {
        title: `Bonne année ${year} !`,
        eyebrow: `1er janvier ${year}`,
        decor: String(year),
        messages: [
          `Toute l’équipe Carrières RDC vous présente ses meilleurs vœux pour ${year} : santé, réussite et de belles opportunités professionnelles.`,
          `Que ${year} soit l’année de votre nouveau poste, de vos projets et de vos plus belles réussites. Bonne et heureuse année !`,
          `Merci pour votre confiance. En ${year}, Carrières RDC continue de vous connecter aux meilleures opportunités du pays.`,
        ],
        caption: `Bonne et heureuse année ${year} ! 🎉\n\nToute l’équipe Carrières RDC vous souhaite santé, réussite et de belles opportunités professionnelles.`,
      };
    case "noel":
      return {
        title: "Joyeux Noël !",
        eyebrow: `25 décembre ${year}`,
        decor: "NOËL",
        messages: [
          "Toute l’équipe Carrières RDC vous souhaite un joyeux Noël, entouré de ceux qui vous sont chers.",
          "Paix, joie et réussite à vous et à vos familles. Joyeux Noël de la part de Carrières RDC !",
        ],
        caption: "Joyeux Noël à toute la communauté Carrières RDC ! 🎄\n\nPaix, joie et réussite à vous et à vos familles.",
      };
    case "independance":
      return {
        title: "Joyeuse fête de l’indépendance !",
        eyebrow: `30 juin ${year} · ${year - 1960} ans`,
        decor: "30 JUIN",
        messages: [
          "Fiers de notre pays, nous continuons à bâtir ensemble l’avenir du Congo, une opportunité à la fois.",
          `${year - 1960} ans d’indépendance : célébrons les talents congolais qui font avancer la RDC chaque jour.`,
        ],
        caption: `Joyeuse fête de l’indépendance à tous les Congolais ! 🇨🇩\n\n${year - 1960} ans d’indépendance : Carrières RDC célèbre les talents qui font avancer le pays.`,
      };
    default:
      return {
        title: "Merci à vous !",
        eyebrow: longDate(date),
        decor: "",
        messages: ["Merci à toute la communauté Carrières RDC pour sa confiance. Ensemble, connectons les talents aux opportunités."],
        caption: "Merci à toute la communauté Carrières RDC ! 🙏",
      };
  }
}

export function greetingCaption(base: string): string {
  return `${base}\n\n👉 Toutes les offres sur www.carrieresrdc.com\n\n#CarrieresRDC #EmploiRDC #Kinshasa #RDC`;
}

// Nombre affiché sur l'affiche (« 120+ ») : arrondi à la dizaine inférieure au-delà de 20.
export function roundedCount(count: number): string {
  return count >= 20 ? `${Math.floor(count / 10) * 10}+` : String(count);
}

/* ---------- Promotion de Carrières RDC (une affiche par jour sur les réseaux) ---------- */

export type PromoTheme = "offres" | "candidats" | "recruteurs" | "partenaires" | "alertes" | "appels" | "conseils" | "reseaux";
export type PromoOffer = { title: string; company: string; location?: string };
export type PromoText = { title: string; eyebrow: string; decor: string; messages: string[]; points: string[]; cta: string; url: string; caption: string };

export const PROMO_THEMES: Array<{ id: PromoTheme; label: string }> = [
  { id: "offres", label: "Offres du jour" },
  { id: "candidats", label: "Candidats" },
  { id: "recruteurs", label: "Recruteurs" },
  { id: "partenaires", label: "Devenir partenaire" },
  { id: "alertes", label: "Alertes e-mail" },
  { id: "appels", label: "Appels d’offres" },
  { id: "conseils", label: "Conseils carrière" },
  { id: "reseaux", label: "Suivez-nous" },
];

// Thème proposé selon le jour, pour varier les publications d'une semaine à l'autre ;
// le jeudi alterne d'une semaine sur l'autre entre « Conseils carrière » et « Devenir partenaire ».
const WEEK_PLAN: PromoTheme[] = ["reseaux", "offres", "recruteurs", "alertes", "conseils", "appels", "candidats"];
export function suggestPromoTheme(date: Date): PromoTheme {
  const theme = WEEK_PLAN[date.getDay()];
  if (theme !== "conseils") return theme;
  const week = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (7 * 86400000));
  return week % 2 ? "partenaires" : "conseils";
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trim()}…` : text);
const cityOf = (location = "") => location.split(/[·,(/-]/)[0].trim();

export function promoText(theme: PromoTheme, date: Date, offers: PromoOffer[] = [], openCount = 0): PromoText {
  // La publication est offerte jusqu'au 31 décembre 2026 (lancement du site) ; ensuite, convention de partenariat.
  const launch = date.getTime() < new Date(2027, 0, 1).getTime();
  switch (theme) {
    case "offres": {
      const list = offers.slice(0, 4).map((offer) => clip(`${offer.title} — ${offer.company}${cityOf(offer.location) ? `, ${cityOf(offer.location)}` : ""}`, 78));
      return {
        title: "Les offres du jour",
        eyebrow: longDate(date),
        decor: "OFFRES",
        messages: ["De nouvelles opportunités vous attendent aujourd’hui :", "Postulez dès maintenant :", ""],
        points: list,
        cta: "Postulez gratuitement sur",
        url: "www.carrieresrdc.com/offres",
        caption: `💼 Les offres du jour sur Carrières RDC\n\n${list.map((line) => `✅ ${line}`).join("\n")}\n\nDétails et candidatures sur le site.`,
      };
    }
    case "candidats":
      return {
        title: "Votre prochain emploi est ici",
        eyebrow: "Pour les candidats",
        decor: "EMPLOI",
        messages: ["Chaque jour, de nouvelles offres partout en RDC.", "Trouvez l’emploi qui vous correspond, près de chez vous.", ""],
        points: [
          openCount >= 5 ? `${roundedCount(openCount)} offres en ligne en ce moment` : "Des offres vérifiées, publiées chaque jour",
          "Kinshasa, Lubumbashi, Goma et toute la RDC",
          "Gratuit pour les candidats",
        ],
        cta: "Consultez les offres sur",
        url: "www.carrieresrdc.com",
        caption: "🔎 Vous cherchez un emploi en RDC ?\n\nCarrières RDC publie chaque jour des offres vérifiées, partout dans le pays. C’est gratuit pour les candidats.",
      };
    case "recruteurs":
      return {
        title: "Vous recrutez ?",
        eyebrow: "Pour les recruteurs",
        decor: "RECRUTEZ",
        messages: ["Publiez vos offres sur Carrières RDC et touchez des milliers de candidats.", "Trouvez les bons profils, partout en RDC.", ""],
        points: [
          ...(launch ? ["Publication offerte jusqu’au 31 décembre 2026"] : []),
          "Mise en ligne en moins de 24 h",
          "Relais sur Facebook, WhatsApp et TikTok",
          "Bilan des vues et des candidatures",
        ],
        cta: "Publiez votre offre sur",
        url: "www.carrieresrdc.com/recruteurs",
        caption: `📢 Entreprises, ONG, institutions : vous recrutez ?\n\nPubliez vos offres sur Carrières RDC${launch ? " — c’est offert jusqu’au 31 décembre 2026" : ""}. Mise en ligne en moins de 24 h et relais sur nos réseaux.`,
      };
    case "partenaires":
      return {
        title: "Devenez partenaire de Carrières RDC",
        eyebrow: "Entreprises · ONG · Institutions",
        decor: "PARTENAIRE",
        messages: [
          "Associez votre organisation à la plateforme de l’emploi en RDC.",
          "Recrutez plus vite et gagnez en visibilité auprès des talents congolais.",
          "",
        ],
        points: [
          "Votre page entreprise, avec logo et offres",
          "Badge « Organisation vérifiée »",
          "Vos offres « à la une » et relayées sur nos réseaux",
          "Un bilan des vues et des candidatures",
        ],
        cta: "Contactez-nous sur",
        url: "www.carrieresrdc.com/recruteurs",
        caption: `🤝 Entreprises, ONG, institutions : devenez partenaire de Carrières RDC !\n\nVotre page entreprise, le badge « Organisation vérifiée », des offres mises en avant et relayées sur nos réseaux, et un bilan de chaque recrutement.${launch ? "\n\n🎁 La publication est offerte jusqu’au 31 décembre 2026." : ""}\n\n📩 ${CONTACT_EMAIL}\n📞 ${CONTACT_PHONE}`,
      };
    case "alertes":
      return {
        title: "Ne ratez plus aucune offre",
        eyebrow: "Alertes e-mail",
        decor: "ALERTE",
        messages: ["Recevez les nouvelles offres directement par e-mail.", "Soyez parmi les premiers à postuler.", ""],
        points: ["Choisissez vos métiers et vos villes", "Recevez les nouvelles offres par e-mail", "Gratuit, désinscription en un clic"],
        cta: "Créez votre alerte sur",
        url: "www.carrieresrdc.com/alertes",
        caption: "🔔 Ne ratez plus aucune offre !\n\nCréez gratuitement votre alerte e-mail : choisissez vos métiers et vos villes, nous vous envoyons les nouvelles offres.",
      };
    case "appels":
      return {
        title: "Appels d’offres en RDC",
        eyebrow: "Entreprises et fournisseurs",
        decor: "MARCHÉS",
        messages: ["Les marchés publics et privés, au même endroit.", "Ne manquez plus une opportunité de marché.", ""],
        points: ["Marchés publics et privés", "Dossiers et dates limites à jour", "Alertes par e-mail"],
        cta: "Consultez les appels d’offres sur",
        url: "www.carrieresrdc.com/appels-offres",
        caption: "📑 Entreprises et fournisseurs : retrouvez les appels d’offres publics et privés en RDC sur Carrières RDC, avec leurs dossiers et dates limites.",
      };
    case "conseils":
      return {
        title: "Conseils carrière",
        eyebrow: "CV · Entretien · Appels d’offres",
        decor: "CONSEILS",
        messages: ["Nos guides pratiques pour réussir votre recherche d’emploi.", "Mettez toutes les chances de votre côté.", ""],
        points: ["Rédiger un CV qui retient l’attention", "Réussir son entretien d’embauche", "Répondre à un appel d’offres"],
        cta: "Lisez nos conseils sur",
        url: "www.carrieresrdc.com/conseils",
        caption: "📚 CV, lettre de motivation, entretien, appels d’offres : découvrez nos conseils pratiques pour réussir votre recherche d’emploi en RDC.",
      };
    default:
      return {
        title: "Rejoignez Carrières RDC",
        eyebrow: "Suivez-nous",
        decor: "RDC",
        messages: ["Rejoignez la communauté des chercheurs d’emploi et des recruteurs en RDC.", "Partagez avec vos proches qui cherchent un emploi.", ""],
        points: ["Des offres publiées chaque jour", "Facebook, WhatsApp et TikTok", "Partagez avec ceux qui cherchent un emploi"],
        cta: "Toutes les offres sur",
        url: "www.carrieresrdc.com",
        caption: "🤝 Suivez Carrières RDC sur Facebook, WhatsApp et TikTok, et partagez avec vos proches qui cherchent un emploi !",
      };
  }
}
