import { cleanText, getDatabase, getFileStore, moneyValue } from "@/lib/storage";
import { authErrorResponse, requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function orderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `MYA-${date}-${now.getTime().toString(36).slice(-5).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    await requireAppUser(request);
    const form = await request.formData();
    const orderNumber = orderCode();
    const customerName = cleanText(form.get("customerName"), 120) || "Cliente sin identificar";
    const phone = cleanText(form.get("phone"), 30) || `SIN-${orderNumber}`;
    const brand = cleanText(form.get("brand"), 60) || "Marca no informada";
    const model = cleanText(form.get("model"), 80) || "Modelo no informado";
    const reportedIssue = cleanText(form.get("reportedIssue"), 1200) || "Sin descripción inicial";

    const db = getDatabase();
    await db.prepare(`
      INSERT INTO customers (name, phone, document, email)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        document = CASE WHEN excluded.document != '' THEN excluded.document ELSE customers.document END,
        email = CASE WHEN excluded.email != '' THEN excluded.email ELSE customers.email END
    `).bind(
      customerName,
      phone,
      cleanText(form.get("document"), 40),
      cleanText(form.get("email"), 120),
    ).run();

    const customer = await db.prepare("SELECT id FROM customers WHERE phone = ?")
      .bind(phone).first<{ id: number }>();
    if (!customer) throw new Error("No fue posible registrar el cliente.");

    const laborCost = moneyValue(form.get("laborCost"));
    const partsCost = moneyValue(form.get("partsCost"));
    const total = laborCost + partsCost;
    const inserted = await db.prepare(`
      INSERT INTO orders (
        order_number, customer_id, brand, model, color, imei, accessories,
        reported_issue, physical_condition, technician, labor_cost,
        parts_cost, total, warranty_days, notes, custom_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      orderNumber,
      customer.id,
      brand,
      model,
      cleanText(form.get("color"), 40),
      cleanText(form.get("imei"), 40),
      cleanText(form.get("accessories"), 300),
      reportedIssue,
      cleanText(form.get("physicalCondition"), 1200),
      cleanText(form.get("technician"), 100),
      laborCost,
      partsCost,
      total,
      Math.round(moneyValue(form.get("warrantyDays"))),
      cleanText(form.get("notes"), 1200),
      JSON.stringify(Object.fromEntries(Array.from(form.entries())
        .filter(([key, value]) => key.startsWith("custom:") && typeof value === "string")
        .map(([key, value]) => [key.slice(7), String(value).trim().slice(0, 2000)]))),
    ).first<{ id: number }>();

    if (!inserted) throw new Error("No fue posible crear la orden.");

    const files = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 8);
    if (files.length) {
      const store = getFileStore();
      for (const file of files) {
        if (file.size > 8 * 1024 * 1024 || !file.type.startsWith("image/")) continue;
        const objectKey = crypto.randomUUID();
        await store.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
        await db.prepare(`
          INSERT INTO order_photos (order_id, phase, object_key, filename, content_type)
          VALUES (?, 'recepcion', ?, ?, ?)
        `).bind(inserted.id, objectKey, file.name.slice(0, 180), file.type).run();
      }
    }

    return Response.json({ id: inserted.id, orderNumber }, { status: 201 });
  } catch (error) { return authErrorResponse(error, "No fue posible guardar la orden."); }
}
