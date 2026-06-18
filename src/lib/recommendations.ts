import type { Phone } from "@/src/types/phone";
import type {
  RecommendedPhone,
  UserPreferences,
} from "@/src/types/recommendation";

export function calculateRecommendationScore(
  phone: Phone,
  preferences: UserPreferences,
): number {
  const importanceScore =
    preferences.cameraImportance * phone.score_camera +
    preferences.gamingImportance * phone.score_gaming +
    preferences.batteryImportance * phone.score_battery;

  // Price efficiency bonus: Cheaper phones relative to budget get a bonus up to 10 points
  const priceRatio = phone.price / preferences.budget;
  const priceEfficiencyBonus = 10 * (1 - priceRatio);

  return importanceScore + priceEfficiencyBonus;
}

export function getRecommendations(
  phones: Phone[],
  preferences: UserPreferences,
  limit = 3,
): RecommendedPhone[] {
  const withinBudget = phones.filter((phone) => phone.price <= preferences.budget);

  return withinBudget
    .map((phone) => ({
      id: phone.id,
      brand: phone.brand,
      model: phone.model,
      price: phone.price,
      chipset: phone.chipset,
      battery: phone.battery,
      camera: phone.camera,
      display: phone.display,
      image_url: phone.image_url,
      amazon_link: phone.amazon_link,
      flipkart_link: phone.flipkart_link,
      recommendationScore: calculateRecommendationScore(phone, preferences),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}
