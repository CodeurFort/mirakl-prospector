import type { ROIEstimate } from "./types";

const CATEGORY_UPLIFT: Record<string, string> = {
  fashion: "15-25%",
  footwear: "15-25%",
  beauty: "20-30%",
  accessories: "15-20%",
  sports: "15-25%",
  kids: "10-20%",
  luxury: "10-20%",
  "home & wellness": "10-15%",
};

const CATALOGUE_HOURS_MULTIPLIER: Record<string, number> = {
  "Large (500+)": 0.05,
  "Medium (100-500)": 0.08,
  "Small (10-100)": 0.12,
  "Micro (<10)": 0.2,
  Unknown: 0.1,
};

export function calculateROI(params: {
  catalogueSize: string;
  eligibleMarketplaces: number;
  category: string;
  priceRange: string;
}): ROIEstimate {
  const { catalogueSize, eligibleMarketplaces, category, priceRange } = params;

  // Estimate product count from catalogue size label
  const productEstimate: Record<string, number> = {
    "Large (500+)": 700,
    "Medium (100-500)": 250,
    "Small (10-100)": 50,
    "Micro (<10)": 5,
    Unknown: 100,
  };
  const products = productEstimate[catalogueSize] || 100;
  const hoursMultiplier = CATALOGUE_HOURS_MULTIPLIER[catalogueSize] || 0.1;

  // Time calculation
  const productUpdateHours = products * hoursMultiplier * eligibleMarketplaces;
  const orderManagementHours = 5 * eligibleMarketplaces;
  const totalHoursPerMonth = Math.round(
    productUpdateHours + orderManagementHours
  );

  // Cost calculation
  const hourlyRate = priceRange === "luxury" || priceRange === "premium" ? 45 : 35;
  const costWithoutMirakl = totalHoursPerMonth * hourlyRate;
  const costWithMirakl = 599; // Growth plan
  const monthlySavings = Math.max(0, costWithoutMirakl - costWithMirakl);

  // Revenue uplift
  const categoryKey = category.toLowerCase();
  const revenueUpliftPercent =
    CATEGORY_UPLIFT[categoryKey] || "10-20%";

  return {
    timesSavedPerMonth: totalHoursPerMonth,
    costWithoutMirakl,
    costWithMirakl,
    monthlySavings,
    revenueUpliftPercent,
    eligibleMarketplaces,
  };
}

export function formatROIForEmail(roi: ROIEstimate): string {
  return `Gestion manuelle de ${roi.eligibleMarketplaces} marketplaces = ~${roi.timesSavedPerMonth}h/mois (${roi.costWithoutMirakl}€). Avec Mirakl Connect à ${roi.costWithMirakl}€/mois, économie de ${roi.monthlySavings}€/mois. Potentiel d'augmentation CA : ${roi.revenueUpliftPercent} en année 1.`;
}
