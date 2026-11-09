import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { decodeEntities, formatDate, isExpired } from "../../lib/api";
import { fetchAnnouncement } from "../../lib/server";

// Image d'aperçu affichée quand le lien d'une offre est partagé (WhatsApp, Facebook, LinkedIn…).
export const alt = "Offre publiée sur Carrières RDC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 60;

const NAVY = "#092d63";
const GOLD = "#d9a400";

const CATEGORY_LABELS: Record<string, string> = {
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

export default async function Image({ params }: { params?: Promise<{ slug?: string }> }) {
  const id = decodeURIComponent((await params)?.slug || "").split("-")[0];
  const [item, logo] = await Promise.all([id ? fetchAnnouncement(id) : null, logoDataUrl()]);

  const title = item ? clip(decodeEntities(item.title), 90) : "Offres d’emploi, annonces et appels d’offres en RDC";
  const company = item ? clip(decodeEntities(item.company), 60) : "";
  const label = item ? CATEGORY_LABELS[item.category || ""] || "PUBLICATION" : "CARRIÈRES RDC";
  const details = item
    ? [decodeEntities(item.location || ""), item.contract_type === "Autre" ? "" : item.contract_type || ""].filter(Boolean).join("  ·  ")
    : "";
  const deadline = item?.deadline
    ? isExpired(item)
      ? "Offre expirée"
      : `Date limite : ${formatDate(item.deadline)}`
    : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: NAVY, color: "#fff", padding: "56px 64px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {logo && (
              <div style={{ display: "flex", background: "#fff", borderRadius: 18, padding: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} width={72} height={72} alt="" />
              </div>
            )}
            <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
              Carrières <span style={{ color: GOLD, marginLeft: 10 }}>RDC</span>
            </div>
          </div>
          <div style={{ display: "flex", background: GOLD, color: NAVY, fontSize: 24, fontWeight: 700, padding: "10px 22px", borderRadius: 999 }}>
            {label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: title.length > 55 ? 54 : 66, fontWeight: 700, lineHeight: 1.12 }}>{title}</div>
          {company && <div style={{ display: "flex", fontSize: 36, color: GOLD, marginTop: 22, fontWeight: 600 }}>{company}</div>}
          {details && <div style={{ display: "flex", fontSize: 30, color: "#d6e0f0", marginTop: 14 }}>{details}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `3px solid ${GOLD}`, paddingTop: 22, fontSize: 28 }}>
          <div style={{ display: "flex", fontWeight: 600 }}>{deadline || (item ? "Postulez dès maintenant" : "Offres · Annonces · Appels d’offres")}</div>
          <div style={{ display: "flex", color: "#d6e0f0" }}>www.carrieresrdc.com</div>
        </div>
      </div>
    ),
    size
  );
}
