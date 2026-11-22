import { ImageResponse } from "next/og";
import { decodeEntities, formatDate } from "../../../lib/api";
import { fetchAnnouncement } from "../../../lib/server";
import { logoDataUrl, siteFonts } from "../../../lib/ogAssets";

// Image prête à publier pour une offre (kit de diffusion de l'admin) :
// /api/kit/42?format=square (1080 × 1080, Facebook), ?format=story (1080 × 1920, statut WhatsApp, TikTok)
// ou ?format=wide (1920 × 1080, 16:9 : Facebook, YouTube, LinkedIn, écrans).
const NAVY = "#092d63";
const NAVY_2 = "#0f3d80";
const GOLD = "#d9a400";
const SOFT = "#d6e0f0";

const LABELS: Record<string, string> = {
  "Offre d’emploi": "OFFRE D’EMPLOI",
  Annonce: "ANNONCE",
  "Appel d’offre": "APPEL D’OFFRES",
};

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format");
  const story = format === "story";
  const wide = format === "wide";
  const [item, logo, fonts] = await Promise.all([fetchAnnouncement(id), logoDataUrl(), siteFonts()]);
  if (!item) return new Response("Offre introuvable ou retirée du site.", { status: 404 });

  const width = wide ? 1920 : 1080;
  const height = story ? 1920 : 1080;
  const title = clip(decodeEntities(item.title), story ? 110 : 90);
  const company = clip(decodeEntities(item.company), 60);
  const location = clip(decodeEntities(item.location), 60);
  const isTender = item.category === "Appel d’offre";
  const contract = item.contract_type && item.contract_type !== "Autre" ? item.contract_type : "";
  const salary = item.salary ? clip(decodeEntities(item.salary), 50) : "";
  const deadline = item.deadline ? formatDate(item.deadline) : "";
  const titleSize = story ? (title.length > 60 ? 66 : title.length > 35 ? 76 : 88) : title.length > 60 ? 64 : title.length > 35 ? 76 : 88;
  const rows = [
    ["Lieu", location],
    [item.category === "Annonce" ? "Type" : "Contrat", contract],
    ["Salaire", salary],
  ].filter(([, value]) => value);

  const filename = `carrieres-rdc-${item.id}-${story ? "story" : wide ? "horizontal" : "carre"}.png`;
  const label = LABELS[item.category || ""] || "PUBLICATION";
  const cta = isTender ? "Dossier complet sur" : item.category === "Annonce" ? "Détails sur" : "Postulez sur";
  const options = {
    width,
    height,
    fonts,
    headers: { "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "public, max-age=60" },
  };

  if (wide) {
    // 16:9 : informations à gauche, date limite et adresse du site dans un panneau à droite.
    const wideTitle = title.length > 70 ? 72 : title.length > 40 ? 88 : 104;
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY} 60%, ${NAVY_2} 100%)`,
            color: "#fff",
            fontFamily: fonts.length ? "Jakarta" : "sans-serif",
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", width: 1260, padding: "80px 70px 80px 100px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              {logo && (
                <div style={{ display: "flex", background: "#fff", borderRadius: 22, padding: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} width={92} height={92} alt="" />
                </div>
              )}
              <div style={{ display: "flex", fontSize: 50, fontWeight: 700 }}>
                Carrières <span style={{ color: GOLD, marginLeft: 12 }}>RDC</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
              <div style={{ display: "flex" }}>
                <div style={{ display: "flex", background: GOLD, color: NAVY, fontSize: 34, fontWeight: 700, padding: "12px 30px", borderRadius: 999 }}>
                  {label}
                </div>
              </div>
              <div style={{ display: "flex", fontSize: wideTitle, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2, marginTop: 36 }}>{title}</div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 50, color: GOLD, fontWeight: 700, marginTop: 28 }}>
                {company}
                {item.verified && <span style={{ display: "flex", background: "#2a7de1", borderRadius: 999, color: "#fff", fontSize: 26, fontWeight: 800, marginLeft: 18, padding: "6px 16px", alignItems: "center" }}><svg width={24} height={24} viewBox="0 0 24 24" style={{ marginRight: 6 }}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>Vérifiée</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 44px", marginTop: 34 }}>
                {rows.map(([name, value]) => (
                  <div key={name} style={{ display: "flex", fontSize: 38, color: SOFT, marginRight: 44 }}>
                    <span style={{ color: "#fff", fontWeight: 700, marginRight: 14, flexShrink: 0 }}>{name} :</span>
                    <span style={{ display: "flex", maxWidth: 960 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 40,
              width: 660,
              padding: "80px 90px 80px 70px",
              background: "rgba(255,255,255,.06)",
              borderLeft: `4px solid ${GOLD}`,
            }}
          >
            {deadline && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  border: `3px solid ${GOLD}`,
                  borderRadius: 26,
                  padding: "30px 28px",
                  background: "rgba(255,255,255,.08)",
                }}
              >
                <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{isTender ? "Soumission avant le" : "Date limite"}</div>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: GOLD }}>{deadline}</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>{cta}</div>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 800, color: GOLD }}>www.carrieresrdc.com</div>
            </div>
          </div>
        </div>
      ),
      options
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY} 55%, ${NAVY_2} 100%)`,
          color: "#fff",
          // Format vertical : TikTok et les statuts WhatsApp couvrent le haut (onglets), la droite (boutons) et le bas
          // (légende) de l'image. Le texte forme un seul bloc, centré verticalement dans la zone toujours visible.
          justifyContent: story ? "center" : "flex-start",
          padding: story ? "180px 200px 420px 80px" : "70px 72px",
          fontFamily: fonts.length ? "Jakarta" : "sans-serif",
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {logo && (
              <div style={{ display: "flex", background: "#fff", borderRadius: 20, padding: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} width={story ? 84 : 80} height={story ? 84 : 80} alt="" />
              </div>
            )}
            <div style={{ display: "flex", fontSize: story ? 44 : 42, fontWeight: 700 }}>
              Carrières <span style={{ color: GOLD, marginLeft: 12 }}>RDC</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: story ? 0 : 1, justifyContent: "center", margin: story ? "70px 0 60px" : 0 }}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: GOLD, color: NAVY, fontSize: story ? 30 : 30, fontWeight: 700, padding: "12px 28px", borderRadius: 999 }}>
              {label}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, marginTop: story ? 32 : 34 }}>{title}</div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", fontSize: story ? 42 : 44, color: GOLD, fontWeight: 700, marginTop: story ? 24 : 26 }}>
            {company}
            {item.verified && <span style={{ display: "flex", background: "#2a7de1", borderRadius: 999, color: "#fff", fontSize: story ? 24 : 24, fontWeight: 800, marginLeft: 16, padding: "5px 14px", alignItems: "center" }}><svg width={22} height={22} viewBox="0 0 24 24" style={{ marginRight: 6 }}><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /></svg>Vérifiée</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: story ? 12 : 12, marginTop: story ? 32 : 36 }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: "flex", fontSize: story ? 34 : 32, color: SOFT }}>
                <span style={{ color: "#fff", fontWeight: 700, marginRight: 14, flexShrink: 0 }}>{label} :</span>
                <span style={{ display: "flex", flex: 1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {deadline && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,.1)",
              border: `3px solid ${GOLD}`,
              borderRadius: 24,
              fontSize: story ? 34 : 34,
              fontWeight: 700,
              padding: story ? "22px 18px" : "22px 24px",
              marginBottom: story ? 30 : 34,
            }}
          >
            {isTender ? "Soumission avant le " : "Date limite : "}
            <span style={{ color: GOLD, marginLeft: 10 }}>{deadline}</span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: story ? "column" : "row",
            alignItems: story ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: story ? 8 : 0,
            borderTop: `3px solid ${GOLD}`,
            paddingTop: story ? 24 : 28,
            fontSize: story ? 34 : 32,
          }}
        >
          <div style={{ display: "flex", fontWeight: 700 }}>{cta}</div>
          <div style={{ display: "flex", color: GOLD, fontWeight: 700 }}>www.carrieresrdc.com</div>
        </div>
      </div>
    ),
    options
  );
}
