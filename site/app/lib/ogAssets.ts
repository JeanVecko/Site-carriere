import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Ressources communes aux images générées côté serveur (kit de diffusion des offres, affiches de vœux).

export async function logoDataUrl(): Promise<string | null> {
  try {
    const data = await readFile(join(process.cwd(), "public/og-logo.png"));
    return `data:image/png;base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

// Police du site (Plus Jakarta Sans) chargée depuis Google Fonts au premier appel ; sans elle, police par défaut.
export type Font = { name: string; data: ArrayBuffer; weight: 500 | 700 | 800; style: "normal" };
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
export function siteFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([loadFont(500), loadFont(700), loadFont(800)]).catch(() => {
    fontsPromise = null; // nouvel essai au prochain appel
    return [];
  });
  return fontsPromise;
}
