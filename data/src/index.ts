import { CONFIG } from "./config.js";
import { fetchOSMPlaces } from "./osm.js";
import { generateUsers } from "./users.js";
import { simulate } from "./simulate.js";
import {
  clearCollections,
  connectMongo,
  ensureIndexes,
  insertChunked,
  upsertChunked,
  quickTotals,
  dropCollections,
} from "./mongo.js";
import { EventDoc, PlaceDoc, UserDoc } from "./types.js";

const args = process.argv.slice(2);
const APPEND = args.includes("--append");
const FRESH = args.includes("--fresh");

(async () => {
  console.log(`🔗 Mongo: ${CONFIG.MONGO_URL}`);
  const { client, db } = await connectMongo(CONFIG.MONGO_URL);

  if (FRESH) {
    console.log("🧨 Fresh mode: dropping collections...");
    await dropCollections(db);
  } else if (!APPEND) {
    console.log("🗑️  Clearing collections (ml_*)...");
    await clearCollections(db);
  } else {
    console.log("➕ Append mode: keeping existing data");
  }

  console.log("Fetching OSM places...");
  const places = await fetchOSMPlaces();
  console.log(`Places: ${places.length}`);

  console.log("Generating users...");
  const users = generateUsers();
  console.log(`Users: ${users.length}`);

  console.log("Simulating events...");
  const events = simulate(users, places);
  console.log(`Events: ${events.length}`);

  console.log("Inserting...");
  await upsertChunked<PlaceDoc>(db.collection<PlaceDoc>("ml_places"), places, 1000);

  await insertChunked<UserDoc>(db.collection<UserDoc>("ml_users"), users, 1000);
  await insertChunked<EventDoc>(db.collection<EventDoc>("ml_events"), events, 5000);

  console.log("Ensuring indexes...");
  await ensureIndexes(db);

  const totals = await quickTotals(db);
  console.log(`Totals → users: ${totals.users}, places: ${totals.places}, events: ${totals.events}`);
  console.log("Done.");

  await client.close();
})().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
