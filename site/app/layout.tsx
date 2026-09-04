import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Carrières RDC — Offres et annonces",
  description:
    "Carrières RDC — la plateforme pour publier et trouver des opportunités en République démocratique du Congo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
