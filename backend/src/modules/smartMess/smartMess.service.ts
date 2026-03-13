import { db } from "../../db";
import { messMenu, messAttendance, users } from "../../db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// 1. Fetch Menu for the Day
// 1. Fetch Menu for the Day with Opt-In Status
export const getDailyMenu = async (
  hostelId: string,
  date: Date,
  userId?: string,
) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Get Menu Items
  const menuItems = await db
    .select()
    .from(messMenu)
    .where(
      and(
        eq(messMenu.hostelId, hostelId),
        gte(messMenu.date, startOfDay),
        lte(messMenu.date, endOfDay),
      ),
    );

  if (!userId) return menuItems;

  // 2. Get User Attendance for the day
  const attendance = await db
    .select()
    .from(messAttendance)
    .where(
      and(
        eq(messAttendance.userId, userId),
        gte(messAttendance.date, startOfDay),
        lte(messAttendance.date, endOfDay),
      ),
    );

  // 3. Merge
  return menuItems.map((item) => {
    const record = attendance.find((a) => a.mealType === item.mealType);
    return {
      ...item,
      status: record?.status || null,
      qrToken: record?.qrToken || null,
    };
  });
};

// 2. Create Menu (Admin Side)
export const createDailyMenu = async (data: typeof messMenu.$inferInsert) => {
  const [menu] = await db.insert(messMenu).values(data).returning();
  return menu;
};

