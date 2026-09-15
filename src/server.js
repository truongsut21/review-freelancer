import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDatabase } from "./config/database.js";
import adminRoutes from "./routes/admin.routes.js";
import guestRoutes from "./routes/guest.routes.js";
import rsvpRoutes from "./routes/rsvp.routes.js";
import { getEmailConfigStatus } from "./services/email.service.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const databaseConnected = await connectDatabase();

app.locals.databaseConnected = databaseConnected;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  const emailConfig = getEmailConfigStatus();

  res.json({
    ok: true,
    database: req.app.locals.databaseConnected ? "mongodb" : "memory",
    email: emailConfig.configured ? "configured" : "disabled",
    emailMissing: emailConfig.configured ? [] : emailConfig.missing
  });
});

app.get("/api/ip", async (req, res) => {
  const response = await fetch("https://api.ipify.org?format=json");
  res.json(await response.json());
});

app.use("/api/guests", guestRoutes);
app.use("/api/rsvp", rsvpRoutes);
app.use("/api/admin", adminRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Internal server error"
  });
});

app.listen(port, () => {
  console.log(`Wedding backend listening on http://localhost:${port}`);
});
