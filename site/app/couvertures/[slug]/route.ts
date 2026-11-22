import { API_BASE } from "../../lib/api";

// Image de couverture d’un article, relayée depuis l’API et gardée en cache par le CDN de Vercel (l'adresse contient la
// version de l’image, ?v=…, qui change quand elle est remplacée) : la base n'est lue qu'une fois par version.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response(null, { status: 404 });
  const upstream = await fetch(`${API_BASE}/articles/${slug}/cover`, { cache: "no-store" }).catch(() => null);
  if (!upstream?.ok) {
    return new Response(null, { status: upstream?.status === 404 ? 404 : 502, headers: { "Cache-Control": "public, s-maxage=600" } });
  }
  const versioned = new URL(request.url).searchParams.has("v");
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": versioned ? "public, max-age=86400, s-maxage=31536000, immutable" : "public, max-age=3600, s-maxage=3600",
    },
  });
}
