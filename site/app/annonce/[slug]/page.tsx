import PublicationPage, { publicationMetadata, publicationStaticParams, type PublicationProps } from "../../components/PublicationPage";

// Annonces : /annonce/12-…
const BASE = "/annonce";

export const revalidate = 60;

export async function generateStaticParams() {
  return publicationStaticParams(BASE);
}

export async function generateMetadata(props: PublicationProps) {
  return publicationMetadata(props);
}

export default function Page(props: PublicationProps) {
  return <PublicationPage {...props} base={BASE} />;
}
