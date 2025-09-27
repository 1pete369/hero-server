// index.js
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import taskRoutes from "./routes/task.route.js";
import habitRoutes from "./routes/habit.route.js";
import goalRoutes from "./routes/goal.route.js";
import uploadRoutes from "./routes/upload.route.js";
import financeRoutes from "./routes/finance.route.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

// Very permissive CORS shim for local dev convenience
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  next();
});
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "Content-Type, Authorization, X-Requested-With, Accept"
    );
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/", (_req, res) => res.status(200).send("Auth API running"));
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
app.get("/api/healthz", (_req, res) => res.status(200).send("OK"));

app.use("/api/auth", authRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/goal", goalRoutes);
app.use("/api/habit", habitRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/finance", financeRoutes);

// 404
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
  }
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

// Error handler
app.use((err, req, res, _next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.name || "Error", message: err.message });
});

export default app;


