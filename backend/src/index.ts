import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "local" ? ".env.local" : ".env.production",
});

const app = express();

app.use(cors());
app.use(express.json());

import { db } from "./db";

app.get("/db-test", async (_req, res) => {
  const result = await db.execute("SELECT 1");
  res.json({ db: "connected", result });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
