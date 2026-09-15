import { getDatabase } from "@/lib/storage";
import { authErrorResponse, requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAppUser(request);
    const { id } = await context.params;
    const db = getDatabase();
    const order = await db.prepare(`
      SELECT o.*, c.name AS customerName, c.phone AS customerPhone,
        c.document AS customerDocument, c.email AS customerEmail
      FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).bind(id).first();
    if (!order) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const photos = await db.prepare(`
      SELECT id, phase, object_key AS objectKey, filename, content_type AS contentType, created_at AS createdAt
      FROM order_photos WHERE order_id = ? ORDER BY id
    `).bind(id).all();
    return Response.json({ order, photos: photos.results });
  } catch (error) { return authErrorResponse(error, "No fue posible consultar la orden."); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAppUser(request);
    const { id } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const allowedStatuses = ["Recibido", "En diagnóstico", "Esperando aprobación", "En reparación", "Esperando repuesto", "Listo para entregar", "Entregado", "Cancelado"];
    const status = allowedStatuses.includes(String(payload.status)) ? String(payload.status) : "Recibido";
    const diagnosis = String(payload.diagnosis ?? "").trim().slice(0, 2000);
    const workPerformed = String(payload.workPerformed ?? "").trim().slice(0, 2000);
    const total = Math.max(0, Number(payload.total) || 0);
    const paid = Math.max(0, Number(payload.paid) || 0);
    const paymentMethod = String(payload.paymentMethod ?? "").trim().slice(0, 80);
    const warrantyDays = Math.max(0, Math.round(Number(payload.warrantyDays) || 0));
    const technician = String(payload.technician ?? "").trim().slice(0, 100);
    const db = getDatabase();
    await db.prepare(`
      UPDATE orders SET status = ?, diagnosis = ?, work_performed = ?, total = ?, paid = ?,
        payment_method = ?, warranty_days = ?, technician = ?, updated_at = CURRENT_TIMESTAMP,
        delivered_at = CASE WHEN ? = 'Entregado' THEN COALESCE(delivered_at, CURRENT_TIMESTAMP) ELSE delivered_at END
      WHERE id = ?
    `).bind(status, diagnosis, workPerformed, total, paid, paymentMethod, warrantyDays, technician, status, id).run();
    return Response.json({ ok: true });
  } catch (error) { return authErrorResponse(error, "No fue posible actualizar la orden."); }
}
