import { authErrorResponse, requireAppUser, supabaseAdmin, type AppRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAppUser(request, ["admin"]);
    const body = await supabaseAdmin("/users?page=1&per_page=100");
    const source = Array.isArray(body.users) ? body.users as Record<string, unknown>[] : [];
    const users = source.map((item) => ({
      id: String(item.id), email: String(item.email ?? ""), createdAt: item.created_at,
      name: String((item.user_metadata as Record<string, unknown> | undefined)?.name ?? ""),
      role: String((item.app_metadata as Record<string, unknown> | undefined)?.role ?? "recepcion"),
    }));
    return Response.json({ users });
  } catch (error) { return authErrorResponse(error, "No fue posible consultar los usuarios."); }
}

export async function POST(request: Request) {
  try {
    await requireAppUser(request, ["admin"]);
    const payload = await request.json() as Record<string, unknown>;
    const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 160);
    const password = String(payload.password ?? "");
    const name = String(payload.name ?? "").trim().slice(0, 100);
    const role: AppRole = ["admin", "recepcion", "tecnico"].includes(String(payload.role)) ? String(payload.role) as AppRole : "recepcion";
    if (!email.includes("@") || password.length < 8 || !name) return Response.json({ error: "Completa nombre, correo y una contraseña de mínimo 8 caracteres." }, { status: 400 });
    const user = await supabaseAdmin("/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name }, app_metadata: { role } }) });
    return Response.json({ user }, { status: 201 });
  } catch (error) { return authErrorResponse(error, "No fue posible crear el usuario."); }
}
