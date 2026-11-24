ALTER TABLE "screens" ADD COLUMN IF NOT EXISTS "daily_payers" integer;--> statement-breakpoint
UPDATE "screens" SET "daily_payers" = 900 WHERE "id" = 'scr_demo_salida_a' AND "daily_payers" IS NULL;--> statement-breakpoint
UPDATE "screens" SET "daily_payers" = 700 WHERE "id" = 'scr_demo_salida_b' AND "daily_payers" IS NULL;--> statement-breakpoint
UPDATE "screens" SET "daily_payers" = 450 WHERE "id" = 'scr_demo_cajero_n2' AND "daily_payers" IS NULL;
