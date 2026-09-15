CREATE INDEX `idx_order_photos_order_id` ON `order_photos` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer_id` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_updated_at` ON `orders` (`updated_at`);--> statement-breakpoint
PRAGMA optimize;
