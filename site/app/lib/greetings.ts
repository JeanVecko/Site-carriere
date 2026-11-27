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

// Numéro de semaine : fait tourner les textes d'une semaine à l'autre pour ne pas republier la même légende.
const weekNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (7 * 86400000));
const pick = <T,>(list: T[], index: number) => list[((index % list.length) + list.length) % list.length];
// Légende complète : texte, lien et mots-clés.
const finish = (body: string, link: string, tags: string) => `${body}\n\n👉 ${link}\n\n#CarrieresRDC ${tags}`;
const contactLines = `📩 ${CONTACT_EMAIL}\n📞 ${CONTACT_PHONE}`;

// Leçons « Conseils carrière » : l'affiche résume en 3 points, la légende enseigne la leçon complète.
type CareerLesson = { title: string; eyebrow: string; points: string[]; lesson: string };
const CAREER_LESSONS: CareerLesson[] = [
  {
    title: "Un CV qui retient l’attention",
    eyebrow: "Conseil carrière · CV",
    points: ["1 à 2 pages, clair et aéré", "Des résultats, pas seulement des tâches", "Adapté à chaque offre"],
    lesson: `📚 CONSEIL CARRIÈRE — Votre CV a moins d’une minute pour convaincre.

1️⃣ Restez court : 1 à 2 pages, une mise en page simple et aérée.
2️⃣ Allez à l’essentiel en haut de page : le poste visé, un numéro de téléphone joignable et une adresse e-mail sérieuse (prenom.nom@…, pas « bebe_cool@… »).
3️⃣ Montrez des résultats, pas seulement des tâches : « J’ai réduit les retards de paiement de 20 % » convainc plus que « Gestion de la comptabilité ».
4️⃣ Adaptez votre CV à chaque offre : reprenez les mots-clés de l’annonce (compétences, logiciels, diplômes demandés).
5️⃣ Relisez-vous, puis faites relire : une faute d’orthographe suffit parfois à être écarté.

💡 Astuce : envoyez toujours votre CV en PDF, nommé « CV-Prénom-Nom.pdf ».`,
  },
  {
    title: "Réussir son entretien d’embauche",
    eyebrow: "Conseil carrière · Entretien",
    points: ["Renseignez-vous sur l’organisation", "Préparez des exemples concrets", "Arrivez 15 minutes en avance"],
    lesson: `📚 CONSEIL CARRIÈRE — Un entretien se gagne avant d’entrer dans la salle.

1️⃣ Renseignez-vous sur l’organisation : ses activités, ses projets, ses valeurs. Citez-les pendant l’entretien.
2️⃣ Relisez l’offre et préparez un exemple concret pour chaque compétence demandée : la situation, ce que vous avez fait, le résultat obtenu.
3️⃣ Préparez votre présentation en 2 minutes : qui vous êtes, ce que vous savez faire, pourquoi ce poste.
4️⃣ Arrivez 15 minutes en avance, avec une tenue soignée et des copies de votre CV et de vos diplômes.
5️⃣ À la fin, posez une ou deux questions sur le poste : cela montre votre intérêt.

💡 Astuce : le lendemain, envoyez un court message de remerciement au recruteur.`,
  },
  {
    title: "La lettre de motivation qui fait la différence",
    eyebrow: "Conseil carrière · Lettre",
    points: ["Une lettre pour chaque offre", "Vous, moi, nous", "Une page, pas plus"],
    lesson: `📚 CONSEIL CARRIÈRE — Une lettre de motivation, ce n’est pas votre CV en phrases.

1️⃣ Écrivez une lettre pour chaque offre : le recruteur reconnaît tout de suite une lettre copiée-collée.
2️⃣ Suivez le plan « Vous, moi, nous » :
   • Vous : ce qui vous attire dans l’organisation et le poste ;
   • Moi : ce que vous apportez, avec un exemple concret ;
   • Nous : ce que vous pourrez accomplir ensemble, et votre demande d’entretien.
3️⃣ Une page, pas plus, avec des phrases courtes.
4️⃣ Rappelez la référence de l’offre et le titre exact du poste.

💡 Astuce : terminez par une formule simple et polie, puis signez avec vos nom et téléphone.`,
  },
  {
    title: "Bien postuler par e-mail",
    eyebrow: "Conseil carrière · Candidature",
    points: ["Un objet clair avec la référence", "CV et lettre en PDF", "Un message court et poli"],
    lesson: `📚 CONSEIL CARRIÈRE — Beaucoup de candidatures sont écartées avant même d’être lues. Voici comment éviter cela :

1️⃣ Objet clair : « Candidature – Comptable – Réf. 12/2026 – Prénom Nom ».
2️⃣ Envoyez à l’adresse exacte indiquée dans l’offre, avant la date limite (n’attendez pas le dernier jour).
3️⃣ Joignez les documents demandés, et seulement eux, en PDF : CV, lettre, diplômes si l’offre les demande.
4️⃣ Dans le message, 3 ou 4 lignes suffisent : le poste visé, les pièces jointes, vos coordonnées.
5️⃣ Respectez la méthode demandée : si l’offre exige un dépôt physique ou un formulaire en ligne, faites-le.

💡 Astuce : envoyez-vous d’abord l’e-mail à vous-même pour vérifier que les pièces jointes s’ouvrent bien.`,
  },
  {
    title: "Ne payez jamais pour un emploi",
    eyebrow: "Conseil carrière · Vigilance",
    points: ["Aucun recruteur sérieux ne demande d’argent", "Méfiez-vous des promesses trop belles", "Vérifiez l’organisation"],
    lesson: `📚 CONSEIL CARRIÈRE — Protégez-vous des fausses offres d’emploi.

1️⃣ Un recruteur sérieux ne vous demande jamais d’argent : ni « frais de dossier », ni « frais de formation », ni « frais de visa ».
2️⃣ Méfiez-vous des promesses trop belles : gros salaire sans expérience, embauche immédiate sans entretien.
3️⃣ Vérifiez l’organisation : adresse, site internet, numéro officiel. Une adresse Gmail pour une grande entreprise doit vous alerter.
4️⃣ Ne transmettez jamais vos codes Mobile Money, ni la copie de vos papiers à un inconnu.
5️⃣ En cas de doute, demandez conseil avant de répondre.

💡 Sur Carrières RDC, chaque offre est vérifiée avant publication. Vous avez repéré une offre suspecte ? Signalez-la-nous.`,
  },
  {
    title: "Relancer après une candidature",
    eyebrow: "Conseil carrière · Suivi",
    points: ["Attendez une à deux semaines", "Un message court et poli", "Notez vos candidatures"],
    lesson: `📚 CONSEIL CARRIÈRE — Pas de réponse à votre candidature ? Relancez, mais avec méthode.

1️⃣ Attendez une à deux semaines après la date limite avant de relancer.
2️⃣ Envoyez un message court et poli : rappelez le poste, la date d’envoi et redites votre intérêt.
3️⃣ Une seule relance suffit : insister plusieurs fois fait mauvaise impression.
4️⃣ Tenez un tableau de vos candidatures : poste, organisation, date d’envoi, relance, réponse.
5️⃣ Un refus n’est pas un échec : demandez poliment ce qui vous a manqué, et continuez à postuler.

💡 Astuce : créez une alerte e-mail sur Carrières RDC pour ne manquer aucune nouvelle offre.`,
  },
];

