import { faker } from "@faker-js/faker";
import { CONFIG } from "./config.js";
import { Gender, UserDoc } from "./types.js";
import { ageToBucket } from "./rules.js";

export function generateUsers(): UserDoc[] {
  const pool = ["bars","restaurants","cafes","nightlife","fast_food","movies","gyms","shopping"];
  const genders: Gender[] = ["male", "female", "other", "prefer_not_to_say"];

  const users: UserDoc[] = [];
  for (let i = 0; i < CONFIG.NUM_USERS; i++) {
    const age = faker.number.int({ min: 18, max: 65 });
    const bucket = ageToBucket(age);
    let interests = ["restaurants", "cafes"];

    if (bucket === "18_24") interests = ["nightlife", "bars", "fast_food"];
    else if (bucket === "25_34") interests = ["bars", "restaurants", "gyms"];
    else if (bucket === "35_44") interests = ["restaurants", "cafes", "shopping"];
    else if (bucket === "45_54") interests = ["restaurants", "cafes", "shopping"];
    else interests = ["restaurants", "cafes", "movies"];

    const extras = faker.helpers.arrayElements(
      pool.filter((x) => !interests.includes(x)),
      faker.number.int({ min: 0, max: 2 })
    );
    interests = Array.from(new Set([...interests, ...extras]));

    users.push({
      _id: faker.string.uuid(),
      username: faker.internet.userName(),
      age,
      gender: faker.helpers.arrayElement(genders),
      interests,
    });
  }
  return users;
}
