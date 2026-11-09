import type { Metadata } from "next";
import Script from "next/script";
import "./public.css";
import "./admin.css";
import "./animations.css";
import PageTransition from "./components/PageTransition";
import { SPLASH_PRE_PAINT_SCRIPT } from "./lib/splash";

export const metadata: Metadata = {
  title: "Carrières RDC — Offres et annonces",
  description:
    "Carrières RDC — la plateforme pour publier et trouver des opportunités en République démocratique du Congo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : l'écran d'accueil et les effets de défilement ajoutent des classes sur <html> avant React.
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Décide, avant l'affichage, si l'écran de chargement de l'accueil doit apparaître (évite tout clignotement). */}
        <script dangerouslySetInnerHTML={{ __html: SPLASH_PRE_PAINT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Transition entre les pages (logo qui tourne) : dans la mise en page racine pour survivre aux changements de page. */}
        <PageTransition />
        {/* Vercel Web Analytics (sans cookies) : actif seulement sur le site déployé par Vercel. */}
        {process.env.VERCEL === "1" && (
          <>
            <Script id="vercel-analytics-queue" strategy="afterInteractive">
              {"window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };"}
            </Script>
            <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
