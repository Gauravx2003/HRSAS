import { db } from "../../db";
import { messIssues, residentProfiles, rooms, users } from "../../db/schema";
import { desc, eq, getTableColumns } from "drizzle-orm";

// export const messIssues = pgTable("mess_issues", {
//   id: uuid("id").defaultRandom().primaryKey(),

//   userId: uuid("user_id")
//     .references(() => users.id)
//     .notNull(),

//   issueTitle: varchar("issue_title", { length: 255 }).notNull(),
//   issueDescription: text("issue_description").notNull(),
//   category: messIssueCategoryEnum("category").notNull(),

//   status: messIssueStatusEnum("status").default("OPEN"),
//   adminResponse: text("admin_response"),
//   resolvedAt: timestamp("resolved_at"),

//   createdAt: timestamp("created_at").defaultNow(),
// });

export const createMessComplaint = async (
  issueTitle: string,
  issueDescription: string,
  userId: string,
  category: "FOOD" | "SERVICE" | "HYGIENE" | "INFRASTRUCTURE" | "OTHER",
) => {
  const [newIssue] = await db
    .insert(messIssues)
    .values({
      issueTitle,
      issueDescription,
      userId,
      category,
      status: "OPEN",
    })
    .returning();
  return newIssue;
};

export const updateMessComplaint = async (
  id: string,
  status: "IN_REVIEW" | "RESOLVED" | "REJECTED",
  adminResponse?: string,
) => {
  const [currentIssue] = await db
    .select()
    .from(messIssues)
    .where(eq(messIssues.id, id));

  if (!currentIssue) {
    throw new Error("Mess issue not found");
  }

  // Status Transition Logic
  if (currentIssue.status === "OPEN" && status === "RESOLVED") {
    throw new Error(
      "Invalid transition: Cannot directly resolve an OPEN issue. Move to IN_REVIEW first.",
    );
  }

  if (status === "RESOLVED" && !adminResponse) {
    throw new Error("Admin response is required to resolve the issue");
  }

  const [updatedIssue] = await db
    .update(messIssues)
    .set({
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      adminResponse,
    })
    .where(eq(messIssues.id, id))
    .returning();

  return updatedIssue;
};

export const getMessIssues = async (status?: string) => {
  if (status && status !== "ALL") {
    const issues = await db
      .select({
        ...getTableColumns(messIssues),
        residentName: users.name,
        roonNumber: rooms.roomNumber,
      })
      .from(messIssues)
      .leftJoin(users, eq(messIssues.userId, users.id))
      .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
      .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
      .where(
        eq(
          messIssues.status,
          status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED",
        ),
      )
      .orderBy(desc(messIssues.createdAt));
    return issues;
  }
  return await db.select().from(messIssues);
};

export const getMyIssues = async (id: string) => {
  const { messIssueAttachments } = await import("../../db/schema");

  const myIssues = await db
    .select()
    .from(messIssues)
    .where(eq(messIssues.userId, id));

  // Fetch attachments for each complaint
  const issuesWithAttachments = await Promise.all(
    myIssues.map(async (issue) => {
      const attachments = await db
        .select({
          id: messIssueAttachments.id,
          fileURL: messIssueAttachments.fileURL,
        })
        .from(messIssueAttachments)
        .where(eq(messIssueAttachments.issueId, issue.id));

      return {
        ...issue,
        attachments,
      };
    }),
  );

  return issuesWithAttachments;
};
