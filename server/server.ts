import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectMongoose } from "./config/database";
import { requestQueue } from "./middleware/requestQueue";

// Import routes
import authRoutes from "./routes/authRoutes";
import examRoutes from "./routes/examRoutes";
import tableRoutes from "./routes/tableRoutes";

import studentRoutes from "./routes/studentRoutes";
import codeRoutes from "./routes/codeRoutes";

// --------------------
// Environment Variables
// --------------------
const PORT = Number(process.env.PORT);
if (!process.env.MONGO_URI) {
  throw new Error("Missing MONGO_URI environment variable");
}

// --------------------
// Express app setup
// --------------------
const app = express();

// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use(requestQueue);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/exam", examRoutes);
app.use("api/get", tableRoutes)

app.use("/api/students", studentRoutes);
app.use("/api/code", codeRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running!" });
});

// Error handling
app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
const startServer = async () => {
  try {
    await connectMongoose();
    app.listen(PORT, () => {
      console.log(`🌍 Server is live at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;