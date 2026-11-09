import OfferImage from "./offre/[slug]/opengraph-image";

// Image d'aperçu générale du site (accueil et pages de listes), même présentation que celle des offres.
export const alt = "Carrières RDC — offres d’emploi, annonces et appels d’offres en RDC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return OfferImage({});
}
