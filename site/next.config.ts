import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dépôt a aussi un package-lock.json à la racine (scripts communs) :
  // on indique explicitement que le projet Next.js est le dossier site/.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
