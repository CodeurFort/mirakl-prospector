export interface Seller {
  id: string;
  seller_name: string;
  category_id: string | null;
  catalogue_size: string | null;
  distribution_type_id: string | null;
  season_type_id: string | null;
  country_id: string | null;
  price_category_id: string | null;
  customer_category_id: string | null;
  match_score: number | null;
  match_rationale: string | null;
  top_match_marketplace_id: string | null;
  amazon_presence: boolean | null;
  amazon_product_count: number | null;
  company_domain: string | null;
  status: string | null;
  enriched_at: string | null;
  created_at: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_job_title?: string | null;
  contact_linkedin?: string | null;
  contact_confidence?: number | null;
  category?: { label: string } | null;
  country?: { label: string; code: string } | null;
  price_category?: { label: string } | null;
  distribution_type?: { label: string } | null;
  customer_category?: { label: string } | null;
  seasonality?: { label: string } | null;
  marketplace?: { "marketplace name": string } | null;
}

export interface Marketplace {
  id: string;
  "marketplace name": string;
  description: string | null;
  categories: string | null;
}

export interface RefCategory {
  id: string;
  label: string;
}

export interface RefCountry {
  id: string;
  label: string;
  code: string;
}

export interface RefOption {
  id: string;
  label: string;
}

export interface MarketplaceProfile {
  name: string;
  preferred_categories: string[];
  preferred_prices: string[];
  accepted_prices: string[];
  preferred_countries: string[];
  accepted_countries: string[];
  min_catalog: number;
  known_brands?: string[];
  description?: string;
}

export interface EmailSequence {
  mail1: GeneratedEmail;
  mail2: GeneratedEmail;
  mail3: GeneratedEmail;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
  timing: string;
  mailNumber: number;
}

export interface ROIEstimate {
  timesSavedPerMonth: number;
  costWithoutMirakl: number;
  costWithMirakl: number;
  monthlySavings: number;
  revenueUpliftPercent: string;
  eligibleMarketplaces: number;
}

export interface CompetitorAnalysis {
  competitors: {
    name: string;
    presentOn: string[];
  }[];
  marketTrend: string;
}

export type {
  ActiveTab,
  AnalysisKind,
  DraftEmail,
  MarketplaceProfileRecord,
  MarketplaceRecommendation,
  MatchingBrandProfile,
  OutreachStrategy,
  PipelineStage,
  PriorityLevel,
  ProspectionMode,
  RecommendedContact,
  ScoreBreakdownItem,
  ScoreWeightKey,
  SellerCampaignRecord,
  SellerIntelligenceSnapshot,
  SpecificCampaign,
  WorkspaceAnalysis,
} from "./bdr-engine";

export type SellerRecord = import("./bdr-engine").SellerCampaignRecord;
export type ScoredSellerResult = import("./bdr-engine").MarketplaceRecommendation;
