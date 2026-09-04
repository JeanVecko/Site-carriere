import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import AdminContent from "../components/AdminContent";

export const metadata: Metadata = {
  title: "Administration — Carrières RDC",
};

export default function Page() {
  return (
    <div className="admin-page">
      <SiteHeader adminButton />
      <main className="admin-main">
        <AdminContent />
      </main>
    </div>
  );
}
