import type { Phone } from "@/src/types/phone";
import type {
  RecommendedPhone,
  UserPreferences,
} from "@/src/types/recommendation";

export type ScoringWeights = {
  camera: number;
  performance: number;
  battery: number;
  value: number;
  rating: number;
};

// Calculate normalized scores for a phone
export function getPhoneSpecsScores(phone: Phone, budget: number) {
  const camera = phone.score_camera ?? 5;
  const performance = phone.score_gaming ?? 5;
  const battery = phone.score_battery ?? 5;

  // Normalize Rating to 0-10 scale
  let rating = 7.0; // Default
  if (phone.rating !== undefined && phone.rating !== null) {
    const rawRating = Number(phone.rating);
    rating = rawRating <= 5 ? rawRating * 2 : rawRating;
  }

  // Calculate Value Score (0-10)
  // 1. Savings component: how much budget is saved (up to 10 points)
  const savings = Math.max(0, 10 * (1 - phone.price / budget));
  
  // 2. Spec efficiency component: specs per rupee (higher is better)
  const specAverage = (camera + performance + battery) / 3;
  // Index of specs per 10k INR
  const specPerTenK = phone.price > 0 ? (specAverage / (phone.price / 10000)) : 0;
  // Normalize specPerTenK: a value of 2.0 specs per 10k is typical for mid-range (e.g. specs=8, price=40k)
  // Let's scale it so that 3.0 is a perfect 10 (e.g. specs=9, price=30k)
  const specValue = Math.min(10, (specPerTenK / 3.0) * 10);

  // Value is a weighted combination of budget savings and specs per rupee
  const value = savings * 0.4 + specValue * 0.6;

  return {
    camera,
    performance,
    battery,
    rating,
    value: Math.min(10, Math.max(0, value))
  };
}

export function calculateRecommendationScore(
  phone: Phone,
  preferences: UserPreferences,
): number {
  const scores = getPhoneSpecsScores(phone, preferences.budget);
  
  // Map preferences to weights
  const weights: ScoringWeights = {
    camera: preferences.cameraImportance,
    performance: preferences.gamingImportance,
    battery: preferences.batteryImportance,
    value: 5,  // default middle weight
    rating: 5, // default middle weight
  };

  const totalWeight = weights.camera + weights.performance + weights.battery + weights.value + weights.rating;
  
  const weightedSum =
    scores.camera * weights.camera +
    scores.performance * weights.performance +
    scores.battery * weights.battery +
    scores.value * weights.value +
    scores.rating * weights.rating;

  // Scale back to a score out of 100
  return totalWeight > 0 ? (weightedSum / totalWeight) * 10 : weightedSum;
}

export function getRecommendations(
  phones: Phone[],
  preferences: UserPreferences,
  limit = 3,
): RecommendedPhone[] {
  // Only recommend phones within budget (allowing a tiny margin of 5% in case price is slightly higher but specs are great)
  const withinBudget = phones.filter((phone) => phone.price <= preferences.budget * 1.05);

  return withinBudget
    .map((phone) => ({
      ...phone,
      chipset: phone.chipset || phone.processor || "Unknown Chipset",
      recommendationScore: calculateRecommendationScore(phone, preferences),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

