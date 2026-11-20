import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { decodeEntities, formatDate } from "../../../lib/api";
import { fetchAnnouncement } from "../../../lib/server";

// Image prête à publier pour une offre (kit de diffusion de l'admin) :
// /api/kit/42?format=square (1080 × 1080, Facebook) ou ?format=story (1080 × 1920, statut WhatsApp, TikTok).
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

async function logoDataUrl(): Promise<string | null> {
  try {
    const data = await readFile(join(process.cwd(), "public/og-logo.png"));
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

// Police du site (Plus Jakarta Sans) chargée depuis Google Fonts au premier appel ; sans elle, police par défaut.
type Font = { name: string; data: ArrayBuffer; weight: 500 | 700 | 800; style: "normal" };
let fontsPromise: Promise<Font[]> | null = null;
async function loadFont(weight: Font["weight"]): Promise<Font> {
  // Sans navigateur moderne déclaré, Google Fonts renvoie la police en TTF (format lu par ImageResponse).
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}`)).text();
  const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
  if (!url) throw new Error("police introuvable");
  const response = await fetch(url);
  if (!response.ok) throw new Error("police indisponible");
  return { name: "Jakarta", data: await response.arrayBuffer(), weight, style: "normal" };
}
function siteFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([loadFont(500), loadFont(700), loadFont(800)]).catch(() => {
    fontsPromise = null; // nouvel essai au prochain appel
    return [];
  });
  return fontsPromise;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = new URL(request.url).searchParams.get("format") === "story";
  const [item, logo, fonts] = await Promise.all([fetchAnnouncement(id), logoDataUrl(), siteFonts()]);
  if (!item) return new Response("Offre introuvable ou retirée du site.", { status: 404 });

  const width = 1080;
  const height = story ? 1920 : 1080;
  const title = clip(decodeEntities(item.title), story ? 110 : 90);
  const company = clip(decodeEntities(item.company), 60);
  const location = clip(decodeEntities(item.location), 60);
  const isTender = item.category === "Appel d’offre";
  const contract = item.contract_type && item.contract_type !== "Autre" ? item.contract_type : "";
  const salary = item.salary ? clip(decodeEntities(item.salary), 50) : "";
  const deadline = item.deadline ? formatDate(item.deadline) : "";
  const titleSize = story ? (title.length > 60 ? 84 : 100) : title.length > 60 ? 64 : title.length > 35 ? 76 : 88;
  const rows = [
    ["Lieu", location],
    [item.category === "Annonce" ? "Type" : "Contrat", contract],
    ["Salaire", salary],
  ].filter(([, value]) => value);

  const filename = `carrieres-rdc-${item.id}-${story ? "story" : "carre"}.png`;
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
          padding: story ? "110px 80px" : "70px 72px",
          fontFamily: fonts.length ? "Jakarta" : "sans-serif",
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {logo && (
              <div style={{ display: "flex", background: "#fff", borderRadius: 20, padding: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} width={story ? 96 : 80} height={story ? 96 : 80} alt="" />
              </div>
            )}
            <div style={{ display: "flex", fontSize: story ? 50 : 42, fontWeight: 700 }}>
              Carrières <span style={{ color: GOLD, marginLeft: 12 }}>RDC</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: GOLD, color: NAVY, fontSize: story ? 36 : 30, fontWeight: 700, padding: "12px 28px", borderRadius: 999 }}>
              {LABELS[item.category || ""] || "PUBLICATION"}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, marginTop: story ? 44 : 34 }}>{title}</div>
          <div style={{ display: "flex", fontSize: story ? 52 : 44, color: GOLD, fontWeight: 700, marginTop: story ? 34 : 26 }}>{company}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: story ? 18 : 12, marginTop: story ? 50 : 36 }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: "flex", fontSize: story ? 40 : 32, color: SOFT }}>
                <span style={{ color: "#fff", fontWeight: 700, marginRight: 14 }}>{label} :</span>
                {value}
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
              fontSize: story ? 44 : 34,
              fontWeight: 700,
              padding: story ? "30px 24px" : "22px 24px",
              marginBottom: story ? 50 : 34,
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
            alignItems: "center",
            justifyContent: "space-between",
            gap: story ? 18 : 0,
            borderTop: `3px solid ${GOLD}`,
            paddingTop: story ? 40 : 28,
            fontSize: story ? 40 : 32,
          }}
        >
          <div style={{ display: "flex", fontWeight: 700 }}>{isTender ? "Dossier complet sur" : item.category === "Annonce" ? "Détails sur" : "Postulez sur"}</div>
          <div style={{ display: "flex", color: GOLD, fontWeight: 700 }}>www.carrieresrdc.com</div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts,
      headers: { "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "public, max-age=60" },
    }
  );
}
