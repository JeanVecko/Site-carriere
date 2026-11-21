import { revalidatePath } from "next/cache";
import { API_BASE } from "../../../lib/api";

// Laisse le temps à l'API (hébergement gratuit) de se réveiller.
export const maxDuration = 60;

// Tâche planifiée de Vercel (voir vercel.json), chaque matin : demande à l'API d'envoyer les alertes e-mail.
// Vercel ajoute « Authorization: Bearer <CRON_SECRET> » ; la même valeur doit être définie dans ALERTS_SECRET sur Render.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Accès refusé." }, { status: 401 });
  }
  const result = await fetch(`${API_BASE}/alerts/digest`, {
    method: "POST",
    headers: { "x-alerts-secret": secret },
    cache: "no-store",
  }).catch((error: unknown) => ({ ok: false, status: 0, error: String(error) }));
  // Rafraîchit chaque matin toutes les pages du site : offres arrivées à leur date limite, mises à la une terminées…
  revalidatePath("/", "layout");
  return Response.json({ ok: result.ok, status: result.status }, { status: result.ok ? 200 : 502 });
}
