import { AgeBucket, Amenity, AdCat, Gender } from "./types.js";

export function ageToBucket(age: number): AgeBucket {
  if (age <= 24) return "18_24";
  if (age <= 34) return "25_34";
  if (age <= 44) return "35_44";
  if (age <= 54) return "45_54";
  return "55_65";
}


export const visitPreferenceByAge: Record<AgeBucket, Partial<Record<Amenity, number>>> = {
  "18_24": { bar: 0.35, pub: 0.25, fast_food: 0.2, cafe: 0.1, restaurant: 0.1 },
  "25_34": { bar: 0.25, pub: 0.2, restaurant: 0.25, cafe: 0.2, fast_food: 0.1 },
  "35_44": { restaurant: 0.35, cafe: 0.25, pub: 0.15, bar: 0.15, fast_food: 0.1 },
  "45_54": { restaurant: 0.4, cafe: 0.25, pub: 0.15, bar: 0.1, fast_food: 0.1 },
  "55_65": { restaurant: 0.45, cafe: 0.3, pub: 0.1, bar: 0.05, fast_food: 0.1 },
};


export const timePrefByAge: Record<AgeBucket, Record<"morning" | "afternoon" | "evening" | "late_night", number>> = {
  "18_24": { morning: 0.05, afternoon: 0.2, evening: 0.45, late_night: 0.3 },
  "25_34": { morning: 0.1,  afternoon: 0.25, evening: 0.5,  late_night: 0.15 },
  "35_44": { morning: 0.15, afternoon: 0.35, evening: 0.45, late_night: 0.05 },
  "45_54": { morning: 0.2,  afternoon: 0.45, evening: 0.3,  late_night: 0.05 },
  "55_65": { morning: 0.3,  afternoon: 0.45, evening: 0.2,  late_night: 0.05 },
};


export const genderPlaceBoost: Partial<Record<Gender, Partial<Record<Amenity, number>>>> = {
  female: { cafe: 0.03, restaurant: 0.02 },
  male: { pub: 0.02, bar: 0.02 },
};


export const adPlaceAffinity: Record<AdCat, Partial<Record<Amenity, number>>> = {
  food_delivery: { restaurant: 0.12, cafe: 0.06, fast_food: 0.12, pub: 0.02, bar: 0.02 },
  happy_hour: { bar: 0.15, pub: 0.12, restaurant: 0.03, cafe: 0.02, fast_food: 0.01 },
  coffee_deal: { cafe: 0.15, restaurant: 0.03, fast_food: 0.03, bar: 0.01, pub: 0.01 },
  gym_offer: { fast_food: -0.03, bar: -0.02, cafe: 0.01, restaurant: 0.01, pub: -0.02 },
  movie_night: { restaurant: 0.03, bar: 0.03, pub: 0.03, cafe: 0.02, fast_food: 0.02 },
  shopping_sale: { cafe: 0.02, restaurant: 0.02, fast_food: 0.02, bar: 0.01, pub: 0.01 },
};


export function hourClickAdj(hour: number, ad: AdCat): number {
  if (ad === "happy_hour" && (hour >= 18 && hour <= 23)) return 0.05;
  if (ad === "food_delivery" && (hour >= 19 && hour <= 22)) return 0.06;
  if (ad === "coffee_deal" && (hour >= 8 && hour <= 11)) return 0.05;
  return 0;
}


export const interestKeyMap: Record<Amenity, string> = {
  bar: "bars",
  pub: "nightlife",
  fast_food: "fast_food",
  cafe: "cafes",
  restaurant: "restaurants",
};
