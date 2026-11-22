// Affiches de vœux (début de semaine, de mois, d'année, fêtes) : textes proposés, date et légende à publier.
// Utilisé par l'admin (formulaire) et par /api/souhait (image).

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
