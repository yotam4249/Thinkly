import "dotenv/config";

function parseBbox(envVal?: string): [number, number, number, number] {
  const def = "31.9,34.75,32.2,34.99";
  const parts = (envVal ?? def).split(",").map((v) => Number(v.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error("Invalid OSM_BBOX. Expected: south,west,north,east");
  }
  return parts as [number, number, number, number];
}

export const CONFIG = {
  MONGO_URL: process.env.MONGO_URL || "mongodb://localhost:27017/adwise",
  OSM_BBOX: parseBbox(process.env.OSM_BBOX),
  NUM_USERS: Number(process.env.NUM_USERS ?? 5000),
  MAX_PLACES: Number(process.env.MAX_PLACES ?? 2000),
  AVG_VISITS_PER_USER: Number(process.env.AVG_VISITS_PER_USER ?? 40),
  DAYS_BACK: Number(process.env.DAYS_BACK ?? 30),
  OVERPASS: "https://overpass-api.de/api/interpreter",
};
