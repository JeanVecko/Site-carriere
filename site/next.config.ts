import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dépôt a aussi un package-lock.json à la racine (scripts communs) :
  // on indique explicitement que le projet Next.js est le dossier site/.
  outputFileTracingRoot: process.cwd(),
  // Le service worker de l'application installable ne doit jamais rester en cache : les mises à jour arrivent aussitôt.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
