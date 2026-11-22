// Pièces jointes d'une publication (admin et espace recruteur) : images compressées, PDF tels quels.
import type { AnnouncementMedia } from "./api";

/* ===================== Pièces jointes ===================== */

const ALLOWED_MEDIA_TYPES = new Set<AnnouncementMedia["type"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function filesToMedia(files: FileList | null): Promise<AnnouncementMedia[]> {
  const selectedFiles = Array.from(files || []);
  if (selectedFiles.some((file) => !ALLOWED_MEDIA_TYPES.has(file.type as AnnouncementMedia["type"]))) {
    throw new Error("Utilisez uniquement des fichiers JPG, PNG, WEBP ou PDF.");
  }
  const media = await Promise.all(
    selectedFiles.map(async (file) => {
      if (file.type.startsWith("image/")) return optimizeImage(file);
      return { name: file.name, type: file.type as AnnouncementMedia["type"], dataUrl: await readAsDataUrl(file) };
    })
  );
  const encodedSize = media.reduce((total, file) => total + file.dataUrl.length, 0);
  if (encodedSize > 5_500_000) throw new Error("La taille totale des fichiers ne doit pas dépasser 4 Mo après compression.");
  return media;
}

async function optimizeImage(file: File): Promise<AnnouncementMedia> {
  const source = await loadImage(file);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de préparer l’image.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { name: file.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.7) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de lire l’image sélectionnée."));
    image.src = URL.createObjectURL(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

// Logo d'une entreprise : 400 px au plus, fond blanc (les logos transparents restent lisibles), JPEG léger.
export async function logoToDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Le logo doit être une image JPG, PNG ou WEBP.");
  const source = await loadImage(file);
  const scale = Math.min(1, 400 / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de préparer le logo.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// Couverture d'un article : recadrée au format 16:9 (centre de l'image), 1600 × 900 au plus, JPEG léger.
export async function coverToDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("L’image doit être au format JPG, PNG ou WEBP.");
  const source = await loadImage(file);
  const ratio = 16 / 9;
  let cropWidth = source.width;
  let cropHeight = cropWidth / ratio;
  if (cropHeight > source.height) {
    cropHeight = source.height;
    cropWidth = cropHeight * ratio;
  }
  const width = Math.min(1600, Math.round(cropWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, Math.round(width / ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de préparer l’image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, (source.width - cropWidth) / 2, (source.height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}
