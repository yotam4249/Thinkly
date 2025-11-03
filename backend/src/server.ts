import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { apiRouter } from "./routes/api";
import cookieParser from "cookie-parser";

export async function connectMongo(uri: string, dbName: string) {
    // Attach listeners before connecting
    const conn = mongoose.connection;
  
    conn.on("connected", () => {
      // host/name available after connect
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
  
    if(!conn.db){
        return;
    }
    await conn.db.admin().command({ ping: 1 });
    console.log("Mongo ping OK");
  }

export async function disconnectMongo(){
    mongoose.disconnect();
}

export function createApp() : Express{
    const app = express();
    const isProd = process.env.NODE_ENV === "production";

    app.set("trust proxy",true);
    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true }));

    const fromEnv = (process.env.FRONTEND_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
    const devOrigins = ["http://localhost:3000", "http://localhost:5173"];
    const allowedOrigins = fromEnv.length ? fromEnv : (isProd ? [] : devOrigins);

    app.use(
        cors({
          origin(origin, cb) {
            if (!origin) return cb(null, true); // curl/server-to-server/SSR
            return allowedOrigins.includes(origin)
              ? cb(null, true)
              : cb(new Error(`CORS blocked: ${origin}`));
          },
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization"],
        })
    );
    app.use(cookieParser())

    app.use("/api", apiRouter);

    if (!isProd) {
        app.use((req, _res, next) => {
          console.log(`[${req.method}] ${req.originalUrl}`);
          next();
        });
    }
    return app;
}