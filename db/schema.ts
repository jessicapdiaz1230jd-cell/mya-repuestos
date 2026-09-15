import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  document: text("document").notNull().default(""),
  email: text("email").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  color: text("color").notNull().default(""),
  imei: text("imei").notNull().default(""),
  accessories: text("accessories").notNull().default(""),
  reportedIssue: text("reported_issue").notNull(),
  physicalCondition: text("physical_condition").notNull().default(""),
  diagnosis: text("diagnosis").notNull().default(""),
  workPerformed: text("work_performed").notNull().default(""),
  technician: text("technician").notNull().default(""),
  status: text("status").notNull().default("Recibido"),
  laborCost: real("labor_cost").notNull().default(0),
  partsCost: real("parts_cost").notNull().default(0),
  total: real("total").notNull().default(0),
  paid: real("paid").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default(""),
  warrantyDays: integer("warranty_days").notNull().default(0),
  notes: text("notes").notNull().default(""),
  customData: text("custom_data").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deliveredAt: text("delivered_at"),
}, (table) => [
  index("idx_orders_customer_id").on(table.customerId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_updated_at").on(table.updatedAt),
]);

export const orderPhotos = sqliteTable("order_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  phase: text("phase").notNull().default("recepcion"),
  objectKey: text("object_key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_order_photos_order_id").on(table.orderId),
]);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
