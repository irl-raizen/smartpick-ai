import type { Phone } from "@/src/types/phone";
import type { RecommendedPhone, UserPreferences } from "@/src/types/recommendation";

export type ScoringWeights = {
  camera: number;
  gaming: number;
  battery: number;
  display: number;
  software: number;
  value: number;
};

// Calculate normalized weighted sub-scores dynamically based on specifications
export function calculateWeightedScores(phone: Phone) {
  const price = phone.price || 19999;
  const brandLower = phone.brand.toLowerCase();
  const modelLower = phone.model.toLowerCase();
  const displayLower = (phone.display || "").toLowerCase();
  const cameraLower = (phone.camera || "").toLowerCase();
  const osLower = (phone.os || "").toLowerCase();

  // 1. CAMERA SCORE BREAKDOWN (0-10)
  const baseCamera = phone.score_camera || 5;
  const isOis = cameraLower.includes("ois") || cameraLower.includes("stabilization") || price > 40000;
  const isTelephoto = cameraLower.includes("telephoto") || cameraLower.includes("periscope") || cameraLower.includes("zoom");
  const isUltrawide = cameraLower.includes("ultra-wide") || cameraLower.includes("ultrawide") || cameraLower.includes("12mp") || cameraLower.includes("8mp");
  
  const camOis = isOis ? 10 : 4;
  const camTele = isTelephoto ? 10 : 3;
  const camWide = isUltrawide ? 10 : 5;
  const camVideo = brandLower === "apple" ? 10 : price > 60000 ? 9 : price > 30000 ? 7 : 5;
  const camNight = price > 60000 ? 10 : price > 30000 ? 8 : 5;
  const camSensor = price > 70000 ? 10 : price > 40000 ? 8 : 6;

  const cameraTotal = Math.round(
    (baseCamera * 0.4 + (camOis * 0.15 + camTele * 0.15 + camWide * 0.1 + camVideo * 0.1 + camNight * 0.1)) * 10
  ) / 10;

  // 2. GAMING SCORE BREAKDOWN (0-10)
  const baseGaming = phone.score_gaming || 5;
  const isFlagshipChip = 
    phone.chipset?.includes("Snapdragon 8") || 
    phone.chipset?.includes("Apple A17") || 
    phone.chipset?.includes("Apple A18") ||
    phone.chipset?.includes("Dimensity 9300") ||
    phone.chipset?.includes("Dimensity 9400");

  const isMidrangeChip = 
    phone.chipset?.includes("Snapdragon 7") || 
    phone.chipset?.includes("Dimensity 7") || 
    phone.chipset?.includes("Dimensity 8");

  const gpu = isFlagshipChip ? 10 : isMidrangeChip ? 8 : 5;
  const cpu = isFlagshipChip ? 10 : isMidrangeChip ? 8 : 6;
  const fps = isFlagshipChip ? 10 : isMidrangeChip ? 8 : 5;
  const cooling = isFlagshipChip ? 9 : price > 30000 ? 8 : 6;

  // RAM score
  let ramVal = 8;
  if (phone.ram) {
    const ramMatch = phone.ram.match(/(\d+)/);
    if (ramMatch) {
      const parsedRam = parseInt(ramMatch[1], 10);
      ramVal = parsedRam >= 16 ? 10 : parsedRam >= 12 ? 9 : parsedRam >= 8 ? 7 : parsedRam >= 6 ? 5 : 3;
    }
  }

  // Storage score
  let storageVal = 8;
  if (phone.storage) {
    const storageMatch = phone.storage.match(/(\d+)/);
    if (storageMatch) {
      const parsedStorage = parseInt(storageMatch[1], 10);
      storageVal = parsedStorage >= 512 ? 10 : parsedStorage >= 256 ? 9 : parsedStorage >= 128 ? 7 : 4;
    }
  }

  const gamingTotal = Math.round(
    (baseGaming * 0.4 + (cpu * 0.15 + gpu * 0.15 + fps * 0.1 + cooling * 0.1 + ramVal * 0.05 + storageVal * 0.05)) * 10
  ) / 10;

  // 3. BATTERY SCORE BREAKDOWN (0-10)
  const baseBattery = phone.score_battery || 5;
  const capacityMah = parseInt(phone.battery || "0", 10) || 4500;
  
  const batCapacity = capacityMah >= 5500 ? 10 : capacityMah >= 5000 ? 9 : capacityMah >= 4500 ? 7 : 5;
  const batCharging = 
    brandLower === "oneplus" || brandLower === "xiaomi" || brandLower === "realme" || brandLower === "poco"
      ? (price > 40000 ? 10 : 8)
      : (brandLower === "apple" || brandLower === "samsung" || brandLower === "google" ? 6 : 7);
  
  const batEfficiency = isFlagshipChip ? 10 : isMidrangeChip ? 9 : 7;

  const batteryTotal = Math.round(
    (baseBattery * 0.4 + (batCapacity * 0.25 + batCharging * 0.2 + batEfficiency * 0.15)) * 10
  ) / 10;

  // 4. DISPLAY SCORE BREAKDOWN (0-10)
  const is120Hz = displayLower.includes("120hz") || displayLower.includes("144hz");
  const isOled = displayLower.includes("oled") || displayLower.includes("amoled");
  const isQhd = displayLower.includes("qhd") || displayLower.includes("2k") || displayLower.includes("1440p");

  const dispRefresh = is120Hz ? 10 : displayLower.includes("90hz") ? 7 : 5;
  const dispPanel = isOled ? 10 : 6;
  const dispResolution = isQhd ? 10 : displayLower.includes("fhd") || displayLower.includes("1080p") ? 8 : 6;
  const dispBrightness = price > 70000 ? 10 : price > 40000 ? 8.5 : 7;
  const dispHdr = displayLower.includes("hdr") || displayLower.includes("dolby") || price > 30000 ? 10 : 5;

  const displayTotal = Math.round(
    (dispRefresh * 0.25 + dispPanel * 0.25 + dispResolution * 0.2 + dispBrightness * 0.15 + dispHdr * 0.15) * 10
  ) / 10;

  // 5. SOFTWARE SCORE BREAKDOWN (0-10)
  const isLatestOs = osLower.includes("14") || osLower.includes("17") || osLower.includes("18");
  
  const softOsVersion = isLatestOs ? 10 : osLower.includes("13") || osLower.includes("16") ? 8 : 6;
  const softUpdates = 
    brandLower === "google" || brandLower === "samsung"
      ? (modelLower.includes("pixel 8") || modelLower.includes("pixel 9") || modelLower.includes("galaxy s24") || modelLower.includes("galaxy s25") ? 10 : 8)
      : (brandLower === "apple" ? 9 : brandLower === "oneplus" ? 8 : 5);
  
  const softPatches = brandLower === "google" || brandLower === "apple" || brandLower === "samsung" ? 10 : 7;

  const softwareTotal = Math.round(
    (softOsVersion * 0.35 + softUpdates * 0.45 + softPatches * 0.2) * 10
  ) / 10;

  // 6. VALUE SCORE (0-10)
  const valueSavings = Math.max(0, 10 * (1 - price / 100000)); // normalized scale compared to 100k
  const specAverage = (cameraTotal + gamingTotal + batteryTotal + displayTotal + softwareTotal) / 5;
  const specValue = Math.min(10, ((specAverage / (price / 10000)) / 2.5) * 10);
  const valueTotal = Math.round((valueSavings * 0.4 + specValue * 0.6) * 10) / 10;

  return {
    camera: { sensor: camSensor, ois: camOis, ultrawide: camWide, telephoto: camTele, video: camVideo, nightMode: camNight, total: cameraTotal },
    gaming: { cpu, gpu, cooling, fps, ram: ramVal, storage: storageVal, total: gamingTotal },
    battery: { capacity: batCapacity, charging: batCharging, efficiency: batEfficiency, total: batteryTotal },
    display: { panel: dispPanel, brightness: dispBrightness, refreshRate: dispRefresh, hdr: dispHdr, resolution: dispResolution, total: displayTotal },
    software: { osVersion: softOsVersion, updateYears: softUpdates, securityPatches: softPatches, total: softwareTotal },
    value: valueTotal,
    overall: Math.round(((cameraTotal + gamingTotal + batteryTotal + displayTotal + softwareTotal) / 5) * 10) / 10
  };
}

