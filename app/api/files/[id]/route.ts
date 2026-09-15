import { getFileStore } from "@/lib/storage";
import { authErrorResponse, requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAppUser(request);
    const { id } = await context.params;
    const object = await getFileStore().get(id);
    if (!object) return new Response("Archivo no encontrado", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "private, max-age=3600");
    return new Response(object.body, { headers });
  } catch (error) { return authErrorResponse(error, "No fue posible abrir la imagen."); }
}
