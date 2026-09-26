CREATE TABLE "files" (
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"key" text NOT NULL UNIQUE,
	"variant_widths" integer[] DEFAULT '{}'::integer[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_file_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_avatar_file_id_key" UNIQUE("avatar_file_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_avatar_file_id_files_id_fkey" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id");