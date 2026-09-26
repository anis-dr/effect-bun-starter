CREATE TABLE "admins" (
	"appointed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text PRIMARY KEY
);
--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_name_key" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;