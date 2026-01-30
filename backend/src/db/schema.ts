import { primaryKey } from "drizzle-orm/gel-core";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  numeric,
} from "drizzle-orm/pg-core";

import { MESS_ISSUE_CATEGORIES } from "../../../shared/constants";

export const roleEnum = pgEnum("role", [
  "RESIDENT",
  "STAFF",
  "ADMIN",
  "SECURITY",
]);

export const staffTypeEnum = pgEnum("staff_type", ["IN_HOUSE", "VENDOR"]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLOSED",
  "RESOLVED",
  "ESCALATED",
]);

export const priorityTypeEnum = pgEnum("priority_type", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const lostAndFoundStatusEnum = pgEnum("lost_and_found_status", [
  "OPEN",
  "CLAIMED",
  "CLOSED",
]);

export const lostAndFoundTypeEnum = pgEnum("lost_and_found_type", [
  "LOST",
  "FOUND",
]);

export const gatePassTypeEnum = pgEnum("gate_pass_type", [
  "ENTRY",
  "EXIT",
  "OVERNIGHT",
]);

export const messIssueCategoryEnum = pgEnum(
  "mess_issue_category",
  MESS_ISSUE_CATEGORIES,
);

export const messIssueStatusEnum = pgEnum("mess_issue_status", [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED",
]);

//Tables

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hostels = pgTable("hostels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blocks = pgTable("blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  hostelId: uuid("hostel_id")
    .references(() => hostels.id)
    .notNull(),
});

export const room_types = pgTable("room_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),

  price: integer("price").notNull(),
  capacity: integer("capacity").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  blockId: uuid("block_id")
    .references(() => blocks.id)
    .notNull(),
  type: uuid("type_id").references(() => room_types.id),
  currentOccupancy: integer("current_occupancy").default(0),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  hostelId: uuid("hostel_id").references(() => hostels.id),

  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const residentProfiles = pgTable("resident_profiles", {
  userId: uuid("user_id")
    .references(() => users.id)
    .primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id),
  enrollmentNumber: varchar("enrollment_number", { length: 50 }),
});

export const staffProfiles = pgTable("staff_profiles", {
  userId: uuid("user_id")
    .references(() => users.id)
    .primaryKey(),
  staffType: staffTypeEnum("staff_type").notNull(),
  specialization: varchar("specialization", { length: 50 }),
  maxActiveTasks: integer("max_active_tasks").default(5),
});

export const complaintCategories = pgTable("complaint_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  slaHours: integer("sla_hours").notNull(),
  vendorOnly: boolean("vendor_only").default(false),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").defaultRandom().primaryKey(),
  residentId: uuid("resident_id")
    .references(() => users.id)
    .notNull(),
  roomId: uuid("room_id")
    .references(() => rooms.id)
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => complaintCategories.id)
    .notNull(),
  assignedStaff: uuid("assigned_staff").references(() => users.id),
  status: complaintStatusEnum("status").default("CREATED"),
  priority: priorityTypeEnum("priority").default("LOW"),
  title: varchar("title", { length: 100 }),
  description: text("description").notNull(),
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const complaintAttachments = pgTable("complaint_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  complaintId: uuid("complaint_id")
    .references(() => complaints.id, { onDelete: "cascade" })
    .notNull(),
  uploadedBy: uuid("uploaded_by")
    .references(() => users.id)
    .notNull(),
  fileURL: text("file_url").notNull(), //Cloudinary secure Url
  publicId: text("public_id").notNull(), //Cloudinary Public ID

  createdAt: timestamp("created_at").defaultNow(),
});

