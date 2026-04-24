import type { Seller } from "./types";

export type PriorityLevel = "HOT" | "HIGH" | "MEDIUM" | "LOW";
export type ActiveTab = "prospection" | "outreach" | "pipeline";
export type PipelineStage = "ready" | "in_sequence" | "sent" | "replied";
export type ProspectionMode = "bulk" | "specific";
export type AnalysisKind = "bulk" | "specific";

export interface SelectOption {
  value: string;
  label: string;
  description: string;
}

export interface OutreachStrategy {
  method: string;
  angle: string;
  seasonalMoment: string;
  emailGap1Days: number;
  emailGap2Days: number;
}

export interface ScoreBreakdownItem {
  key: ScoreWeightKey;
  label: string;
  weight: number;
  score: number;
  weightedScore: number;
  reason: string;
}

export interface MarketplaceScoreDetail {
  marketplaceId: string;
  marketplaceName: string;
  region: string;
  totalScore: number;
  priority: PriorityLevel;
  heroStat: string;
  whyItMatches: string[];
  cautions: string[];
  matchingSignals: string[];
  rolesToScrape: string[];
  criteria: ScoreBreakdownItem[];
}

export interface RecommendedContact {
  role: string;
  linkedinHint: string;
}

export interface SellerCampaignRecord {
  id: string;
  seller: Seller;
  totalScore: number;
  priority: PriorityLevel;
  reasoningText: string;
  scoreBreakdown: ScoreBreakdownItem[];
  signals: string[];
  strategy: OutreachStrategy;
  recommendedContact: RecommendedContact;
  operatorScores: MarketplaceScoreDetail[];
  topRecommendation: MarketplaceScoreDetail | null;
  emails: DraftEmail[];
  contacts: string[];
  pipelineStage: PipelineStage;
  pushedAt: string;
  source: "bulk";
}

export interface SellerIntelligenceSnapshot {
  seller: Seller;
  totalScore: number;
  priority: PriorityLevel;
  reasoningText: string;
  scoreBreakdown: ScoreBreakdownItem[];
  signals: string[];
  strategy: OutreachStrategy;
  recommendedContact: RecommendedContact;
  operatorScores: MarketplaceScoreDetail[];
  topRecommendation: MarketplaceScoreDetail | null;
}

export interface MarketplaceRecommendation {
  marketplaceId: string;
  marketplaceName: string;
  score: number;
  priority: PriorityLevel;
  region: string;
  heroStat: string;
  whyItMatches: string[];
  cautions: string[];
  matchingSignals: string[];
  rolesToScrape: string[];
  criteria: ScoreBreakdownItem[];
}

export interface SpecificCampaign {
  id: string;
  brandName: string;
  companyDomain: string;
  roles: string[];
  selectedMarketplaceIds: string[];
  marketplaces: MarketplaceRecommendation[];
  source: "matching_table" | "fallback_existing_marketplaces";
  statusMessage?: string;
  pipelineStage: PipelineStage;
  createdAt: string;
  transferredAt?: string | null;
}

export interface WorkspaceAnalysis {
  kind: AnalysisKind;
  generatedAt: string;
  sellerCount?: number;
  brandName?: string;
  companyDomain?: string;
  filters?: Record<string, string | string[] | undefined>;
  note?: string;
}

export interface DraftEmail {
  id: string;
  mailNumber: 1 | 2 | 3;
  timing: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
}

export interface MatchingBrandProfile {
  brandName: string;
  companyDomain: string;
  focusCategories: string[];
  priceBands: string[];
  targetCountries: string[];
  customerPositioning: string[];
  catalogueExpectation: string[];
  distributionModel: string[];
  seasonalMoments: string[];
}

export interface MarketplaceProfileRecord {
  id: string;
  marketplaceName: string;
  description: string;
  region: string;
  focusCategories: string[];
  priceBands: string[];
  acceptedPriceBands: string[];
  targetCountries: string[];
  acceptedCountries: string[];
  customerPositioning: string[];
  catalogueExpectation: string[];
  distributionPreferences: string[];
  seasonalMoments: string[];
  companySizeFit: string[];
  heroStat?: string;
  caution?: string;
  rolesToScrape: string[];
  signals: string[];
  source: "matching" | "fallback";
}

export type ScoreWeightKey =
  | "category"
  | "geography"
  | "price"
  | "customer"
  | "seasonality"
  | "marketplaceSignals";

