import { notFound, permanentRedirect } from "next/navigation";

type Props = { searchParams: Promise<{ id?: string }> };

// Ancienne adresse /detail?id=12 : redirige vers /offre/12-… (la page corrige ensuite le titre dans l'URL).
export default async function LegacyDetailPage({ searchParams }: Props) {
  const { id } = await searchParams;
  if (!id || !/^\d+$/.test(id)) notFound();
  permanentRedirect(`/offre/${id}`);
}
