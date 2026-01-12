ALTER TABLE "lost_and_found_items" ADD COLUMN "claimed_by" uuid;--> statement-breakpoint
ALTER TABLE "lost_and_found_items" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "lost_and_found_items" ADD CONSTRAINT "lost_and_found_items_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;