export const complaintStatusHistory = pgTable("complaint_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  complaintId: uuid("complaint_id")
    .references(() => complaints.id)
    .notNull(),
  oldStatus: complaintStatusEnum("old_status"),
  newStatus: complaintStatusEnum("new_status"),
  changedBy: uuid("changed_by")
    .references(() => users.id)
    .notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const lateEntryRequests = pgTable("late_entry_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  residentId: uuid("resident_id")
    .references(() => users.id)
    .notNull(),
  reason: text("reason").notNull(),
  type: gatePassTypeEnum("type").notNull(),
  fromTime: timestamp("from_time").notNull(),
  toTime: timestamp("to_time").notNull(),
  status: approvalStatusEnum("status").default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitorRequests = pgTable("visitor_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  residentId: uuid("resident_id")
    .references(() => users.id)
    .notNull(),

  // New Fields for Authenticity
  visitorName: varchar("visitor_name", { length: 100 }).notNull(),
  visitorPhone: varchar("visitor_phone", { length: 15 }).notNull(),
  entryCode: varchar("entry_code", { length: 6 }).notNull(), // 6-digit Security Code

  visitDate: timestamp("visit_date").notNull(),
  status: approvalStatusEnum("status").default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const escalations = pgTable("escalations", {
  id: uuid("id").defaultRandom().primaryKey(),
  complaintId: uuid("complaint_id")
    .references(() => complaints.id, { onDelete: "cascade" })
    .notNull(),
  level: integer("level").notNull(),
  reason: text("reason").notNull(),
  escalatedTo: uuid("escalated_to").references(() => users.id),
  escalatedAt: timestamp("escalated_at").defaultNow().notNull(),
});

export const notices = pgTable("notices", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const lostAndFoundItems = pgTable("lost_and_found_items", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),

  type: lostAndFoundTypeEnum("type").notNull(),

  reportedBy: uuid("reported_by")
    .references(() => users.id)
    .notNull(),

  claimedBy: uuid("claimed_by").references(() => users.id),
  claimedAt: timestamp("claimed_at"),

  lostDate: timestamp("lost_date"),
  lostLocation: varchar("lost_location", { length: 255 }),

  foundDate: timestamp("found_date"),
  foundLocation: varchar("found_location", { length: 255 }),

  status: lostAndFoundStatusEnum("status").default("OPEN"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const lostFoundAttachments = pgTable("lost_found_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),

  itemId: uuid("item_id")
    .references(() => lostAndFoundItems.id, { onDelete: "cascade" })
    .notNull(),

  uploadedBy: uuid("uploaded_by")
    .references(() => users.id)
    .notNull(),

  fileUrl: text("file_url").notNull(), // Cloudinary secure_url
  publicId: text("public_id").notNull(), // Cloudinary public_id

  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  message: text("message").notNull(),

  isRead: boolean("is_read").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messIssues = pgTable("mess_issues", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  issueTitle: varchar("issue_title", { length: 255 }).notNull(),
  issueDescription: text("issue_description").notNull(),
  category: messIssueCategoryEnum("category").notNull(),

  status: messIssueStatusEnum("status").default("OPEN"),
  adminResponse: text("admin_response"),
  resolvedAt: timestamp("resolved_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const messIssueAttachments = pgTable("mess_issue_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  issueId: uuid("issue_id")
    .references(() => messIssues.id, { onDelete: "cascade" })
    .notNull(),
  uploadedBy: uuid("uploaded_by")
    .references(() => users.id)
    .notNull(),
  fileURL: text("file_url").notNull(), //Cloudinary secure Url
  publicId: text("public_id").notNull(), //Cloudinary Public ID

  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentCategoryEnum = pgEnum("payment_category", [
  "HOSTEL_FEE",
  "FINE",
  "MESS_FEE",
  "SECURITY_DEPOSIT",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING", // Fine issued, not paid
  "COMPLETED", // Paid
  "FAILED", // Transaction failed
  "WAIVED", // Admin forgave the fine
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  residentId: uuid("resident_id")
    .references(() => users.id)
    .notNull(),

  issuedBy: uuid("issued_by").references(() => users.id),

  amount: integer("amount").notNull(),
  category: paymentCategoryEnum("category").notNull(),

  description: text("description"),
  status: paymentStatusEnum("status").default("PENDING"),

  //tracking
  transactionId: varchar("transaction_id", { length: 255 }),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),

  // Razorpay fields
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});
