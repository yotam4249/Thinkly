import dayjs from "dayjs";
import { faker } from "@faker-js/faker";
import { CONFIG } from "./config.js";
import { AD_CATEGORIES, AdCat, AgeBucket, Amenity, EventDoc, OSM_AMENITIES, PlaceDoc, UserDoc } from "./types.js";
import {
  adPlaceAffinity,
  ageToBucket,
  genderPlaceBoost,
  interestKeyMap,
  timePrefByAge,
  visitPreferenceByAge,
  hourClickAdj,
} from "./rules.js";

// עזר
function randChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function weightedChoice<T extends string>(
  weights: Partial<Record<T, number>>,
  fallback: T,
  universe: readonly T[]
): T {
  const arr: { v: T; w: number }[] = [];
  for (const k of universe) arr.push({ v: k, w: Math.max(0, weights[k] ?? 0) });
  const sum = arr.reduce((s, x) => s + x.w, 0);
  if (sum <= 0) return fallback;
  let r = Math.random() * sum;
  for (const x of arr) {
    r -= x.w;
    if (r <= 0) return x.v;
  }
  return fallback;
}

export function simulate(users: UserDoc[], places: PlaceDoc[]): EventDoc[] {
  const events: EventDoc[] = [];
  const placesByCat: Record<Amenity, PlaceDoc[]> = { bar: [], restaurant: [], cafe: [], fast_food: [], pub: [] };
  for (const p of places) placesByCat[p.category].push(p);
  const now = dayjs();

  for (const u of users) {
    const visits = faker.number.int({
      min: Math.max(5, Math.floor(CONFIG.AVG_VISITS_PER_USER * 0.6)),
      max: Math.floor(CONFIG.AVG_VISITS_PER_USER * 1.6),
    });
    const bucket = ageToBucket(u.age);
    const baseTimeWeights = timePrefByAge[bucket];
    const gBoost = (genderPlaceBoost[u.gender] ?? {}) as Partial<Record<Amenity, number>>;

    for (let i = 0; i < visits; i++) {
      const chosenTimeOfDay = weightedChoice<EventDoc["timeOfDay"]>(
        baseTimeWeights, "afternoon", ["morning","afternoon","evening","late_night"] as const
      );
      let hour = 14;
      if (chosenTimeOfDay === "morning") hour = faker.number.int({ min: 8, max: 11 });
      else if (chosenTimeOfDay === "afternoon") hour = faker.number.int({ min: 12, max: 17 });
      else if (chosenTimeOfDay === "evening") hour = faker.number.int({ min: 18, max: 22 });
      else hour = 23;

      const ts = now.subtract(faker.number.int({ min: 0, max: CONFIG.DAYS_BACK }), "day")
                    .hour(hour).minute(faker.number.int({ min: 0, max: 59 }))
                    .second(faker.number.int({ min: 0, max: 59 }));
      const wd = ts.day();

      // קטגוריית מקום לפי גיל + בוסט מין
      const baseVisitWeights = { ...(visitPreferenceByAge[bucket] as Record<Amenity, number>) };
      for (const cat of OSM_AMENITIES) {
        baseVisitWeights[cat] = (baseVisitWeights[cat] ?? 0) + (gBoost[cat] ?? 0);
      }
      const cat = weightedChoice<Amenity>(baseVisitWeights, "restaurant", OSM_AMENITIES);
      const pool = placesByCat[cat];
      if (!pool.length) continue;
      const place = randChoice(pool);

      const adCat = randChoice(AD_CATEGORIES as readonly AdCat[]);

      // הסתברות קליק
      let p = 0.04;
      if (u.interests.includes(interestKeyMap[cat])) p += 0.07;

      const clickBoostByAgePlace: Partial<Record<AgeBucket, Partial<Record<Amenity, number>>>> = {
        "18_24": { bar: 0.05, pub: 0.04, fast_food: 0.03 },
        "25_34": { bar: 0.03, pub: 0.03, restaurant: 0.03 },
        "35_44": { restaurant: 0.04, cafe: 0.03 },
        "45_54": { restaurant: 0.04, cafe: 0.03 },
        "55_65": { restaurant: 0.05, cafe: 0.04 },
      };

      p += (clickBoostByAgePlace[bucket]?.[cat] ?? 0);

      p += (adPlaceAffinity[adCat]?.[cat] ?? 0);
      p += hourClickAdj(hour, adCat);
      p += Math.min(0.08, place.popularity / 8000);

      // סופ״ש
      if (wd === 5 || wd === 6) {
        if (cat === "restaurant" || cat === "bar" || cat === "pub") p += 0.03;
      }
      // ג׳נדר קל
      if (u.gender === "female" && cat === "cafe") p += 0.02;
      if (u.gender === "male" && (cat === "bar" || cat === "pub")) p += 0.015;

      p = clamp01(Math.max(0.01, Math.min(0.6, p)));
      const clicked: 0 | 1 = Math.random() < p ? 1 : 0;

      events.push({
        userId: u._id,
        placeId: place._id,
        timestamp: ts.toDate(),
        weekday: wd,
        hour,
        timeOfDay: hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 23 ? "evening" : "late_night",
        placeCategory: cat,
        adCategory: adCat,
        clicked,
      });
    }
  }
  return events;
}
