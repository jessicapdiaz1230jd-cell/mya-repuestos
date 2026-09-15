import { env } from "cloudflare:workers";

export function getDatabase(): D1Database {
  if (!env.DB) throw new Error("La base de datos no está disponible.");
  return env.DB;
}

export function getFileStore(): R2Bucket {
  if (!env.FILES) throw new Error("El almacenamiento de imágenes no está disponible.");
  return env.FILES;
}

export function cleanText(value: FormDataEntryValue | null, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function moneyValue(value: FormDataEntryValue | null): number {
  const parsed = Number(typeof value === "string" ? value : 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
