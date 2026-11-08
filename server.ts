import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDb } from "./backend/src/db/database";
import { initCronJobs } from "./backend/src/cron/cronManager";
import adminRoutes from "./backend/src/admin/adminRoutes";
import fileRoutes from "./backend/src/admin/fileRoutes";
import appRoutes from "./backend/src/api/appRoutes";
import marketplaceRoutes from "./backend/src/api/marketplace/marketplaceRoutes";
import aiRoutes from "./backend/src/api/aiRoutes";
import voiceAiRouter from "./backend/src/api/voiceAiRoutes";
import sqliteDataRoutes from "./backend/src/api/sqliteDataRoutes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
  app.use(express.text({ limit: "100mb" }));
  app.use(express.raw({ limit: "100mb" }));

  try {
    // 1. Initialize BD ProTalk PostgreSQL Database
    await getDb();
    console.log("[BD ProTalk] PostgreSQL database initialized successfully.");

    // 2. Initialize Cron Registry
    await initCronJobs();
  } catch (err) {
    console.error("[Backend Init Error]", err);
  }

  // 3. Mount Backend API Routes
  app.use(fileRoutes);
  app.use(voiceAiRouter);
  app.use("/api/voice", voiceAiRouter);
  app.use("/api/admin", adminRoutes);
  app.use("/api/marketplace", marketplaceRoutes);
  app.use("/api/v1/marketplace", marketplaceRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/v1/ai", aiRoutes);
  app.use("/api/v1/data", sqliteDataRoutes);
  app.use("/api/v1", sqliteDataRoutes);
  app.use("/api/v1", appRoutes);
  app.use("/api", appRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global Error Handler for JSON / Body parser issues
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413)) {
      console.warn("[BodyParser Warning] Payload too large:", err.message);
      return res.status(413).json({
        success: false,
        error: "Размер отправляемых данных превышает допустимый лимит (100 МБ). Пожалуйста, уменьшите размер файла или данных.",
        code: "PAYLOAD_TOO_LARGE"
      });
    }
    if (err && err.status === 400 && "body" in err) {
      return res.status(400).json({ success: false, error: "Некорректный формат JSON в запросе." });
    }
    next(err);
  });

  // 4. Vite Middleware / Production Static Fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FullStack Express + BD ProTalk] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