export function calculateRecommendationScore(
  phone: Phone,
  preferences: UserPreferences
): number {
  const scores = calculateWeightedScores(phone);

  const weights: ScoringWeights = {
    camera: preferences.cameraImportance,
    gaming: preferences.gamingImportance,
    battery: preferences.batteryImportance,
    display: 5,
    software: 5,
    value: 5
  };

  const totalWeight = 
    weights.camera + weights.gaming + weights.battery + weights.display + weights.software + weights.value;

  const weightedSum =
    scores.camera.total * weights.camera +
    scores.gaming.total * weights.gaming +
    scores.battery.total * weights.battery +
    scores.display.total * weights.display +
    scores.software.total * weights.software +
    scores.value * weights.value;

  return totalWeight > 0 ? Math.round(((weightedSum / totalWeight) * 10) * 10) / 10 : weightedSum;
}

export function getRecommendations(
  phones: Phone[],
  preferences: UserPreferences,
  limit = 3
): RecommendedPhone[] {
  // Only recommend phones within budget (allowing a tiny margin of 5% in case price is slightly higher but specs are great)
  const withinBudget = phones.filter((phone) => phone.price <= preferences.budget * 1.05);

  return withinBudget
    .map((phone) => ({
      ...phone,
      chipset: phone.chipset || phone.processor || "Unknown Chipset",
      recommendationScore: calculateRecommendationScore(phone, preferences)
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

export function getPhoneSpecsScores(phone: Phone, budget: number) {
  const scores = calculateWeightedScores(phone);
  return {
    camera: scores.camera.total,
    performance: scores.gaming.total,
    battery: scores.battery.total,
    rating: Number(phone.rating || 4.2),
    value: scores.value
  };
}
