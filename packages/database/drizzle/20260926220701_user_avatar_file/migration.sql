-- A replaced or deleted avatar deletes its file row, so no `files` row
-- outlives the account column that linked it. The API removes the bytes; a
-- sweep that lists stored keys missing from `files` can catch any it missed.
CREATE FUNCTION "delete_replaced_avatar_file"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	DELETE FROM "files" WHERE "id" = OLD."avatar_file_id";
	RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "user_delete_avatar_file"
AFTER UPDATE OF "avatar_file_id" ON "user"
FOR EACH ROW WHEN (OLD."avatar_file_id" IS DISTINCT FROM NEW."avatar_file_id")
EXECUTE FUNCTION "delete_replaced_avatar_file"();
--> statement-breakpoint
CREATE TRIGGER "user_delete_avatar_file_with_user"
AFTER DELETE ON "user"
FOR EACH ROW WHEN (OLD."avatar_file_id" IS NOT NULL)
EXECUTE FUNCTION "delete_replaced_avatar_file"();
