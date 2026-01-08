import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const isLocal = process.env.NODE_ENV === "local";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);
