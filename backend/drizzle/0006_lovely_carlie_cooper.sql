CREATE TYPE "public"."mess_issue_category" AS ENUM('FOOD', 'SERVICE', 'HYGIENE', 'INFRASTRUCTURE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."mess_issue_status" AS ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "mess_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"issue_title" varchar(255) NOT NULL,
	"issue_description" text NOT NULL,
	"status" "mess_issue_status" DEFAULT 'OPEN',
	"admin_response" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "mess_issues" ADD CONSTRAINT "mess_issues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;