import type { Metadata } from "next";
import AdminReport from "../../components/AdminReport";

export const metadata: Metadata = {
  title: "Bilan de votre offre — Carrières RDC",
  robots: { index: false, follow: false },
};

// /espace-recruteur/bilan?id=42 : bilan d'une offre rattachée à l'espace du recruteur connecté.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { id } = await searchParams;
  return <AdminReport mode="recruiter" id={typeof id === "string" && /^\d+$/.test(id) ? id : ""} />;
}
