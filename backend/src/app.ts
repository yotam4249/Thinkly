import dotenv from "dotenv"
import { connectMongo, createApp, disconnectMongo } from "./server";
dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI;


async function start() {
    try {
      if (!MONGO_URI) {
        console.error("Missing MONGO_URI in .env");
            process.exit(1);
      }
      await connectMongo(MONGO_URI, process.env.MONGO_DBNAME || "adwise");
      const app = createApp();
  
      const server = app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
      });
  
      // Graceful shutdown
      const bye = (sig: string) => {
        console.log(`${sig} received, shutting down...`);
        server.close(async () => {
          try {
            await disconnectMongo();
            console.log("MongoDB disconnected");
          } finally {
            process.exit(0);
          }
        });
        // hard-exit guard
        setTimeout(() => process.exit(1), 10_000).unref();
      };
  
      process.on("SIGINT", () => bye("SIGINT"));
      process.on("SIGTERM", () => bye("SIGTERM"));
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  }
  
  start();