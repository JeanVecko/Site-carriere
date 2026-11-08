import type { Metadata } from "next";
import AdminContent from "../components/AdminContent";

export const metadata: Metadata = {
  title: "Administration — Carrières RDC",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminContent />;
}