export const SCORE_WEIGHTS: Record<ScoreWeightKey, number> = {
  category: 28,
  geography: 22,
  price: 16,
  customer: 14,
  seasonality: 10,
  marketplaceSignals: 10,
};

export const TARGET_ROLE_OPTIONS: SelectOption[] = [
  {
    value: "Head of Marketplace",
    label: "Head of Marketplace",
    description: "Pilote l'expansion marketplace et le business case.",
  },
  {
    value: "E-commerce Director",
    label: "E-commerce Director",
    description: "Arbitre le mix canaux et la priorisation digitale.",
  },
  {
    value: "Sales Director",
    label: "Sales Director",
    description: "Sensible au revenu incrémental et au pipe commercial.",
  },
  {
    value: "Marketplace Manager",
    label: "Marketplace Manager",
    description: "Opérationnel sur l'onboarding, le catalogue et les flux.",
  },
  {
    value: "Founder/CEO",
    label: "Founder/CEO",
    description: "Décisionnaire utile pour les marques en structuration.",
  },
];

export const OUTREACH_METHOD_OPTIONS: SelectOption[] = [
  {
    value: "email_sequence",
    label: "Sequence email",
    description: "Cadence classique en 3 temps pour installer le sujet.",
  },
  {
    value: "linkedin_email",
    label: "LinkedIn+email",
    description: "Double touchpoint utile quand le seller est bien identifié.",
  },
  {
    value: "partner_intro",
    label: "Intro partenaire",
    description: "Approche par validation externe ou opérateur marketplace.",
  },
  {
    value: "seasonal_push",
    label: "Push saisonnier",
    description: "Message d'opportunite lie a un moment commercial fort.",
  },
];

export const OUTREACH_ANGLE_OPTIONS: SelectOption[] = [
  {
    value: "market_fit",
    label: "Market fit",
    description: "Met en avant l'alignement categorie, geo et positioning.",
  },
  {
    value: "roi",
    label: "ROI",
    description: "Cadre la discussion autour du temps gagne et du revenu potentiel.",
  },
  {
    value: "social_proof",
    label: "Preuve sociale",
    description: "S'appuie sur des signaux de traction et des comparables.",
  },
  {
    value: "competitive_gap",
    label: "Gap concurrentiel",
    description: "Joue la carte du retard a combler face aux concurrents.",
  },
  {
    value: "seasonal_window",
    label: "Fenetre saisonniere",
    description: "Ancre le message dans une fenetre commerciale imminente.",
  },
];

export const SEASONAL_MOMENT_OPTIONS: SelectOption[] = [
  {
    value: "always_on",
    label: "Always on",
    description: "Approche evergreen, sans timing commercial fort.",
  },
  {
    value: "black_friday",
    label: "Black Friday",
    description: "Fenetre ideale pour les catalogues promo et gifting.",
  },
  {
    value: "holiday_gifting",
    label: "Holiday gifting",
    description: "Pertinent pour accessoires, beaute, premium et maison.",
  },
  {
    value: "back_to_school",
    label: "Back to school",
    description: "Sert les categories kids, basics et sport.",
  },
  {
    value: "summer_sale",
    label: "Summer sale",
    description: "Met l'accent sur le sell-through et les remises.",
  },
  {
    value: "fashion_drop",
    label: "Fashion drop",
    description: "Cadence utile pour capsules, launches et premium fashion.",
  },
];

const SCORE_LABELS: Record<ScoreWeightKey, string> = {
  category: "Categorie",
  geography: "Geo",
  price: "Prix",
  customer: "Client",
  seasonality: "Saisonnalite",
  marketplaceSignals: "Signaux marketplace",
};

const CRITERIA_ORDER: ScoreWeightKey[] = [
  "category",
  "geography",
  "price",
  "customer",
  "seasonality",
  "marketplaceSignals",
];

const VALUE_ALIASES: Record<string, string> = {
  "budget (<30€)": "budget",
  "budget (<30eur)": "budget",
  "mid-range (30-100€)": "mid",
  "mid range (30-100€)": "mid",
  "premium (100-300€)": "premium",
  "luxury (300€+)": "luxury",
  "large (500+)": "large",
  "medium (100-500)": "medium",
  "small (10-100)": "small",
  "micro (<10)": "micro",
  "mono-brand": "mono-brand",
  "multi-brand": "multi-brand",
  "all-season": "always_on",
  "always on": "always_on",
  "black friday": "black_friday",
  "holiday gifting": "holiday_gifting",
  "back to school": "back_to_school",
  "summer sale": "summer_sale",
  "fashion drop": "fashion_drop",
  unisex: "unisex",
  women: "women",
  men: "men",
  kids: "kids",
  family: "family",
};

