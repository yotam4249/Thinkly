import {
    Db,
    MongoClient,
    Collection,
    Document,
    OptionalUnlessRequiredId,
    AnyBulkWriteOperation,
  } from "mongodb";
  import { EventDoc, PlaceDoc, UserDoc } from "./types.js";
  
  export async function connectMongo(mongoUrl: string) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    return { client, db: client.db() };
  }
  
  export async function clearCollections(db: Db) {
    await db.collection("ml_places").deleteMany({});
    await db.collection("ml_users").deleteMany({});
    await db.collection("ml_events").deleteMany({});
  }
  
  export async function dropCollections(db: Db) {
    // Drop if they exist; ignore errors
    for (const name of ["ml_places", "ml_users", "ml_events"]) {
      try {
        await db.collection(name).drop();
      } catch {}
    }
  }
  
  export async function ensureIndexes(db: Db) {
    await db.collection("ml_places").createIndex({ location: "2dsphere" });
    await db.collection("ml_places").createIndex({ category: 1 });
  
    await db.collection("ml_users").createIndex({ age: 1 });
    await db.collection("ml_users").createIndex({ gender: 1 });
  
    await db.collection("ml_events").createIndex({ userId: 1 });
    await db.collection("ml_events").createIndex({ placeId: 1 });
    await db.collection("ml_events").createIndex({ timestamp: -1 });
    await db.collection("ml_events").createIndex({ adCategory: 1, clicked: 1 });
  }
  

  export async function insertChunked<TSchema extends Document>(
    coll: Collection<TSchema>,
    arr: OptionalUnlessRequiredId<TSchema>[],
    size = 1000
  ) {
    for (let i = 0; i < arr.length; i += size) {
      const slice: OptionalUnlessRequiredId<TSchema>[] = arr.slice(i, i + size);
      if (slice.length) {
        await coll.insertMany(slice, { ordered: false });
      }
    }
  }
  
  
  export async function upsertChunked<TSchema extends { _id: any }>(
    coll: Collection<TSchema>,
    arr: TSchema[],
    size = 1000
  ) {
    for (let i = 0; i < arr.length; i += size) {
      const chunk = arr.slice(i, i + size);
      if (!chunk.length) continue;
  
      const ops: AnyBulkWriteOperation<TSchema>[] = chunk.map((d) => ({
        updateOne: {
          filter: { _id: d._id },
          update: { $set: d },
          upsert: true,
        },
      }));
  
      await coll.bulkWrite(ops, { ordered: false });
    }
  }
  
  export async function quickTotals(db: Db) {
    const u = await db.collection<UserDoc>("ml_users").countDocuments();
    const p = await db.collection<PlaceDoc>("ml_places").countDocuments();
    const e = await db.collection<EventDoc>("ml_events").countDocuments();
    return { users: u, places: p, events: e };
  }
  