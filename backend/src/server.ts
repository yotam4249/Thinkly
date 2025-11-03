// src/server.ts
import express, { type Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { apiRouter } from "./routes/api";

export async function connectMongo(uri: string, dbName: string) {
  const conn = mongoose.connection;

  // Attach listeners before connecting
  conn.on("connected", () => {
    // host/name available after connect
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { host, name } = conn;
    console.log(`Mongo connected`);
  });

  conn.on("error", (e) => console.error("[mongo] error:", e));
  conn.on("disconnected", () => console.log("Mongo disconnected"));

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 20,
  } as any);

  if (!conn.db) return;
  await conn.db.admin().command({ ping: 1 });
  console.log("Mongo ping OK");
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

export function createApp(): Express {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  // Needed for secure cookies / proxy headers on Render
  app.set("trust proxy", true);

  // Basic security headers (relaxed CSP to avoid blocking Socket.IO on same origin)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ----- CORS (allow only configured origins; also support local dev) -----
  const fromEnv = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const devOrigins = ["http://localhost:3000", "http://localhost:5173"];
  const allowedOrigins = fromEnv.length ? fromEnv : isProd ? [] : devOrigins;

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // server-to-server / curl
        return allowedOrigins.includes(origin)
          ? cb(null, true)
          : cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true, // send cookies for login/refresh/logout
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      // Add X-CSRF-Token if you introduce CSRF later
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ----- Optional dev logger -----
  if (!isProd) {
    app.use((req, _res, next) => {
      console.log(`[${req.method}] ${req.originalUrl}`);
      next();
    });
  }

  // ----- Health & root (handy for Render checks) -----
  app.get("/", (_req, res) => res.send("OK"));
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // ----- API -----
  app.use("/api", apiRouter);

  return app;
}