function normalizeValue(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ");
  return VALUE_ALIASES[normalized] || normalized;
}

function normalizeArray(values: string[] | null | undefined): string[] {
  return (values || []).map((value) => normalizeValue(value)).filter(Boolean);
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function overlaps(value: string, targets: string[]) {
  if (!value || targets.length === 0) return false;
  return targets.some((target) => value === target || value.includes(target) || target.includes(value));
}

function tokenize(value: string): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/[\s,;/&|()]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

// Continuous match score: combines exact list position, token overlap, and partial substring match.
// Returns a score in [0, 100] with real granularity, not just buckets.
function continuousListScore(
  sellerValue: string,
  preferredValues: string[],
  acceptedValues: string[]
): number {
  if (!sellerValue) return 38; // Missing seller data → prudent neutral, not a hard 45 plateau
  if (preferredValues.length === 0 && acceptedValues.length === 0) return 55;

  const sellerTokens = tokenize(sellerValue);

  // 1) Exact hit on preferred: score depends on position (primary focus = 100, tail = 80)
  const preferredIdx = preferredValues.findIndex(
    (pref) => pref === sellerValue || overlaps(sellerValue, [pref])
  );
  if (preferredIdx >= 0) {
    const positionBonus = Math.max(0, 20 - preferredIdx * 4);
    return Math.min(100, 78 + positionBonus);
  }

  // 2) Exact hit on accepted list
  if (overlaps(sellerValue, acceptedValues)) {
    const acceptedIdx = acceptedValues.findIndex(
      (acc) => acc === sellerValue || overlaps(sellerValue, [acc])
    );
    return 60 + Math.max(0, 10 - acceptedIdx * 2);
  }

  // 3) Token-level overlap with preferred / accepted (semantic proximity)
  const targetTokens = [...preferredValues, ...acceptedValues].flatMap(tokenize);
  if (targetTokens.length > 0 && sellerTokens.length > 0) {
    const matched = sellerTokens.filter((token) =>
      targetTokens.some((target) => target === token || target.includes(token) || token.includes(target))
    );
    const overlap = matched.length / Math.max(sellerTokens.length, 1);
    if (overlap > 0) {
      return Math.round(35 + overlap * 30); // 35-65 based on partial fit
    }
  }

  // 4) No alignment
  return 22;
}

function buildReason(
  score: number,
  label: string,
  marketplaceName: string,
  missingReason: string
): string {
  if (score === 38) return missingReason;
  if (score >= 90) return `${label} au coeur du focus ${marketplaceName}.`;
  if (score >= 78) return `${label} directement aligne avec ${marketplaceName}.`;
  if (score >= 60) return `${label} acceptable pour ${marketplaceName}, pas prioritaire.`;
  if (score >= 40) return `${label} partiellement exploitable pour ${marketplaceName}.`;
  return `${label} en friction avec le focus ${marketplaceName}.`;
}

function scoreCategory(seller: Seller, profile: MarketplaceProfileRecord) {
  const sellerCategory = normalizeValue(seller.category?.label);
  const rawScore = continuousListScore(
    sellerCategory,
    normalizeArray(profile.focusCategories),
    []
  );
  const reason = sellerCategory
    ? buildReason(
        rawScore,
        `Categorie ${seller.category?.label || "seller"}`,
        profile.marketplaceName,
        "Categorie seller absente, lecture prudente."
      )
    : "Categorie seller absente, lecture prudente.";
  return { score: rawScore, reason };
}

function scoreGeography(seller: Seller, profile: MarketplaceProfileRecord) {
  const sellerCountry = normalizeValue(seller.country?.code || seller.country?.label);
  const rawScore = continuousListScore(
    sellerCountry,
    normalizeArray(profile.targetCountries),
    normalizeArray(profile.acceptedCountries)
  );
  const reason = sellerCountry
    ? buildReason(
        rawScore,
        `Pays ${seller.country?.code || seller.country?.label || "seller"}`,
        profile.marketplaceName,
        "Geo seller manquante, score neutralise."
      )
    : "Geo seller manquante, score neutralise.";
  return { score: rawScore, reason };
}

// Price tiers ordered: distance drives the score.
const PRICE_TIERS = ["budget", "mid", "premium", "luxury"];

function priceTierIndex(value: string): number {
  const normalized = normalizeValue(value);
  const idx = PRICE_TIERS.findIndex((tier) => normalized === tier || normalized.includes(tier));
  return idx;
}

function scorePrice(seller: Seller, profile: MarketplaceProfileRecord) {
  const sellerPrice = normalizeValue(seller.price_category?.label);
  if (!sellerPrice) {
    return { score: 40, reason: "Positionnement prix indisponible, score prudent." };
  }
  const preferred = normalizeArray(profile.priceBands);
  const accepted = normalizeArray(profile.acceptedPriceBands);
  if (preferred.length === 0 && accepted.length === 0) {
    return { score: 55, reason: "Profil prix marketplace absent, score neutre." };
  }

  const sellerTier = priceTierIndex(sellerPrice);
  const preferredIdxs = preferred.map(priceTierIndex).filter((i) => i >= 0);
  const acceptedIdxs = accepted.map(priceTierIndex).filter((i) => i >= 0);

  // Distance to closest preferred tier (continuous)
  if (sellerTier >= 0 && preferredIdxs.length > 0) {
    const minDist = Math.min(...preferredIdxs.map((i) => Math.abs(sellerTier - i)));
    if (minDist === 0) return { score: 94, reason: "Positionnement prix au coeur de la marketplace." };
    if (minDist === 1) return { score: 72, reason: "Positionnement prix proche du coeur de cible." };
    if (minDist === 2) return { score: 48, reason: "Positionnement prix eloigne, pilote exigeant." };
    return { score: 28, reason: "Positionnement prix en friction avec la marketplace." };
  }
  if (sellerTier >= 0 && acceptedIdxs.length > 0) {
    const minDist = Math.min(...acceptedIdxs.map((i) => Math.abs(sellerTier - i)));
    if (minDist === 0) return { score: 65, reason: "Positionnement prix dans la zone acceptable." };
    if (minDist === 1) return { score: 52, reason: "Positionnement prix proche de la zone acceptable." };
    return { score: 34, reason: "Positionnement prix en marge de l'acceptable." };
  }
  return { score: 30, reason: "Positionnement prix non aligne." };
}

function scoreCustomer(seller: Seller, profile: MarketplaceProfileRecord) {
  const sellerCustomer = normalizeValue(seller.customer_category?.label);
  const rawScore = continuousListScore(
    sellerCustomer,
    normalizeArray(profile.customerPositioning),
    ["unisex"]
  );
  const reason = sellerCustomer
    ? buildReason(
        rawScore,
        "Positionnement client",
        profile.marketplaceName,
        "Positionnement client absent, score neutre."
      )
    : "Positionnement client absent, score neutre.";
  return { score: rawScore, reason };
}

function scoreSeasonality(seller: Seller, profile: MarketplaceProfileRecord) {
  const seasonality = normalizeValue(seller.seasonality?.label);
  const preferred = normalizeArray(profile.seasonalMoments);
  if (!seasonality) {
    if (preferred.includes("always_on")) {
      return { score: 74, reason: "Approche always on compatible meme sans signal saisonnier vendeur." };
    }
    return { score: 50, reason: "Saisonnalite seller inconnue, score neutre." };
  }
  const rawScore = continuousListScore(seasonality, preferred, ["always_on"]);
  return {
    score: rawScore,
    reason: buildReason(
      rawScore,
      "Timing commercial",
      profile.marketplaceName,
      "Saisonnalite seller inconnue, score neutre."
    ),
  };
}

// Maps an Amazon SKU count to a continuous maturity score in [0, 26].
// Logarithmic curve: small differences at low counts matter a lot, then the
// curve flattens. Sweet spot ~100-500 SKUs. Beyond ~2000 we slightly *subtract*
// because the seller is likely a mass distributor, not a DTC brand fit for
// Mirakl Connect.
function amazonCountScore(count: number): number {
  if (count <= 0) return 0;
  // log2(count+1): 1→1, 10→3.5, 50→5.7, 100→6.7, 500→9.0, 1000→10.0, 2000→11.0, 5000→12.3
  const raw = Math.log2(count + 1);
  // Scale 0→26 with peak around count≈500 (raw≈9). Above that, slight decay.
  const peak = 9;
  const dist = Math.abs(raw - peak);
  const bounded = Math.max(0, 26 - dist * dist * 0.6);
  return Math.round(bounded * 10) / 10;
}

// New criterion: marketplaceSignals — measurable signals of marketplace readiness
// from Supabase columns (amazon_presence, amazon_product_count, enriched_at,
// company_domain, contact_email). Slight modulation by marketplace selectivity.
function scoreMarketplaceSignals(seller: Seller, profile: MarketplaceProfileRecord) {
  let score = 40;
  const reasons: string[] = [];

  // Amazon presence — continuous score, not bucketed
  if (seller.amazon_presence) {
    const count = seller.amazon_product_count ?? 0;
    const amzScore = amazonCountScore(count);
    score += amzScore;

    if (count >= 2000) {
      reasons.push(`presence Amazon massive (${count} SKUs)`);
    } else if (count >= 500) {
      reasons.push(`forte traction Amazon (${count} SKUs)`);
    } else if (count >= 100) {
      reasons.push(`presence Amazon confirmee (${count} SKUs)`);
    } else if (count > 0) {
      reasons.push(`presence Amazon ciblee (${count} SKUs)`);
    } else {
      reasons.push("presence Amazon detectee");
    }

    // Premium/selective marketplaces penalize heavy Amazon exposure —
    // smooth penalty that scales with SKU count above 500.
    const premiumHeavy = normalizeArray(profile.priceBands).some(
      (band) => band === "premium" || band === "luxury"
    );
    if (premiumHeavy && count > 500) {
      const penalty = Math.min(12, Math.log2(count / 500) * 4);
      score -= penalty;
      if (penalty >= 4) {
        reasons.push("Amazon mass peut freiner un pilote premium");
      }
    }
  }

  // Enrichment status: domain + contact
  if (seller.company_domain) {
    score += 8;
    reasons.push("domaine connu");
  }
  if (seller.enriched_at) {
    score += 6;
  }
  if (seller.contact_email) {
    score += 12;
    reasons.push("contact email identifie");
  }

  score = Math.max(0, Math.min(100, score));
  const reason = reasons.length > 0
    ? `Signaux marketplace : ${reasons.slice(0, 3).join(", ")}.`
    : "Signaux marketplace limites, enrichissement a renforcer.";
  return { score, reason };
}

function summarizeWhy(criteria: ScoreBreakdownItem[]) {
  return criteria.filter((item) => item.score >= 72).slice(0, 3).map((item) => item.reason);
}

function summarizeCautions(criteria: ScoreBreakdownItem[]) {
  return criteria.filter((item) => item.score < 55).slice(0, 2).map((item) => item.reason);
}

export function priorityFromScore(score: number): PriorityLevel {
  if (score >= 88) return "HOT";
  if (score >= 72) return "HIGH";
  if (score >= 55) return "MEDIUM";
  return "LOW";
}

export function createDefaultStrategy(): OutreachStrategy {
  return {
    method: OUTREACH_METHOD_OPTIONS[0].value,
    angle: OUTREACH_ANGLE_OPTIONS[0].value,
    seasonalMoment: SEASONAL_MOMENT_OPTIONS[0].value,
    emailGap1Days: 5,
    emailGap2Days: 7,
  };
}

function selectSeasonalMoment(seller: Seller, topRecommendation: MarketplaceScoreDetail | null) {
  const category = normalizeValue(seller.category?.label);
  const seasonality = normalizeValue(seller.seasonality?.label);
  if (seasonality && SEASONAL_MOMENT_OPTIONS.some((option) => option.value === seasonality)) {
    return seasonality;
  }
  if (category.includes("kids")) return "back_to_school";
  if (category.includes("beauty") || category.includes("accessories")) return "holiday_gifting";
  if (category.includes("fashion") || topRecommendation?.marketplaceName.toLowerCase().includes("fashion")) {
    return "fashion_drop";
  }
  return "always_on";
}

export function recommendStrategy(
  seller: Seller,
  topRecommendation: MarketplaceScoreDetail | null
): OutreachStrategy {
  const hasDomain = Boolean(seller.company_domain);
  const hotScore = (topRecommendation?.totalScore || 0) >= 88;
  const seasonalMoment = selectSeasonalMoment(seller, topRecommendation);

  return {
    method: hotScore
      ? "partner_intro"
      : hasDomain
        ? "linkedin_email"
        : "email_sequence",
    angle:
      topRecommendation?.criteria.find((item) => item.key === "seasonality")?.score || 0 > 75
        ? "seasonal_window"
        : (topRecommendation?.criteria.find((item) => item.key === "price")?.score || 0) > 80
          ? "market_fit"
          : seller.amazon_presence
            ? "competitive_gap"
            : "roi",
    seasonalMoment,
    emailGap1Days: 5,
    emailGap2Days: 7,
  };
}

export function buildEmailSequence(
  sellerName: string,
  strategy: OutreachStrategy,
  topRecommendation: MarketplaceScoreDetail | null
): DraftEmail[] {
  const marketplace = topRecommendation?.marketplaceName || "la marketplace cible";
  const angle = OUTREACH_ANGLE_OPTIONS.find((option) => option.value === strategy.angle)?.label || "Market fit";
  return [
    {
      id: `${sellerName}-mail-1`,
      mailNumber: 1,
      timing: "J0 - Premier contact",
      subject: `${sellerName} x ${marketplace} : premier fit`,
      body: `Bonjour, nous avons identifie un fit concret entre ${sellerName} et ${marketplace}. L'angle prioritaire serait ${angle}.`,
      status: "draft",
    },
    {
      id: `${sellerName}-mail-2`,
      mailNumber: 2,
      timing: "J+5 - Relance contextualisee",
      subject: `${sellerName} : approfondir l'opportunite ${marketplace}`,
      body: `Je reviens avec un score detaille et les points les plus convaincants pour ${marketplace}.`,
      status: "draft",
    },
    {
      id: `${sellerName}-mail-3`,
      mailNumber: 3,
      timing: "J+12 - Closing",
      subject: `${sellerName} : timing pour avancer ?`,
      body: `Si le timing est bon, nous pouvons cadrer un pilote marketplace plus precis autour de ${marketplace}.`,
      status: "draft",
    },
  ];
}

function buildSignals(seller: Seller, recommendation: MarketplaceScoreDetail | null): string[] {
  const signals: string[] = [];
  if (seller.amazon_presence) {
    signals.push(
      `Presence Amazon detectee${seller.amazon_product_count ? ` (${seller.amazon_product_count} produits)` : ""}.`
    );
  }
  if (seller.company_domain) {
    signals.push(`Domaine exploitable pour enrichissement: ${seller.company_domain}.`);
  }
  if (seller.contact_email) {
    signals.push(`Contact identifie: ${seller.contact_email}.`);
  }
  if (recommendation?.whyItMatches[0]) {
    signals.push(recommendation.whyItMatches[0]);
  }
  if (signals.length === 0) {
    signals.push("Match exploitable, mais enrichissement externe encore requis pour affiner les signaux.");
  }
  return signals.slice(0, 3);
}

function buildRecommendedContact(
  seller: Seller,
  recommendation: MarketplaceScoreDetail | null
): RecommendedContact {
  const role = recommendation?.rolesToScrape[0] || TARGET_ROLE_OPTIONS[0].value;
  return {
    role,
    linkedinHint: seller.company_domain
      ? `Rechercher ${role} chez ${seller.company_domain}`
      : `Rechercher ${role} via la page entreprise LinkedIn`,
  };
}

function scoreSellerAgainstMarketplace(
  seller: Seller,
  profile: MarketplaceProfileRecord
): MarketplaceScoreDetail {
  const scorers: Record<ScoreWeightKey, () => { score: number; reason: string }> = {
    category: () => scoreCategory(seller, profile),
    geography: () => scoreGeography(seller, profile),
    price: () => scorePrice(seller, profile),
    customer: () => scoreCustomer(seller, profile),
    seasonality: () => scoreSeasonality(seller, profile),
    marketplaceSignals: () => scoreMarketplaceSignals(seller, profile),
  };

  const criteria = CRITERIA_ORDER.map((key) => {
    const { score, reason } = scorers[key]();
    const weight = SCORE_WEIGHTS[key];
    const weightedScore = Math.round(score * weight) / 100;
    return {
      key,
      label: SCORE_LABELS[key],
      weight,
      score: Math.round(score),
      weightedScore: Math.round(weightedScore * 10) / 10,
      reason,
    };
  });

  const totalScore =
    Math.round(
      criteria.reduce((total, item) => total + item.score * item.weight, 0)
    ) / 100;

  return {
    marketplaceId: profile.id,
    marketplaceName: profile.marketplaceName,
    region: profile.region || "Global",
    totalScore,
    priority: priorityFromScore(totalScore),
    heroStat: profile.heroStat || `${Math.round(totalScore)} / 100 fit`,
    whyItMatches: summarizeWhy(criteria),
    cautions: summarizeCautions(criteria).length > 0
      ? summarizeCautions(criteria)
      : profile.caution
        ? [profile.caution]
        : ["Aucune friction majeure, mais enrichissement N8N encore non branche."],
    matchingSignals: [...profile.signals].slice(0, 3),
    rolesToScrape:
      profile.rolesToScrape.length > 0
        ? profile.rolesToScrape
        : TARGET_ROLE_OPTIONS.map((option) => option.value),
    criteria,
  };
}

export function computeCriteria(
  seller: Seller,
  marketplaceProfiles: MarketplaceProfileRecord[]
): SellerIntelligenceSnapshot {
  const operatorScores = marketplaceProfiles
    .map((profile) => scoreSellerAgainstMarketplace(seller, profile))
    .sort((left, right) => right.totalScore - left.totalScore);

  const topRecommendation = operatorScores[0] || null;
  const totalScore = topRecommendation?.totalScore || Math.round(seller.match_score || 0);
  const priority = priorityFromScore(totalScore);
  const strategy = recommendStrategy(seller, topRecommendation);
  const signals = buildSignals(seller, topRecommendation);
  const recommendedContact = buildRecommendedContact(seller, topRecommendation);
  const reasoningText = topRecommendation
    ? `${seller.seller_name} se positionne surtout pour ${topRecommendation.marketplaceName} grace a ${topRecommendation.whyItMatches[0]?.toLowerCase() || "un fit global solide"}.`
    : `${seller.seller_name} reste prometteur, mais les profils marketplaces enrichis sont encore incomplets.`;

  return {
    seller,
    totalScore,
    priority,
    reasoningText,
    scoreBreakdown: topRecommendation?.criteria || [],
    signals,
    strategy,
    recommendedContact,
    operatorScores,
    topRecommendation,
  };
}

function scoreBrandToMarketplace(
  brandProfile: MatchingBrandProfile,
  marketplace: MarketplaceProfileRecord
): MarketplaceRecommendation {
  const sellerLike: Seller = {
    id: brandProfile.companyDomain || brandProfile.brandName,
    seller_name: brandProfile.brandName,
    category_id: null,
    catalogue_size: brandProfile.catalogueExpectation[0] || null,
    distribution_type_id: null,
    season_type_id: null,
    country_id: null,
    price_category_id: null,
    customer_category_id: null,
    match_score: null,
    match_rationale: null,
    top_match_marketplace_id: null,
    amazon_presence: null,
    amazon_product_count: null,
    company_domain: brandProfile.companyDomain || null,
    status: null,
    enriched_at: null,
    created_at: null,
    category: brandProfile.focusCategories[0]
      ? { label: sentenceCase(brandProfile.focusCategories[0]) }
      : null,
    country: brandProfile.targetCountries[0]
      ? { label: brandProfile.targetCountries[0], code: brandProfile.targetCountries[0] }
      : null,
    price_category: brandProfile.priceBands[0]
      ? { label: brandProfile.priceBands[0] }
      : null,
    distribution_type: brandProfile.distributionModel[0]
      ? { label: brandProfile.distributionModel[0] }
      : null,
    customer_category: brandProfile.customerPositioning[0]
      ? { label: brandProfile.customerPositioning[0] }
      : null,
    seasonality: brandProfile.seasonalMoments[0]
      ? { label: brandProfile.seasonalMoments[0] }
      : null,
    marketplace: null,
  };

  const result = scoreSellerAgainstMarketplace(sellerLike, marketplace);
  return {
    marketplaceId: result.marketplaceId,
    marketplaceName: result.marketplaceName,
    score: result.totalScore,
    priority: result.priority,
    region: result.region,
    heroStat: result.heroStat,
    whyItMatches: result.whyItMatches,
    cautions: result.cautions,
    matchingSignals: result.matchingSignals,
    rolesToScrape: result.rolesToScrape,
    criteria: result.criteria,
  };
}

export function computeBrandToMarketplaceRanking(
  brandProfile: MatchingBrandProfile,
  marketplaceProfiles: MarketplaceProfileRecord[]
): MarketplaceRecommendation[] {
  return marketplaceProfiles
    .map((profile) => scoreBrandToMarketplace(brandProfile, profile))
    .sort((left, right) => right.score - left.score);
}
