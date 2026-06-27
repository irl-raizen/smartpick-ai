import type { Phone } from "./phone";

export type UserPreferences = {
  budget: number;
  cameraImportance: number;
  gamingImportance: number;
  batteryImportance: number;
};

export type RecommendedPhone = Phone & {
  recommendationScore: number;
};
