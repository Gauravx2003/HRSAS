import { db } from "../../db";
import { notifications } from "../../db/schema";
import { and, desc, eq } from "drizzle-orm";

export const createNotification = async (userId: string, message: string) => {
  await db.insert(notifications).values({ userId, message });
};

export const getMyNotifications = async (userId: string) => {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
) => {
  const [notification] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    )
    .returning();

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};
// export const notifications = pgTable("notifications", {
//   id: uuid("id").defaultRandom().primaryKey(),

//   userId: uuid("user_id")
//     .references(() => users.id, { onDelete: "cascade" })
//     .notNull(),

//   message: text("message").notNull(),

//   isRead: boolean("is_read").default(false).notNull(),

//   createdAt: timestamp("created_at").defaultNow().notNull(),
// });
