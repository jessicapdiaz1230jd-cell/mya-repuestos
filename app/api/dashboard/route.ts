import { getDatabase } from "@/lib/storage";
import { authErrorResponse, requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAppUser(request);
    const db = getDatabase();
    const [ordersResult, clientsResult, metricsResult] = await db.batch([
      db.prepare(`
        SELECT o.id, o.order_number AS orderNumber, o.brand, o.model, o.imei,
          o.reported_issue AS reportedIssue, o.diagnosis, o.status,
          o.total, o.paid, o.warranty_days AS warrantyDays,
          o.created_at AS createdAt, o.updated_at AS updatedAt,
          c.name AS customerName, c.phone AS customerPhone,
          (SELECT COUNT(*) FROM order_photos p WHERE p.order_id = o.id) AS photoCount
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        ORDER BY o.updated_at DESC, o.id DESC
        LIMIT 100
      `),
      db.prepare(`
        SELECT c.id, c.name, c.phone, c.document, c.email,
          COUNT(o.id) AS orderCount,
          COALESCE(SUM(o.total), 0) AS totalSpent,
          MAX(o.created_at) AS lastVisit
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id
        ORDER BY lastVisit DESC, c.id DESC
        LIMIT 100
      `),
      db.prepare(`
        SELECT
          COUNT(*) AS totalOrders,
          SUM(CASE WHEN status NOT IN ('Entregado', 'Cancelado') THEN 1 ELSE 0 END) AS activeOrders,
          SUM(CASE WHEN status = 'Listo para entregar' THEN 1 ELSE 0 END) AS readyOrders,
          COALESCE(SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN paid ELSE 0 END), 0) AS monthRevenue,
          COALESCE(SUM(total - paid), 0) AS pendingBalance
        FROM orders
      `),
    ]);

    const metrics = (metricsResult.results[0] ?? {}) as Record<string, unknown>;
    return Response.json({
      orders: ordersResult.results,
      customers: clientsResult.results,
      metrics,
    });
  } catch (error) { return authErrorResponse(error, "No fue posible cargar la información."); }
}
