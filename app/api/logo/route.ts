import { getFileStore } from "@/lib/storage";
import { authErrorResponse, requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const LOGO_KEY = "mya-brand-logo";

export async function GET(request: Request) {
  try {
    const object = await getFileStore().get(LOGO_KEY);
    if (!object) return Response.redirect(new URL("/brand-logo.jpg", request.url), 302);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "no-store");
    return new Response(object.body, { headers });
  } catch {
    return Response.redirect(new URL("/brand-logo.jpg", request.url), 302);
  }
}

export async function POST(request: Request) {
  try {
    await requireAppUser(request, ["admin"]);
    const form = await request.formData();
    const file = form.get("logo");
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      return Response.json({ error: "Selecciona una imagen de hasta 8 MB." }, { status: 400 });
    }
    await getFileStore().put(LOGO_KEY, file.stream(), { httpMetadata: { contentType: file.type } });
    return Response.json({ ok: true });
  } catch (error) { return authErrorResponse(error, "No fue posible cambiar el logo."); }
}
