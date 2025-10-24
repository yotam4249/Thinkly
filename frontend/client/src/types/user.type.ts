
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type User = {
  id: string;
  username: string;
  dateOfBirth?: string; 
  gender?: Gender;
};
