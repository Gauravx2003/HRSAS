import { db } from "../../db";
import {
  lostAndFoundItems,
  lostFoundAttachments,
  users,
} from "../../db/schema";
import { createNotification } from "../notifications/notifications.service";
import { eq, and } from "drizzle-orm";

export const createLostAndFoundItem = async (
  title: string,
  description: string,
  type: "LOST" | "FOUND",
  reportedBy: string,
  lostDate?: Date,
  lostLocation?: string,
  foundDate?: Date,
  foundLocation?: string
) => {
  try {
    const [record] = await db
      .insert(lostAndFoundItems)
      .values({
        title,
        description,
        type,
        reportedBy,
        lostDate,
        lostLocation,
        foundDate,
        foundLocation,
        status: "OPEN",
      })
      .returning();

    return record;
  } catch (err) {
    console.error("DB insert failed:", err);
    throw err;
  }
};

export const updateLostAndFoundItem = async (
  itemId: string,
  type: "LOST" | "FOUND",
  foundDate?: Date,
  foundLocation?: string,
  status?: "OPEN" | "CLAIMED" | "CLOSED"
) => {
  try {
    const [record] = await db
      .update(lostAndFoundItems)
      .set({ type, foundDate, foundLocation, status })
      .where(
        and(
          eq(lostAndFoundItems.id, itemId),
          eq(lostAndFoundItems.type, "LOST")
        )
      )
      .returning();

    return record;
  } catch (err) {
    console.error("DB update failed:", err);
    throw err;
  }
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
  claimerId: string
) => {
  try {
    const [item] = await db
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
      throw new Error("Item is lost");
    }

    const [admin] = await db
      .select()
      .from(users)
      .where(eq(users.role, "ADMIN"));

    if (admin) {
      await createNotification(
        admin.id,
        "Item claimed and requires verificaition"
      );
    }

    const [record] = await db
      .update(lostAndFoundItems)
      .set({
        status: "CLAIMED",
        claimedBy: claimerId,
        claimedAt: new Date(),
      })
      .where(eq(lostAndFoundItems.id, itemId))
      .returning();

    return record;
  } catch (error) {
    console.error("DB update failed:", error);
    throw error;
  }
};

export const getMyLostItem = async (userId: string) => {
  try {
    const myLostItems = await db
      .select()
      .from(lostAndFoundItems)
      .where(
        and(
          eq(lostAndFoundItems.reportedBy, userId),
          eq(lostAndFoundItems.type, "LOST")
        )
      );
    return myLostItems;
  } catch (error) {
    console.error("DB select failed:", error);
    throw error;
  }
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
