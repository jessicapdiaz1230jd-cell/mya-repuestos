import { authErrorResponse, requireAppUser } from "@/lib/auth";
import { defaultAppConfig, normalizeAppConfig } from "@/lib/app-config";
import { getDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);
    const row = await getDatabase().prepare("SELECT value FROM settings WHERE key = 'app_config'").first<{ value: string }>();
    let config = defaultAppConfig;
    if (row?.value) try { config = normalizeAppConfig(JSON.parse(row.value)); } catch { config = defaultAppConfig; }
    return Response.json({ config, user });
  } catch (error) { return authErrorResponse(error, "No fue posible cargar la configuración."); }
}

export async function PUT(request: Request) {
  try {
    await requireAppUser(request, ["admin"]);
    const config = normalizeAppConfig(await request.json());
    await getDatabase().prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES ('app_config', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).bind(JSON.stringify(config)).run();
    return Response.json({ ok: true, config });
  } catch (error) { return authErrorResponse(error, "No fue posible guardar la configuración."); }
}
