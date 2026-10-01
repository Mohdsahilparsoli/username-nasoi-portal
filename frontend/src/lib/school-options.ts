/** School entry options – same lists as the backend (src/modules/entries/schema.ts). */
export const RURAL_URBAN = ["Rural", "Urban"] as const;

export const SCHOOL_CATEGORIES = [
  "Pre-Primary only",
  "Primary only (1-5)",
  "Primary with Upper Primary (1-8)",
  "Primary with Upper Primary, Secondary and Higher Secondary (1-12)",
  "Upper Primary only (6-8)",
  "Upper Primary with Secondary and Higher Secondary (6-12)",
  "Primary with Upper Primary and Secondary (1-10)",
  "Upper Primary with Secondary (6-10)",
  "Secondary only (9-10)",
  "Secondary with Higher Secondary (9-12)",
  "Higher Secondary only / Jr. College (11-12)",
] as const;

export const SCHOOL_MANAGEMENTS = [
  "Department of Education",
  "Tribal Welfare Department",
  "Social Welfare Department",
  "Local Body",
  "Government Aided",
  "Partially Government Aided",
  "Private Unaided (Recognized)",
  "Other State Govt. Managed",
  "Kendriya Vidyalaya / Central School",
  "Jawahar Navodaya Vidyalaya",
  "Sainik School",
  "Railway School",
  "Central Tibetan School",
  "Ministry of Labour",
  "Other Central Govt. Schools",
  "Madarsa Recognized (by Wakf Board / Madarsa Board)",
  "Madarsa Unrecognized",
  "Unrecognized",
] as const;

export const SCHOOL_TYPES = ["Co-educational", "Boys", "Girls"] as const;
