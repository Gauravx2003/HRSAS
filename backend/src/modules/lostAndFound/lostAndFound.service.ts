import { db } from "../../db";
import {
  lostAndFoundItems,
  lostFoundAttachments,
  users,
} from "../../db/schema";
import { createNotification } from "../notifications/notifications.service";
import { eq, and } from "drizzle-orm";

export const createLostAndFoundItem = async (
  userId: string,
  userRole: "ADMIN" | "RESIDENT",
  data: {
    title: string;
    description: string;
    foundDate?: Date;
    foundLocation?: string;
    lostDate?: Date;
    lostLocation?: string;
    reportedByEmail?: string | null; // null means admin is the reporter
  },
) => {
  try {
    let reporterId = userId; // Default to admin
    let type: "LOST" | "FOUND";

    // If email is provided, find the user
    if (userRole == "ADMIN") {
      type = "FOUND";
      if (data.reportedByEmail) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, data.reportedByEmail))
          .limit(1);

        if (!user) {
          throw new Error("User with this email not found");
        }
        reporterId = user.id;
      }
    } else {
      type = "LOST";
    }

    const [record] = await db
      .insert(lostAndFoundItems)
      .values({
        title: data.title,
        description: data.description,
        type,
        reportedBy: reporterId,
        foundDate: type === "FOUND" ? data.foundDate : null,
        foundLocation: type === "FOUND" ? data.foundLocation : null,
        lostDate: type === "LOST" ? data.lostDate : null,
        lostLocation: type === "LOST" ? data.lostLocation : null,
        status: "OPEN",
      })
      .returning();

    return record;
  } catch (err) {
    console.error("DB insert failed:", err);
    throw err;
  }
};

export const updateLostItem = async (
  itemId: string,
  foundDate: Date,
  foundLocation: string,
) => {
  const [item] = await db
    .select()
    .from(lostAndFoundItems)
    .where(eq(lostAndFoundItems.id, itemId));

  if (!item) {
    throw new Error("Item not found");
  }

  if (item.type == "FOUND") {
    throw new Error("Item is already marked as found");
  }

  const [record] = await db
    .update(lostAndFoundItems)
    .set({
      foundDate,
      foundLocation,
      type: "FOUND",
    })
    .where(eq(lostAndFoundItems.id, itemId))
    .returning();
  return record;
};

export const openClaimedItem = async (itemId: string) => {
  const [item] = await db
    .select()
    .from(lostAndFoundItems)
    .where(eq(lostAndFoundItems.id, itemId));

  if (!item) {
    throw new Error("Item not found");
  }

  if (item.status !== "CLAIMED") {
    throw new Error("Item is not claimed");
  }

  const [record] = await db
    .update(lostAndFoundItems)
    .set({
      status: "OPEN",
    })
    .where(eq(lostAndFoundItems.id, itemId))
    .returning();

  return record;
};

export const closeLostAndFoundItem = async (itemId: string) => {
  try {
    const [record] = await db
      .update(lostAndFoundItems)
      .set({ status: "CLOSED" })
      .where(eq(lostAndFoundItems.id, itemId))
      .returning();

    return record;
  } catch (err) {
    console.error("DB update failed:", err);
    throw err;
  }
};

export const claimLostAndFoundItem = async (
  itemId: string,
  claimerId: string,
) => {
  // 1. START THE TRANSACTION
  return await db.transaction(async (tx) => {
    // 2. USE 'tx' FOR DATABASE READS
    const [item] = await tx
      .select()
      .from(lostAndFoundItems)
      .where(eq(lostAndFoundItems.id, itemId));

    if (!item) {
      throw new Error("Item not found");
    }

    if (item.status !== "OPEN") {
      throw new Error("Item is not open");
    }

    if (item.type == "LOST") {
      throw new Error("Item is lost"); // You can't claim something someone lost, only what was found
    }

    const [admin] = await tx // USE 'tx' HERE TOO
      .select()
      .from(users)
      .where(eq(users.role, "ADMIN"));

    // 3. PASS 'tx' TO NOTIFICATION
    if (admin) {
      await createNotification(
        tx, // <--- Now this works because 'tx' is defined above
        admin.id,
        "Item claimed and requires verification",
      );
    }

    const [record] = await tx // USE 'tx' FOR THE UPDATE
      .update(lostAndFoundItems)
      .set({
        status: "CLAIMED",
        claimedBy: claimerId,
        claimedAt: new Date(),
      })
      .where(eq(lostAndFoundItems.id, itemId))
      .returning();

    return record;
  });
};

export const getMyLostItem = async (userId: string) => {
  const { lostFoundAttachments } = await import("../../db/schema");

  const myLostItems = await db
    .select()
    .from(lostAndFoundItems)
    .where(eq(lostAndFoundItems.reportedBy, userId));

  //Fetch Attachments for each lost item
  const lostItemWithAttachments = await Promise.all(
    myLostItems.map(async (item) => {
      const attachments = await db
        .select({
          id: lostFoundAttachments.id,
          fileURL: lostFoundAttachments.fileUrl,
        })
        .from(lostFoundAttachments)
        .where(eq(lostFoundAttachments.itemId, item.id));

      return {
        ...item,
        attachments,
      };
    }),
  );

  return lostItemWithAttachments;
};

export const getAllFoundItem = async () => {
  try {
    const foundItems = await db
      .select()
      .from(lostAndFoundItems)
      .where(eq(lostAndFoundItems.type, "FOUND"));
    return foundItems;
  } catch (error) {
    console.error("DB select failed:", error);
    throw error;
  }
};

export const getAllClaimedItems = async () => {
  const claimedItems = await db
    .select()
    .from(lostAndFoundItems)
    .where(eq(lostAndFoundItems.status, "CLAIMED"));

  return claimedItems;
};

export const getAllLostAndFoundItems = async () => {
  try {
    const { alias } = await import("drizzle-orm/pg-core");
    const reporter = alias(users, "reporter");
    const claimer = alias(users, "claimer");

    const items = await db
      .select({
        id: lostAndFoundItems.id,
        title: lostAndFoundItems.title,
        description: lostAndFoundItems.description,
        type: lostAndFoundItems.type,
        status: lostAndFoundItems.status,
        lostDate: lostAndFoundItems.lostDate,
        lostLocation: lostAndFoundItems.lostLocation,
        foundDate: lostAndFoundItems.foundDate,
        foundLocation: lostAndFoundItems.foundLocation,
        createdAt: lostAndFoundItems.createdAt,
        reportedByName: reporter.name,
        claimedByName: claimer.name,
      })
      .from(lostAndFoundItems)
      .leftJoin(reporter, eq(lostAndFoundItems.reportedBy, reporter.id))
      .leftJoin(claimer, eq(lostAndFoundItems.claimedBy, claimer.id));

    return items;
  } catch (error) {
    console.error("DB select failed:", error);
    throw error;
  }
};

// export const lostAndFoundItems = pgTable("lost_and_found_items", {
//   id: uuid("id").defaultRandom().primaryKey(),

//   title: varchar("title", { length: 255 }).notNull(),
//   description: text("description").notNull(),

//   type: lostAndFoundTypeEnum("type").notNull(),

//   reportedBy: uuid("reported_by")
//     .references(() => users.id)
//     .notNull(),

//   lostDate: timestamp("lost_date"),
//   lostLocation: varchar("lost_location", { length: 255 }),

//   foundDate: timestamp("found_date"),
//   foundLocation: varchar("found_location", { length: 255 }),

//   status: lostAndFoundStatusEnum("status").default("OPEN"),

//   createdAt: timestamp("created_at").defaultNow(),
// });
