import PreviewImage from "../../offre/[slug]/opengraph-image";

// Même image d'aperçu que les offres d'emploi (le badge indique la catégorie).
export const alt = "Publication sur Carrières RDC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60;

export default function Image(props: { params: Promise<{ slug: string }> }) {
  return PreviewImage(props);
}
