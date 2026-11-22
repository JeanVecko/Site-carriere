import { ImageResponse } from "next/og";
import { API_BASE } from "../../lib/api";
import { GREETING_FORMATS, GreetingFormat, GreetingStyle } from "../../lib/greetings";
import { logoDataUrl, siteFonts } from "../../lib/ogAssets";

// Affiche de vœux aux couleurs de Carrières RDC (admin → Souhaits). Réservée à l'administrateur : le texte est
// libre, une adresse publique permettrait à n'importe qui de fabriquer une affiche « officielle ».
const NAVY = "#092d63";
const NAVY_2 = "#0f3d80";
const GOLD = "#d9a400";

const PALETTES: Record<GreetingStyle, { background: string; text: string; accent: string; soft: string; pillText: string; decor: string; ring: string; logoBg: string }> = {
  navy: { background: `linear-gradient(150deg, ${NAVY} 0%, ${NAVY} 55%, ${NAVY_2} 100%)`, text: "#ffffff", accent: GOLD, soft: "#d6e0f0", pillText: NAVY, decor: "rgba(255,255,255,0.05)", ring: "rgba(255,255,255,0.06)", logoBg: "#ffffff" },
  gold: { background: "linear-gradient(150deg, #e6b31e 0%, #d9a400 55%, #c18f00 100%)", text: NAVY, accent: "#ffffff", soft: "#1d3355", pillText: GOLD, decor: "rgba(9,45,99,0.07)", ring: "rgba(255,255,255,0.35)", logoBg: "#ffffff" },
  light: { background: "linear-gradient(150deg, #ffffff 0%, #f7f3e8 100%)", text: NAVY, accent: GOLD, soft: "#4a5872", pillText: NAVY, decor: "rgba(9,45,99,0.05)", ring: "rgba(217,164,0,0.25)", logoBg: "#ffffff" },
};

// Vérification du jeton admin auprès de l'API, gardée 10 minutes (l'aperçu se régénère à chaque modification).
const verified = new Map<string, number>();
async function isAdmin(authorization: string | null): Promise<boolean> {
  if (!authorization) return false;
  const until = verified.get(authorization);
  if (until && until > Date.now()) return true;
  const check = await fetch(`${API_BASE}/messages`, { headers: { Authorization: authorization }, cache: "no-store" }).catch(() => null);
  if (!check?.ok) return false;
  if (verified.size > 50) verified.clear();
  verified.set(authorization, Date.now() + 10 * 60 * 1000);
  return true;
}

// Les émojis ne sont pas dessinés par le moteur d'image : retirés de l'affiche (ils restent dans la légende).
function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, max);
}

