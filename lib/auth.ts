import { env } from "cloudflare:workers";

export type AppRole = "admin" | "recepcion" | "tecnico";
export type AppUser = { id: string; email: string; name: string; role: AppRole };

export class AuthError extends Error {
  constructor(message: string, public status = 401) { super(message); }
}

function config() {
  return {
    url: env.SUPABASE_URL?.replace(/\/$/, ""),
    anon: env.SUPABASE_ANON_KEY,
    service: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function hasExternalAuth() {
  const { url, anon } = config();
  return Boolean(url && anon);
}

export async function requireAppUser(request: Request, roles?: AppRole[]): Promise<AppUser> {
  const { url, anon } = config();
  if (!url || !anon) {
    const openAIUser = request.headers.get("oai-authenticated-user-id");
    if (!openAIUser) throw new AuthError("El acceso independiente todavía no está configurado.", 503);
    return { id: openAIUser, email: "administrador@mya.local", name: "Administrador", role: "admin" };
  }
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new AuthError("Inicia sesión para continuar.");
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization } });
  if (!response.ok) throw new AuthError("Tu sesión venció. Inicia sesión nuevamente.");
  const raw = await response.json() as Record<string, unknown>;
  const appMetadata = (raw.app_metadata ?? {}) as Record<string, unknown>;
  const userMetadata = (raw.user_metadata ?? {}) as Record<string, unknown>;
  const role = ["admin", "recepcion", "tecnico"].includes(String(appMetadata.role)) ? String(appMetadata.role) as AppRole : "recepcion";
  if (roles && !roles.includes(role)) throw new AuthError("No tienes permiso para realizar este cambio.", 403);
  return { id: String(raw.id), email: String(raw.email ?? ""), name: String(userMetadata.name ?? raw.email ?? "Usuario"), role };
}

export function authErrorResponse(error: unknown, fallback: string) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

export async function supabaseAdmin(path: string, init?: RequestInit) {
  const { url, service } = config();
  if (!url || !service) throw new AuthError("Falta configurar la clave administrativa de usuarios.", 503);
  const response = await fetch(`${url}/auth/v1/admin${path}`, {
    ...init,
    headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new AuthError(String(body.msg ?? body.message ?? "No fue posible administrar el usuario."), response.status);
  return body;
}
