export const OSM_AMENITIES = ["bar", "restaurant", "cafe", "fast_food", "pub"] as const;
export type Amenity = typeof OSM_AMENITIES[number];

export const AD_CATEGORIES = [
  "food_delivery",
  "happy_hour",
  "coffee_deal",
  "gym_offer",
  "movie_night",
  "shopping_sale",
] as const;
export type AdCat = typeof AD_CATEGORIES[number];

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type AgeBucket = "18_24" | "25_34" | "35_44" | "45_54" | "55_65";

export type PlaceDoc = {
  _id: string; 
  name?: string;
  category: Amenity;
  location: { type: "Point"; coordinates: [number, number] }; 
  popularity: number; 
};

export type UserDoc = {
  _id: string; 
  username: string;
  age: number; 
  gender: Gender;
  interests: string[];
};

export type EventDoc = {
  userId: string;
  placeId: string;
  timestamp: Date;
  weekday: number; 
  hour: number;   
  timeOfDay: "morning" | "afternoon" | "evening" | "late_night";
  placeCategory: Amenity;
  adCategory: AdCat;
  clicked: 0 | 1;
};
