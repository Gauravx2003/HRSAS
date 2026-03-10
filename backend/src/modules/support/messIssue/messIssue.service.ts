import { db } from "../../../db";
import {
  messIssues,
  residentProfiles,
  rooms,
  users,
  blocks,
  messContractors,
} from "../../../db/schema";
import { desc, eq, getTableColumns, sql, count, gte, and } from "drizzle-orm";

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
  let query = db
    .select({
      ...getTableColumns(messIssues),
      residentName: users.name,
      roomNumber: rooms.roomNumber,
      block: blocks.name,
      phone: users.phone,
    })
    .from(messIssues)
    .leftJoin(users, eq(messIssues.userId, users.id))
    .leftJoin(residentProfiles, eq(users.id, residentProfiles.userId))
    .leftJoin(rooms, eq(residentProfiles.roomId, rooms.id))
    .leftJoin(blocks, eq(rooms.blockId, blocks.id));

  if (status && status !== "ALL") {
    query.where(
      eq(
        messIssues.status,
        status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED",
      ),
    );
  }

  const issues = await query.orderBy(desc(messIssues.createdAt));

  const { messIssueAttachments } = await import("../../../db/schema");

  const issuesWithAttachments = await Promise.all(
    issues.map(async (issue) => {
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

export const getMyIssues = async (id: string) => {
  const { messIssueAttachments } = await import("../../../db/schema");

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

// ─── Analytics ───
export const getMessIssueAnalytics = async () => {
  // 1. Status counts
  const statusCounts = await db
    .select({
      status: messIssues.status,
      count: count(),
    })
    .from(messIssues)
    .groupBy(messIssues.status);

  // 2. Category distribution
  const categoryDist = await db
    .select({
      category: messIssues.category,
      count: count(),
    })
    .from(messIssues)
    .groupBy(messIssues.category);

  // 3. Daily trend data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyReported = await db
    .select({
      date: sql<string>`DATE(${messIssues.createdAt})`.as("date"),
      count: count(),
    })
    .from(messIssues)
    .where(gte(messIssues.createdAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${messIssues.createdAt})`)
    .orderBy(sql`DATE(${messIssues.createdAt})`);

  const dailyResolved = await db
    .select({
      date: sql<string>`DATE(${messIssues.resolvedAt})`.as("date"),
      count: count(),
    })
    .from(messIssues)
    .where(gte(messIssues.resolvedAt, thirtyDaysAgo))
    .groupBy(sql`DATE(${messIssues.resolvedAt})`)
    .orderBy(sql`DATE(${messIssues.resolvedAt})`);

  return {
    statusCounts: statusCounts.map((s) => ({
      status: s.status,
      count: Number(s.count),
    })),
    categoryDistribution: categoryDist.map((c) => ({
      category: c.category,
      count: Number(c.count),
    })),
    dailyTrend: {
      reported: dailyReported.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      resolved: dailyResolved.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    },
  };
};

// ─── Contractor Management ───
export const getActiveContractor = async (hostelId: string) => {
  const [activeContractor] = await db
    .select()
    .from(messContractors)
    .where(
      and(
        eq(messContractors.hostelId, hostelId),
        eq(messContractors.isActive, true),
      ),
    );

  if (!activeContractor) {
    return null; // Return null if there's no active contractor
  }

  // Calculate complaints count since contract start
  const [{ value: foodIssuesCount }] = await db
    .select({ value: count() })
    .from(messIssues)
    .leftJoin(users, eq(messIssues.userId, users.id))
    .where(
      and(
        eq(users.hostelId, hostelId),
        eq(messIssues.category, "FOOD"),
        gte(messIssues.createdAt, new Date(activeContractor.contractStartDate)),
      ),
    );

  const numIssues = Number(foodIssuesCount);

  // Approval rating formula
  const approvalRating = Math.max(0, 100 - numIssues * 5);

  let healthStatus: "Green" | "Yellow" | "Red" = "Green";
  let warningMessage: string | null = null;

  if (numIssues >= 10) {
    healthStatus = "Red";
    warningMessage =
      "Residents are not happy with mess food. High volume of food-related complaints recorded.";
  } else if (numIssues >= 4) {
    healthStatus = "Yellow";
  }

  return {
    contractor: activeContractor,
    approvalRating,
    healthStatus,
    warningMessage,
    foodIssuesCount: numIssues,
  };
};

export const terminateAndAddContractor = async ({
  hostelId,
  terminationReason,
  newContractorData,
}: {
  hostelId: string;
  terminationReason: string;
  newContractorData: {
    name: string;
    organizationName?: string;
    phone: string;
    email?: string;
    address: string;
    fssaiLicenseNumber?: string;
    contractStartDate: Date; // e.g. new Date()
  };
}) => {
  return await db.transaction(async (trx) => {
    // 1. Terminate current active contractor if exists
    const [currentActive] = await trx
      .select()
      .from(messContractors)
      .where(
        and(
          eq(messContractors.hostelId, hostelId),
          eq(messContractors.isActive, true),
        ),
      );

    if (currentActive) {
      await trx
        .update(messContractors)
        .set({
          isActive: false,
          contractEndDate: new Date().toISOString() as any, // Drizzle `date` stores string YYYY-MM-DD usually, so we let Drizzle handle or just new Date() based on db type. Wait, the DB type is `date()`. We'll pass ISO string.
          terminationReason,
        })
        .where(eq(messContractors.id, currentActive.id));
    }

    // 2. Insert new contractor
    const [newContractor] = await trx
      .insert(messContractors)
      .values({
        hostelId,
        isActive: true,
        contractStartDate:
          newContractorData.contractStartDate.toISOString() as any, // Cast to any to bypass potential strict pg-core types for 'date'
        name: newContractorData.name,
        organizationName: newContractorData.organizationName,
        phone: newContractorData.phone,
        email: newContractorData.email,
        address: newContractorData.address,
        fssaiLicenseNumber: newContractorData.fssaiLicenseNumber,
      })
      .returning();

    return newContractor;
  });
};
