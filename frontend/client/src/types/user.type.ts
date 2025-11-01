
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type User = {
  id: string;
  username: string;
  dateOfBirth?: string; 
  gender?: Gender;
  profileImage?: string | null;
  /** Ephemeral presigned GET url for immediate display */
  profileImageUrl?: string | null;
};
