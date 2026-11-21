import { API_BASE } from "../../../lib/api";

// Pièce jointe d'une publication (image, PDF) ou sa vignette (« cover »), relayée depuis l'API et gardée en cache
// par le CDN de Vercel. L'adresse contient la version des fichiers (?v=…), qui change quand ils sont remplacés :
// chaque version n'est donc lue qu'une fois dans la base, au lieu d'une fois par visiteur.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  if (!/^\d+$/.test(id) || !(file === "cover" || /^\d+$/.test(file))) return new Response(null, { status: 404 });

  const path = file === "cover" ? "cover" : `media/${file}`;
  const upstream = await fetch(`${API_BASE}/announcements/${id}/${path}`, { cache: "no-store" }).catch(() => null);
  if (!upstream) return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  if (!upstream.ok) {
    // Fichier absent (offre retirée…) : réponse gardée peu de temps.
    return new Response(null, { status: upstream.status === 404 ? 404 : 502, headers: { "Cache-Control": "public, s-maxage=600" } });
  }

  const versioned = new URL(request.url).searchParams.has("v");
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    // Navigateur : 1 jour. CDN : 1 an pour une version donnée (l'adresse change avec le fichier), 1 h sinon.
    "Cache-Control": versioned
      ? "public, max-age=86400, s-maxage=31536000, immutable"
      : "public, max-age=3600, s-maxage=3600",
  });
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  return new Response(upstream.body, { status: 200, headers });
}
