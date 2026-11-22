// Conseils carrière : articles écrits dans l'admin, publiés sur /conseils.

export const ARTICLE_CATEGORIES = [
  "CV et lettre de motivation",
  "Entretien d’embauche",
  "Recherche d’emploi",
  "Appels d’offres",
  "Droit du travail",
  "Vie professionnelle",
  "Conseils aux recruteurs",
];

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_version: string | null;
  has_cover: boolean;
  reading_minutes: number;
  published_at: string | null;
  updated_at: string;
};
export type Article = ArticleSummary & { body: string; related: ArticleSummary[] };
export type AdminArticle = ArticleSummary & { id: number; status: "draft" | "published"; created_at: string; length?: number; body?: string; cover?: string | null };

export const articleHref = (slug: string) => `/conseils/${slug}`;
export const articleCoverUrl = (article: Pick<ArticleSummary, "slug" | "cover_version">) =>
  `/couvertures/${article.slug}${article.cover_version ? `?v=${article.cover_version}` : ""}`;

export function articleDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kinshasa" }) : "";
}

// Où envoyer le lecteur à la fin de l'article, selon la catégorie.
export function articleCallToAction(category: string): { href: string; title: string; text: string; label: string } {
  if (category === "Appels d’offres")
    return { href: "/appels-offres", title: "Des appels d’offres vous attendent", text: "Consultez les marchés publics et privés ouverts en RDC.", label: "Voir les appels d’offres" };
  if (category === "Conseils aux recruteurs")
    return { href: "/recruteurs", title: "Vous recrutez ?", text: "Publiez vos offres sur Carrières RDC et touchez des milliers de candidats.", label: "Publier une offre" };
  return { href: "/offres", title: "Prêt à postuler ?", text: "Mettez ces conseils en pratique avec les offres d’emploi du moment.", label: "Voir les offres d’emploi" };
}

/* ---------- Texte des articles : mise en forme simple ----------
 * ## Titre de partie     ### Sous-titre
 * - élément de liste     1. liste numérotée
 * > Encadré « À retenir »
 * **gras**  [texte du lien](https://…)
 * Une ligne vide sépare les paragraphes.
 */
export type Inline = { type: "text" | "bold"; text: string } | { type: "link"; text: string; href: string };
export type Block =
  | { type: "h2" | "h3"; text: string; id: string }
  | { type: "p" | "quote"; lines: Inline[][] }
  | { type: "ul" | "ol"; items: Inline[][] };

export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "partie"
  );
}

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ type: "text", text: text.slice(last, match.index) });
    if (match[1] !== undefined) parts.push({ type: "bold", text: match[1] });
    else parts.push({ type: "link", text: match[2], href: match[3] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}

export function parseArticle(body: string): Block[] {
  const blocks: Block[] = [];
  const used = new Map<string, number>();
  const uniqueId = (text: string) => {
    const base = headingId(text);
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      const text = heading[2].trim();
      blocks.push({ type: heading[1].length === 2 ? "h2" : "h3", text, id: uniqueId(text) });
      i++;
      continue;
    }
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const ordered = /^\d+[.)]\s+/.test(line);
      const marker = ordered ? /^\d+[.)]\s+/ : /^[-*•]\s+/;
      const items: Inline[][] = [];
      while (i < lines.length && marker.test(lines[i].trim())) {
        items.push(parseInline(lines[i].trim().replace(marker, "")));
        i++;
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }
    const quote = line.startsWith(">");
    const group: Inline[][] = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (!current || /^#{2,3}\s/.test(current) || (!quote && (/^[-*•]\s+/.test(current) || /^\d+[.)]\s+/.test(current))) || current.startsWith(">") !== quote) break;
      group.push(parseInline(quote ? current.replace(/^>\s?/, "") : current));
      i++;
    }
    blocks.push({ type: quote ? "quote" : "p", lines: group });
  }
  return blocks;
}

// Sommaire : les titres de partie (##).
export function articleOutline(body: string): Array<{ id: string; text: string }> {
  return parseArticle(body)
    .filter((block): block is Extract<Block, { type: "h2" }> => block.type === "h2")
    .map(({ id, text }) => ({ id, text }));
}

// Texte brut (données structurées pour Google).
export function plainText(body: string): string {
  return body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^#{2,3}\s+|^[-*•]\s+|^\d+[.)]\s+|^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