export async function POST(request: Request) {
  if (!(await isAdmin(request.headers.get("authorization")))) return Response.json({ error: "Accès refusé." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const format: GreetingFormat = ["square", "story", "wide"].includes(body.format) ? body.format : "square";
  const style: GreetingStyle = ["navy", "gold", "light"].includes(body.style) ? body.style : "navy";
  const title = clean(body.title, 60) || "Bonne semaine !";
  const eyebrow = clean(body.eyebrow, 50);
  const message = clean(body.message, 280);
  const decor = clean(body.decor, 12).toUpperCase();
  const stat = clean(body.stat, 8);
  const statLabel = clean(body.statLabel, 60);

  const [logo, fonts] = await Promise.all([logoDataUrl(), siteFonts()]);
  const { width, height } = GREETING_FORMATS.find((entry) => entry.id === format)!;
  const story = format === "story";
  const wide = format === "wide";
  const p = PALETTES[style];

  const square = format === "square";
  // Carré : tailles réduites pour que le titre, le message et le compteur tiennent avec le pied de page.
  const titleSize = Math.round((wide ? 1.15 : square ? (stat ? 0.8 : 0.88) : 1) * (title.length <= 16 ? 132 : title.length <= 24 ? 110 : title.length <= 34 ? 90 : 74));
  const gap = square ? 26 : 34;
  const messageSize = wide ? 44 : square ? (message.length > 200 ? 32 : 37) : message.length > 200 ? 36 : 42;
  const decorSize = Math.min(wide ? 560 : 460, Math.round(((wide ? 1.7 : 1.45) * width) / Math.max(decor.length, 3)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: p.background,
          color: p.text,
          fontFamily: fonts.length ? "Jakarta" : "sans-serif",
          fontWeight: 500,
          // Vertical : les statuts WhatsApp et TikTok couvrent le haut, la droite et le bas de l'image.
          padding: story ? "170px 150px 360px 90px" : wide ? "80px 120px" : "72px 80px",
          overflow: "hidden",
        }}
      >
        {/* Décor : anneaux et grand mot en filigrane */}
        <div style={{ display: "flex", position: "absolute", width: width * 0.9, height: width * 0.9, borderRadius: 9999, border: `60px solid ${p.ring}`, right: -width * 0.38, top: -width * 0.36 }} />
        <div style={{ display: "flex", position: "absolute", width: width * 0.5, height: width * 0.5, borderRadius: 9999, border: `28px solid ${p.ring}`, left: -width * 0.2, bottom: -width * 0.18 }} />
        {decor && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              right: wide ? 60 : -10,
              bottom: story ? 520 : wide ? 120 : 150,
              fontSize: decorSize,
              fontWeight: 800,
              letterSpacing: -decorSize * 0.04,
              color: p.decor,
              lineHeight: 1,
            }}
          >
            {decor}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {logo && (
            <div style={{ display: "flex", background: p.logoBg, borderRadius: 22, padding: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} width={wide ? 92 : 82} height={wide ? 92 : 82} alt="" />
            </div>
          )}
          <div style={{ display: "flex", fontSize: wide ? 48 : 42, fontWeight: 700 }}>
            Carrières <span style={{ color: style === "gold" ? "#ffffff" : GOLD, marginLeft: 12 }}>RDC</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", margin: story ? "80px 0" : square ? "28px 0" : "40px 0", maxWidth: wide ? 1300 : 920 }}>
          {eyebrow && (
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex", background: style === "gold" ? NAVY : GOLD, color: p.pillText, fontSize: wide ? 34 : 30, fontWeight: 700, padding: "12px 28px", borderRadius: 999, letterSpacing: 0.5 }}>
                {eyebrow}
              </div>
            </div>
          )}
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.04, letterSpacing: -titleSize * 0.025, marginTop: gap }}>{title}</div>
          <div style={{ display: "flex", width: 150, height: 10, borderRadius: 99, background: p.accent, marginTop: gap }} />
          {message && <div style={{ display: "flex", fontSize: messageSize, lineHeight: 1.42, color: p.soft, marginTop: gap, maxWidth: wide ? 1150 : 900 }}>{message}</div>}
          {stat && (
            <div style={{ display: "flex", marginTop: square ? 30 : 44 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  border: `3px solid ${p.accent}`,
                  borderRadius: 26,
                  padding: square ? "14px 26px" : "18px 30px",
                  background: style === "light" ? "rgba(9,45,99,0.04)" : "rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display: "flex", fontSize: square ? 54 : 64, fontWeight: 800, color: style === "gold" ? NAVY : p.accent }}>{stat}</div>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 700, maxWidth: 420, lineHeight: 1.25 }}>{statLabel}</div>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: story ? "column" : "row",
            alignItems: story ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: story ? 8 : 0,
            borderTop: `3px solid ${p.accent}`,
            paddingTop: 26,
            fontSize: wide ? 36 : 32,
          }}
        >
          <div style={{ display: "flex", fontWeight: 700 }}>Votre carrière commence ici</div>
          <div style={{ display: "flex", color: style === "gold" ? "#ffffff" : style === "light" ? NAVY : GOLD, fontWeight: 800 }}>www.carrieresrdc.com</div>
        </div>
      </div>
    ),
    { width, height, fonts, headers: { "Cache-Control": "private, no-store" } }
  );
}
