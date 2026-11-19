import type { Metadata } from "next";
import AdminReport from "../../components/AdminReport";

export const metadata: Metadata = {
  title: "Bilan d’une offre — Carrières RDC",
  robots: { index: false, follow: false },
};

// /admin/bilan?id=42 : bilan d'une offre, réservé à l'administrateur connecté.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { id } = await searchParams;
  return <AdminReport id={typeof id === "string" && /^\d+$/.test(id) ? id : ""} />;
}
