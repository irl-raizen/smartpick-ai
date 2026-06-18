export type UserPreferences = {
  budget: number;
  cameraImportance: number;
  gamingImportance: number;
  batteryImportance: number;
};

export type RecommendedPhone = {
  id: string;
  brand: string;
  model: string;
  price: number;
  chipset: string;
  battery: string;
  camera?: string;
  display?: string;
  image_url?: string;
  amazon_link?: string;
  flipkart_link?: string;
  recommendationScore: number;
};