export function promoText(theme: PromoTheme, date: Date, offers: PromoOffer[] = [], openCount = 0): PromoText {
  // La publication est offerte jusqu'au 31 décembre 2026 (lancement du site) ; ensuite, convention de partenariat.
  const launch = date.getTime() < new Date(2027, 0, 1).getTime();
  const week = weekNumber(date);
  const freeLine = launch ? "🎁 Publication offerte jusqu’au 31 décembre 2026\n" : "";
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
        caption: finish(
          `💼 LES OFFRES DU JOUR sur Carrières RDC\n\n${list.map((line) => `✅ ${line}`).join("\n")}\n\nPostulez avant la date limite : les premières candidatures sont souvent les plus regardées. Partagez avec ceux qui cherchent un emploi 🙏`,
          "Détails et candidatures : www.carrieresrdc.com/offres",
          "#EmploiRDC #OffreEmploi #Kinshasa #RDC",
        ),
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
        caption: finish(
          `🔎 Vous cherchez un emploi en RDC ?\n\n${openCount >= 5 ? `${roundedCount(openCount)} offres vous attendent en ce moment` : "De nouvelles offres vous attendent chaque jour"} sur Carrières RDC : ONG, entreprises, institutions, à Kinshasa, Lubumbashi, Goma et partout dans le pays.\n\n✅ Des offres vérifiées avant publication\n✅ Gratuit pour les candidats\n✅ Des conseils pour réussir CV et entretiens`,
          "www.carrieresrdc.com",
          "#EmploiRDC #OffreEmploi #Kinshasa #RDC",
        ),
      };
    case "recruteurs":
      return {
        title: "Vous recrutez ?",
        eyebrow: "Pour les recruteurs",
        decor: "RECRUTEZ",
        messages: ["Publiez vos offres sur Carrières RDC et trouvez les bons profils.", "Les candidats que vous cherchez sont déjà chez nous.", ""],
        points: [
          ...(launch ? ["Publication offerte jusqu’au 31 décembre 2026"] : []),
          "Mise en ligne en moins de 24 h",
          "Relais sur Facebook, WhatsApp et TikTok",
          "Bilan des vues et des candidatures",
        ],
        cta: "Publiez votre offre sur",
        url: "www.carrieresrdc.com/recruteurs",
        caption: finish(
          `${pick(
            [
              "📢 VOUS RECRUTEZ ? Les bons profils sont déjà sur Carrières RDC.\n\nChaque jour, des chercheurs d’emploi de toute la RDC consultent nos offres. Publiez la vôtre et recevez des candidatures de candidats qui correspondent à votre besoin.",
              "📢 UN POSTE À POURVOIR ? Ne laissez pas votre offre passer inaperçue.\n\nUne offre affichée sur un mur ou envoyée dans un seul groupe touche peu de monde. Sur Carrières RDC, elle est vue par des candidats de Kinshasa, Lubumbashi, Goma et de toute la RDC, et partagée sur nos réseaux.",
              "📢 RECRUTER PREND DU TEMPS. Nous vous en faisons gagner.\n\nEnvoyez-nous votre offre : nous la vérifions, la publions et la partageons sur Facebook, WhatsApp et TikTok. Vous n’avez plus qu’à choisir parmi les candidatures reçues.",
            ],
            week,
          )}\n\n${freeLine}✅ Mise en ligne en moins de 24 h\n✅ Relais sur Facebook, WhatsApp et TikTok\n✅ Bilan des vues et des candidatures\n\nFaites-nous confiance pour votre prochain recrutement 🤝\n\n${contactLines}`,
          "Publiez votre offre : www.carrieresrdc.com/recruteurs",
          "#Recrutement #EmploiRDC #RH #RDC",
        ),
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
        caption: finish(
          `${pick(
            [
              "🤝 ENTREPRISES, ONG, INSTITUTIONS : devenez partenaire de Carrières RDC !\n\nAssociez votre nom à la plateforme qui connecte les talents congolais aux opportunités, et faites de chaque recrutement un succès.",
              "🤝 ET SI VOS RECRUTEMENTS DEVENAIENT PLUS SIMPLES ?\n\nNos partenaires publient leurs offres en toute confiance, gagnent en visibilité auprès des candidats et suivent les résultats de chaque recrutement.",
              "🤝 VOTRE ORGANISATION MÉRITE D’ÊTRE VUE PAR LES MEILLEURS TALENTS.\n\nDevenez partenaire de Carrières RDC : votre marque employeur mise en avant, vos offres relayées partout en RDC.",
            ],
            week,
          )}\n\n✅ Votre page entreprise, avec logo et offres\n✅ Le badge « Organisation vérifiée »\n✅ Vos offres « à la une » et relayées sur nos réseaux\n✅ Un bilan des vues et des candidatures${
            launch
              ? "\n\n🎁 Signez dès maintenant : la publication reste offerte jusqu’au 31 décembre 2026, et la convention ne prend effet qu’au 1er janvier 2027."
              : ""
          }\n\nÉcrivez-nous pour en parler :\n${contactLines}`,
          "www.carrieresrdc.com/recruteurs",
          "#Partenariat #Recrutement #EmploiRDC #RDC",
        ),
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
        caption: finish(
          "🔔 NE RATEZ PLUS AUCUNE OFFRE !\n\nLes meilleures offres partent vite. Créez gratuitement votre alerte e-mail en 1 minute : choisissez vos métiers et vos villes, et recevez les nouvelles offres dès leur publication.\n\n✅ Gratuit\n✅ Seulement les offres qui vous intéressent\n✅ Désinscription en un clic",
          "Créez votre alerte : www.carrieresrdc.com/alertes",
          "#EmploiRDC #OffreEmploi #RDC",
        ),
      };
    case "appels":
      return {
        title: "Un appel d’offres à publier ?",
        eyebrow: "Entreprises · ONG · Institutions",
        decor: "MARCHÉS",
        messages: [
          "Faites-nous confiance pour le diffuser auprès des fournisseurs de toute la RDC.",
          "Plus de visibilité, plus de soumissions, un meilleur choix.",
          "",
        ],
        points: [
          ...(launch ? ["Publication offerte jusqu’au 31 décembre 2026"] : []),
          "Vu par les fournisseurs de toute la RDC",
          "Dossier et date limite bien visibles",
          "Relayé sur Facebook, WhatsApp et TikTok",
        ],
        cta: "Publiez-le sur",
        url: "www.carrieresrdc.com/recruteurs",
        caption: finish(
          `${pick(
            [
              "📑 VOUS AVEZ UN APPEL D’OFFRES À PUBLIER ? Faites-nous confiance.\n\nEntreprises, ONG, institutions : diffusez vos appels d’offres, avis à manifestation d’intérêt et consultations auprès des fournisseurs, prestataires et consultants de toute la RDC.",
              "📑 PLUS DE SOUMISSIONS, UN MEILLEUR CHOIX.\n\nPlus votre appel d’offres est vu, plus vous recevez d’offres sérieuses, et mieux vous choisissez votre fournisseur. Publiez-le sur Carrières RDC.",
              "📑 VOTRE APPEL D’OFFRES MÉRITE LES MEILLEURS PRESTATAIRES.\n\nNe le laissez pas circuler dans un seul groupe : sur Carrières RDC, il est consultable par les entreprises et consultants de tout le pays, avec son dossier et sa date limite.",
            ],
            week,
          )}\n\n${freeLine}✅ Mise en ligne rapide, après vérification\n✅ Dossier téléchargeable et date limite bien visible\n✅ Relais sur Facebook, WhatsApp et TikTok\n\nEnvoyez-nous votre avis, nous nous occupons du reste 🤝\n\n${contactLines}`,
          "Publiez votre appel d’offres : www.carrieresrdc.com/recruteurs",
          "#AppelDOffres #MarchesPublics #RDC #Kinshasa",
        ),
      };
    case "conseils": {
      // Une leçon différente à chaque affiche « Conseils carrière » (publiée une semaine sur deux).
      const lesson = pick(CAREER_LESSONS, Math.floor(week / 2));
      return {
        title: lesson.title,
        eyebrow: lesson.eyebrow,
        decor: "CONSEILS",
        messages: ["Les 3 règles à retenir :", "Mettez toutes les chances de votre côté.", ""],
        points: lesson.points,
        cta: "Tous nos conseils sur",
        url: "www.carrieresrdc.com/conseils",
        caption: finish(
          `${lesson.lesson}\n\nEnregistrez ce message et partagez-le avec ceux qui cherchent un emploi 🙏`,
          "Plus de conseils : www.carrieresrdc.com/conseils",
          "#ConseilCarriere #EmploiRDC #RechercheEmploi #RDC",
        ),
      };
    }
    default:
      return {
        title: "Rejoignez Carrières RDC",
        eyebrow: "Suivez-nous",
        decor: "RDC",
        messages: ["Rejoignez la communauté des chercheurs d’emploi et des recruteurs en RDC.", "Partagez avec vos proches qui cherchent un emploi.", ""],
        points: ["Des offres publiées chaque jour", "Facebook, WhatsApp et TikTok", "Partagez avec ceux qui cherchent un emploi"],
        cta: "Toutes les offres sur",
        url: "www.carrieresrdc.com",
        caption: finish(
          "🤝 REJOIGNEZ LA COMMUNAUTÉ CARRIÈRES RDC !\n\nSuivez-nous sur Facebook, WhatsApp et TikTok pour recevoir chaque jour les nouvelles offres d’emploi, appels d’offres et conseils carrière.\n\nVous connaissez quelqu’un qui cherche un emploi ? Partagez-lui ce message : une offre peut changer une vie 🙏",
          "www.carrieresrdc.com",
          "#EmploiRDC #OffreEmploi #RDC",
        ),
      };
  }
}
