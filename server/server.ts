import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { connectMongoose, isDbConnected, disconnectMongoose } from "./config/database";
import { closeBlocklist } from "./utils/tokenBlocklist";
import { requestQueue, heavyQueue } from "./middleware/requestQueue";

import authRoutes          from "./routes/authRoutes";
import examRoutes          from "./routes/examRoutes";
import tableRoutes         from "./routes/tableRoutes";
import codeRoutes          from "./routes/codeRoutes";
import codeExecutionRoutes from "./routes/codeExecutionRoutes";

// --------------------
// Env validation
// --------------------
const PORT     = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

const missing = ["MONGO_URI", "JWT_SECRET"].filter(k => !process.env[k]);
if (missing.length) throw new Error(`Missing required env vars: ${missing.join(", ")}`);

// Warn if weak JWT secret is used in production
if (NODE_ENV === "production" && process.env.JWT_SECRET!.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

// --------------------
// App
// --------------------
const app = express();

// Security headers via helmet
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow Monaco editor CDN assets
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
    },
  },
}));

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

// Request logging
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "x-exam-id"],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body parsing — keep limits tight
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

// Trust proxy — required when behind Nginx so rate limiters see real IPs
app.set("trust proxy", 1);

// --------------------
// Health check (no auth, no queue)
// --------------------
app.get("/api/health", (_req: Request, res: Response) => {
  const healthy = isDbConnected();
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status:  healthy ? "ok" : "degraded",
    db:      healthy ? "connected" : "disconnected",
    uptime:  Math.floor(process.uptime()),
    env:     NODE_ENV,
    ts:      new Date().toISOString(),
  });
});

// --------------------
// API routes
// --------------------
app.use("/api/auth",    requestQueue, authRoutes);
app.use("/api/exam",    requestQueue, examRoutes);
app.use("/api/table",   requestQueue, tableRoutes);
app.use("/api/code",    requestQueue, codeRoutes);
app.use("/api/execute", heavyQueue,   codeExecutionRoutes);

// --------------------
// 404
// --------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `${req.method} ${req.path} not found`,
  });
});

// --------------------
// Global error handler
// --------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode || err.status || 500;

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(err.errors).map((e: any) => e.message),
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired" });
  }

  const message = NODE_ENV === "production" && status === 500
    ? "Internal server error"
    : err.message || "Internal server error";

  res.status(status).json({ success: false, message });
});

// --------------------
// Start
// --------------------
export const startServer = async (): Promise<void> => {
  await connectMongoose();

  const server = app.listen(PORT, () => {
    console.log(`[server] running on port ${PORT} (${NODE_ENV})`);
  });

  // Graceful shutdown — wait for in-flight requests
  const shutdown = async (signal: string) => {
    console.log(`[server] ${signal} received, shutting down…`);
    server.close(async () => {
      try {
        await disconnectMongoose();
        await closeBlocklist();
        console.log("[server] shutdown complete");
        process.exit(0);
      } catch {
        process.exit(1);
      }
    });

    // Force exit after 15 s if requests don't drain
    setTimeout(() => {
      console.error("[server] forced shutdown after timeout");
      process.exit(1);
    }, 15_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
};

if (require.main === module) startServer().catch(err => {
  console.error("[server] startup failed:", err);
  process.exit(1);
});

export default app;
