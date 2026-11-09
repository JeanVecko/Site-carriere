import { revalidatePath } from "next/cache";
import { API_BASE } from "../../lib/api";

// Appelé par l'espace admin après une publication, une modification ou une suppression :
// toutes les pages (accueil, listes, offres) sont rafraîchies à leur prochaine visite,
// au lieu d'attendre jusqu'à 60 s la fin du cache.
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return Response.json({ error: "Authentification requise." }, { status: 401 });

  // Le jeton est vérifié par l'API sur une route réservée à l'administrateur.
  const check = await fetch(`${API_BASE}/messages`, { headers: { Authorization: authorization }, cache: "no-store" }).catch(() => null);
  if (!check?.ok) return Response.json({ error: "Accès refusé." }, { status: 403 });

  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}
