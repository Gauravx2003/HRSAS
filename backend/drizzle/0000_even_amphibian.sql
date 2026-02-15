CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."book_format" AS ENUM('PHYSICAL', 'EBOOK', 'AUDIOBOOK');--> statement-breakpoint
CREATE TYPE "public"."book_status" AS ENUM('AVAILABLE', 'BORROWED', 'LOST', 'MAINTENANCE');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'CLOSED', 'RESOLVED', 'ESCALATED');--> statement-breakpoint
CREATE TYPE "public"."gate_pass_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."gate_pass_type" AS ENUM('ENTRY', 'EXIT', 'OVERNIGHT');--> statement-breakpoint
CREATE TYPE "public"."lost_and_found_status" AS ENUM('OPEN', 'CLAIMED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."lost_and_found_type" AS ENUM('LOST', 'FOUND');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');--> statement-breakpoint
CREATE TYPE "public"."mess_attendance_status" AS ENUM('OPTED_IN', 'SCANNED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."mess_issue_category" AS ENUM('FOOD', 'SERVICE', 'HYGIENE', 'INFRASTRUCTURE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."mess_issue_status" AS ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."payment_category" AS ENUM('HOSTEL_FEE', 'FINE', 'MESS_FEE', 'SECURITY_DEPOSIT', 'LIBRARY_MEMBERSHIP', 'LIBRARY_FINE', 'GYM_MEMBERSHIP');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'WAIVED');--> statement-breakpoint
CREATE TYPE "public"."plan_duration" AS ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."priority_type" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('RESIDENT', 'STAFF', 'ADMIN', 'SECURITY');--> statement-breakpoint
CREATE TYPE "public"."sos_status" AS ENUM('ACTIVE', 'RESOLVED', 'FALSE_ALARM');--> statement-breakpoint
CREATE TYPE "public"."staff_type" AS ENUM('IN_HOUSE', 'VENDOR');--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"hostel_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaint_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_url" text NOT NULL,
	"public_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "complaint_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"sla_hours" integer NOT NULL,
	"vendor_only" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "complaint_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"old_status" "complaint_status",
	"new_status" "complaint_status",
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"assigned_staff" uuid,
	"status" "complaint_status" DEFAULT 'CREATED',
	"priority" "priority_type" DEFAULT 'LOW',
	"title" varchar(100),
	"description" text NOT NULL,
	"sla_deadline" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"reason" text NOT NULL,
	"escalated_to" uuid,
	"escalated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "gate_pass_type" NOT NULL,
	"location" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"out_time" timestamp NOT NULL,
	"in_time" timestamp NOT NULL,
	"status" "gate_pass_status" DEFAULT 'PENDING',
	"qr_token" text,
	"approved_by" uuid,
	"actual_out_time" timestamp,
	"actual_in_time" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gym_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE',
	"payment_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gym_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"duration" "plan_duration" NOT NULL,
	"price" integer NOT NULL,
	"description" text,
	"has_trainer" boolean DEFAULT false,
	"access_hours" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hostels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hostel_id" uuid,
	"title" varchar(255) NOT NULL,
	"author" varchar(255) NOT NULL,
	"isbn" varchar(50),
	"cover_url" text,
	"is_digital" boolean DEFAULT false,
	"download_url" text,
	"format" "book_format" DEFAULT 'PHYSICAL',
	"status" "book_status" DEFAULT 'AVAILABLE',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE',
	"payment_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"duration" "plan_duration" NOT NULL,
	"price" integer NOT NULL,
	"max_books_allowed" integer DEFAULT 2,
	"fine_per_day" integer DEFAULT 10,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "library_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"issue_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"return_date" timestamp,
	"status" "book_status" DEFAULT 'BORROWED',
	"fine_amount" integer DEFAULT 0,
	"is_fine_paid" boolean DEFAULT false,
	"fine_payment_id" uuid
);
--> statement-breakpoint
CREATE TABLE "lost_and_found_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" "lost_and_found_type" NOT NULL,
	"reported_by" uuid NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp,
	"lost_date" timestamp,
	"lost_location" varchar(255),
	"found_date" timestamp,
	"found_location" varchar(255),
	"status" "lost_and_found_status" DEFAULT 'OPEN',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lost_found_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_url" text NOT NULL,
	"public_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mess_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"qr_token" text NOT NULL,
	"status" "mess_attendance_status" DEFAULT 'OPTED_IN',
	"scanned_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "mess_attendance_qr_token_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "mess_issue_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_url" text NOT NULL,
	"public_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mess_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"issue_title" varchar(255) NOT NULL,
	"issue_description" text NOT NULL,
	"category" "mess_issue_category" NOT NULL,
	"status" "mess_issue_status" DEFAULT 'OPEN',
	"admin_response" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mess_menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostel_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"items" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"issued_by" uuid,
	"amount" integer NOT NULL,
	"category" "payment_category" NOT NULL,
	"description" text,
	"status" "payment_status" DEFAULT 'PENDING',
	"transaction_id" varchar(255),
	"due_date" timestamp,
	"paid_at" timestamp,
	"razorpay_payment_id" varchar(255),
	"razorpay_order_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "resident_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"room_id" uuid,
	"enrollment_number" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"capacity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_number" varchar(50) NOT NULL,
	"block_id" uuid NOT NULL,
	"type_id" uuid,
	"current_occupancy" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "sos_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" numeric,
	"longitude" numeric,
	"description" text,
	"status" "sos_status" DEFAULT 'ACTIVE',
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"staff_type" "staff_type" NOT NULL,
	"specialization" varchar(50),
	"max_active_tasks" integer DEFAULT 5
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"hostel_id" uuid,
	"name" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visitor_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"purpose" varchar(255) DEFAULT 'General Visit' NOT NULL,
	"visitor_name" varchar(100) NOT NULL,
	"visitor_phone" varchar(15) NOT NULL,
	"relation" varchar(50) DEFAULT 'Brother' NOT NULL,
	"entry_code" varchar(6) NOT NULL,
	"visit_date" timestamp NOT NULL,
	"status" "approval_status" DEFAULT 'PENDING',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_category_id_complaint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."complaint_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_staff_users_id_fk" FOREIGN KEY ("assigned_staff") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalated_to_users_id_fk" FOREIGN KEY ("escalated_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_memberships" ADD CONSTRAINT "gym_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_memberships" ADD CONSTRAINT "gym_memberships_plan_id_gym_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."gym_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_memberships" ADD CONSTRAINT "gym_memberships_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_plans" ADD CONSTRAINT "gym_plans_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_books" ADD CONSTRAINT "library_books_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_books" ADD CONSTRAINT "library_books_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_plan_id_library_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."library_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_plans" ADD CONSTRAINT "library_plans_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_transactions" ADD CONSTRAINT "library_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_transactions" ADD CONSTRAINT "library_transactions_book_id_library_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_transactions" ADD CONSTRAINT "library_transactions_fine_payment_id_payments_id_fk" FOREIGN KEY ("fine_payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_and_found_items" ADD CONSTRAINT "lost_and_found_items_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_and_found_items" ADD CONSTRAINT "lost_and_found_items_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_attachments" ADD CONSTRAINT "lost_found_attachments_item_id_lost_and_found_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."lost_and_found_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_attachments" ADD CONSTRAINT "lost_found_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_attendance" ADD CONSTRAINT "mess_attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_issue_attachments" ADD CONSTRAINT "mess_issue_attachments_issue_id_mess_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."mess_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_issue_attachments" ADD CONSTRAINT "mess_issue_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_issues" ADD CONSTRAINT "mess_issues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mess_menu" ADD CONSTRAINT "mess_menu_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_profiles" ADD CONSTRAINT "resident_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_profiles" ADD CONSTRAINT "resident_profiles_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_block_id_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."blocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_type_id_room_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_requests" ADD CONSTRAINT "visitor_requests_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;