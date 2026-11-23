CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"city" text,
	"spaces" integer,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");