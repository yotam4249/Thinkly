import axios from "axios";
import { faker } from "@faker-js/faker";
import { CONFIG } from "./config.js";
import { Amenity, OSM_AMENITIES, PlaceDoc } from "./types.js";

function overpassQuery([SOUTH, WEST, NORTH, EAST]: [number, number, number, number]) {
  return `
[out:json][timeout:60];
(
  node["amenity"~"bar|restaurant|cafe|fast_food|pub"](${SOUTH},${WEST},${NORTH},${EAST});
  way["amenity"~"bar|restaurant|cafe|fast_food|pub"](${SOUTH},${WEST},${NORTH},${EAST});
  relation["amenity"~"bar|restaurant|cafe|fast_food|pub"](${SOUTH},${WEST},${NORTH},${EAST});
);
out center tags;
`;
}

export async function fetchOSMPlaces(): Promise<PlaceDoc[]> {
  const { data } = await axios.post(
    CONFIG.OVERPASS,
    overpassQuery(CONFIG.OSM_BBOX),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 60_000,
    }
  );

  const tmp: PlaceDoc[] = [];
  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const cat = el.tags?.amenity as Amenity | undefined;
    if (!lat || !lon) continue;
    if (!cat || !OSM_AMENITIES.includes(cat)) continue;

    tmp.push({
      _id: `${el.type}/${el.id}`, // stable OSM key → duplicates across runs are normal
      name: el.tags?.name,
      category: cat,
      location: { type: "Point", coordinates: [lon, lat] },
      popularity: faker.number.int({ min: 1, max: 1000 }),
    });
  }

  // In-memory dedupe in case Overpass returns duplicates within the same fetch.
  const map = new Map<string, PlaceDoc>();
  for (const p of tmp) map.set(p._id, p);
  return Array.from(map.values()).slice(0, CONFIG.MAX_PLACES);
}
