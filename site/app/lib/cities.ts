// Villes de la RDC reconnues dans le champ « Localisation » des offres, pour les pages /emplois/[ville].
// Une offre peut viser plusieurs villes (« Kinshasa, Matadi et Lubumbashi ») : elle apparaît alors sur chacune.
import { type Announcement, isExpired } from "./api";

type City = { name: string; slug: string; aliases?: string[] };

export const DRC_CITIES: City[] = [
  { name: "Kinshasa", slug: "kinshasa" },
  { name: "Lubumbashi", slug: "lubumbashi" },
  { name: "Goma", slug: "goma" },
  { name: "Bukavu", slug: "bukavu" },
  { name: "Kisangani", slug: "kisangani" },
  { name: "Kolwezi", slug: "kolwezi" },
  { name: "Matadi", slug: "matadi" },
  { name: "Mbuji-Mayi", slug: "mbuji-mayi", aliases: ["mbuji mayi", "mbujimayi"] },
  { name: "Kananga", slug: "kananga" },
  { name: "Bunia", slug: "bunia" },
  { name: "Uvira", slug: "uvira" },
  { name: "Kalemie", slug: "kalemie" },
  { name: "Likasi", slug: "likasi" },
  { name: "Kikwit", slug: "kikwit" },
  { name: "Boma", slug: "boma" },
  { name: "Muanda", slug: "muanda", aliases: ["moanda"] },
  { name: "Kindu", slug: "kindu" },
  { name: "Mbandaka", slug: "mbandaka" },
  { name: "Tshikapa", slug: "tshikapa" },
  { name: "Butembo", slug: "butembo" },
  { name: "Beni", slug: "beni" },
  { name: "Gemena", slug: "gemena" },
  { name: "Isiro", slug: "isiro" },
  { name: "Bandundu", slug: "bandundu" },
  { name: "Kamina", slug: "kamina" },
  { name: "Mwene-Ditu", slug: "mwene-ditu", aliases: ["mwene ditu"] },
  { name: "Kenge", slug: "kenge" },
  { name: "Gbadolite", slug: "gbadolite" },
  { name: "Lodja", slug: "lodja" },
  { name: "Kabinda", slug: "kabinda" },
  { name: "Mongbwalu", slug: "mongbwalu" },
  { name: "Aru", slug: "aru" },
  { name: "Inongo", slug: "inongo" },
  { name: "Lisala", slug: "lisala" },
  { name: "Buta", slug: "buta" },
  { name: "Kasumbalesa", slug: "kasumbalesa" },
];

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const MATCHERS = DRC_CITIES.map((city) => ({
  city,
  patterns: [city.name, ...(city.aliases || [])].map((name) => new RegExp(`(^| )${normalize(name)}( |$)`)),
}));

/** Villes citées dans la localisation d'une offre (dans l'ordre de la liste). */
export function citiesOf(item: Pick<Announcement, "location">): City[] {
  const text = normalize(item.location || "");
  return MATCHERS.filter(({ patterns }) => patterns.some((pattern) => pattern.test(text))).map(({ city }) => city);
}

export function cityBySlug(slug: string): City | undefined {
  return DRC_CITIES.find((city) => city.slug === slug);
}

/** Offres d'emploi encore ouvertes d'une ville. */
export function jobsInCity(items: Announcement[], slug: string): Announcement[] {
  return items.filter((item) => item.category === "Offre d’emploi" && citiesOf(item).some((city) => city.slug === slug));
}

/** Villes qui ont au moins une offre d'emploi ouverte, de la plus fournie à la moins fournie. */
export function citiesWithJobs(items: Announcement[]): Array<City & { count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.category !== "Offre d’emploi" || isExpired(item)) continue;
    for (const city of citiesOf(item)) counts.set(city.slug, (counts.get(city.slug) || 0) + 1);
  }
  return DRC_CITIES.filter((city) => counts.has(city.slug))
    .map((city) => ({ ...city, count: counts.get(city.slug)! }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

export const cityHref = (slug: string) => `/emplois/${slug}`;
