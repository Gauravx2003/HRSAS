import { db } from "../src/db";
import { libraryBooks } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const books = await db.execute(sql`SELECT * FROM library_books LIMIT 1`);
    console.log("Raw SQL Books count:", books.rowCount);

    // Now trying Drizzle
    const dbooks = await db.select().from(libraryBooks).limit(1);
    console.log("Drizzle Books:", dbooks);
  } catch (err: any) {
    console.log("================ ERROR CAUGHT ================");
    console.log(err.message);
    console.log(err.code);
    console.log(err.stack);
  }
  process.exit(0);
}

run();
