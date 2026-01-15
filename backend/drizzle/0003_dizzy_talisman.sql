CREATE TYPE "public"."gate_pass_type" AS ENUM('ENTRY', 'EXIT');--> statement-breakpoint
ALTER TABLE "notices" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "late_entry_requests" ADD COLUMN "type" "gate_pass_type" NOT NULL;