// 3. Opt-In Logic (Student)
export const optInForMeal = async (userId: string, menuId: string) => {
  // A. Get the Menu details first to know what we are booking
  const menuEntry = await db.query.messMenu.findFirst({
    where: eq(messMenu.id, menuId),
  });

  if (!menuEntry) throw new Error("Menu item not found");

  // B. Check for existing booking using the Menu's date and mealType
  const startOfDay = new Date(menuEntry.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(menuEntry.date);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await db.query.messAttendance.findFirst({
    where: and(
      eq(messAttendance.userId, userId),
      eq(messAttendance.mealType, menuEntry.mealType),
      gte(messAttendance.date, startOfDay),
      lte(messAttendance.date, endOfDay),
    ),
  });

  if (existing) throw new Error("Already opted in for this meal");

  // C. Generate Token & Save
  const token = `MESS:${uuidv4()}`;

  const [entry] = await db
    .insert(messAttendance)
    .values({
      userId,
      date: menuEntry.date, // Use the date from the menu
      mealType: menuEntry.mealType,
      qrToken: token,
      status: "OPTED_IN",
    })
    .returning();

  return entry;
};

// 4. Scan Logic (Mess Worker)
export const scanMessQr = async (qrToken: string) => {
  const entry = await db.query.messAttendance.findFirst({
    where: eq(messAttendance.qrToken, qrToken),
  });

  if (!entry) throw new Error("Invalid Mess Token");

  if (entry.status === "SCANNED") {
    throw new Error("Meal already claimed! ❌");
  }

  await db
    .update(messAttendance)
    .set({
      status: "SCANNED",
      scannedAt: new Date(),
    })
    .where(eq(messAttendance.id, entry.id));

  return { message: "Meal Served Successfully ✅", meal: entry.mealType };
};

// 5. Opt-Out Logic (Student)
export const optOutForMeal = async (userId: string, menuId: string) => {
  // A. Get Menu details to check cutoff and identify the meal
  const menuEntry = await db.query.messMenu.findFirst({
    where: eq(messMenu.id, menuId),
  });

  if (!menuEntry) throw new Error("Menu item not found");

  // B. Check Cutoff Time
  if (new Date() > menuEntry.cutoffTime) {
    throw new Error(
      `Cancellation closed! Deadline was ${menuEntry.cutoffTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    );
  }

  // C. Find and Delete Attendance Record
  // We need to match by User + Date + MealType (since menuId isn't directly in attendance table)
  const startOfDay = new Date(menuEntry.date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(menuEntry.date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .delete(messAttendance)
    .where(
      and(
        eq(messAttendance.userId, userId),
        eq(messAttendance.mealType, menuEntry.mealType),
        gte(messAttendance.date, startOfDay),
        lte(messAttendance.date, endOfDay),
      ),
    )
    .returning();

  if (result.length === 0) {
    throw new Error("No active booking found to cancel.");
  }

  return { message: "Booking cancelled successfully" };
};

// 6. Wastage Analytics (Admin)
export const getWastageAnalytics = async (hostelId: string) => {
  // A. Get Total Residents count
  const [residentCountData] = await db
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.hostelId, hostelId), eq(users.role, "RESIDENT")));

  const totalResidents = Number(residentCountData?.total || 0);

  // B. Get ONLY PAST Menus (Crucial: prevents future meals from showing 100% waste)
  // Assuming messMenu.date is a Date object or ISO string.
  const today = new Date();

  const menus = await db
    .select()
    .from(messMenu)
    .where(
      and(
        eq(messMenu.hostelId, hostelId),
        lte(messMenu.date, today), // 🚨 Only fetch meals that have already happened!
      ),
    )
    .orderBy(sql`${messMenu.date} DESC`)
    .limit(30);

  // Variables to hold the raw totals for accurate summary math
  let totalPotentialMeals = 0;
  let totalOptedInAllTime = 0;
  let totalScannedAllTime = 0;

  const analytics = await Promise.all(
    menus.map(async (menu) => {
      // Get Attendance stats for this specific meal
      const attendanceStats = await db
        .select({
          status: messAttendance.status,
          count: count(),
        })
        .from(messAttendance)
        .where(
          and(
            eq(messAttendance.date, menu.date),
            eq(messAttendance.mealType, menu.mealType),
          ),
        )
        .groupBy(messAttendance.status);

      // Parse the stats
      let optedInButGhosted = 0;
      let actuallyScanned = 0;

      attendanceStats.forEach((stat) => {
        if (stat.status === "OPTED_IN") optedInButGhosted = Number(stat.count);
        if (stat.status === "SCANNED") actuallyScanned = Number(stat.count);
      });

      // The total amount of food the kitchen prepared for this meal
      const totalPrepared = optedInButGhosted + actuallyScanned;

      // 🚨 Accumulate raw numbers for the accurate Summary calculation
      totalPotentialMeals += totalResidents;
      totalOptedInAllTime += totalPrepared;
      totalScannedAllTime += actuallyScanned;

      // Metric A: App ROI (Food Saved before cooking)
      const mealsSaved = totalResidents - totalPrepared;
      const savedPercent =
        totalResidents > 0 ? (mealsSaved / totalResidents) * 100 : 0;

      // Metric B: Ghost Rate (Food Wasted after cooking)
      const mealsWasted = totalPrepared - actuallyScanned;
      const wastePercent =
        totalPrepared > 0 ? (mealsWasted / totalPrepared) * 100 : 0;

      // Metric C: Kitchen Efficiency
      const efficiencyPercent =
        totalPrepared > 0 ? (actuallyScanned / totalPrepared) * 100 : 0;

      return {
        id: menu.id,
        date: menu.date,
        mealType: menu.mealType,
        items: menu.items,
        totalResidents,
        optedIn: totalPrepared,
        scanned: actuallyScanned,
        mealsSaved: Math.max(0, mealsSaved),
        savedPercent: Math.round(savedPercent),
        mealsWasted: Math.max(0, mealsWasted),
        wastePercent: Math.round(wastePercent),
        efficiencyPercent: Math.round(efficiencyPercent),
      };
    }),
  );

  // 🚨 Calculate the True Averages using the raw sums (The mathematically correct way)
  const totalSavedAllTime = totalPotentialMeals - totalOptedInAllTime;
  const totalWastedAllTime = totalOptedInAllTime - totalScannedAllTime;

  const trueAverageSavings =
    totalPotentialMeals > 0
      ? (totalSavedAllTime / totalPotentialMeals) * 100
      : 0;

  const trueAverageWaste =
    totalOptedInAllTime > 0
      ? (totalWastedAllTime / totalOptedInAllTime) * 100
      : 0;

  const trueAverageEfficiency =
    totalOptedInAllTime > 0
      ? (totalScannedAllTime / totalOptedInAllTime) * 100
      : 0;

  return {
    dailyStats: analytics,
    summary: {
      averageSavings: Math.round(trueAverageSavings),
      averageWaste: Math.round(trueAverageWaste),
      averageEfficiency: Math.round(trueAverageEfficiency),
    },
  };
};
