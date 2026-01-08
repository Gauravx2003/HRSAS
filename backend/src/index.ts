import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "local" ? ".env.local" : ".env.production",
});

import authRoutes from "./modules/auth/auth.routes";
import testRoutes from "./routes/test.routes";
import complaintRoutes from "./modules/complaints/complaints.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/complaints", complaintRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
