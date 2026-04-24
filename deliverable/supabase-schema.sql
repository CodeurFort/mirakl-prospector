-- Mirakl Prospector — Supabase schema
-- Generated from the live production database (project bugplcpxjpyapoatrrzz).
-- Run this in a fresh Supabase project to recreate the structure.
--
-- Ref tables (ref_*) hold typed lookup values used by foreign keys on
-- `sellers`. `marketplaces` holds the 7 target operators. The scoring
-- engine also supports an optional `marketplace_matching_profiles` table;
-- if not present the app falls back to BUILTIN_PROFILES defined in
-- src/lib/supabase-matching.ts.

-- ═══════════════════════════════════════════════════════════════════════
-- REF TABLES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ref_product_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_price_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_countries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_customer_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_distribution_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_seasonality (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref_company_sizes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text NOT NULL UNIQUE,
  code       text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- MARKETPLACES
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketplaces (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "marketplace name" text NOT NULL,
  description      text,
  categories       text,
  "markeplace url" text,
  created_at       timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- SELLERS
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sellers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_name              text NOT NULL,
  company_domain           text,

  -- Typed lookup FKs
  category_id              uuid REFERENCES ref_product_categories(id),
  subcategory_id           uuid,
  price_category_id        uuid REFERENCES ref_price_categories(id),
  country_id               uuid REFERENCES ref_countries(id),
  customer_category_id     uuid REFERENCES ref_customer_categories(id),
  distribution_type_id     uuid REFERENCES ref_distribution_types(id),
  season_type_id           uuid REFERENCES ref_seasonality(id),
  company_size_id          uuid REFERENCES ref_company_sizes(id),

  -- Free-form
  catalogue_size           text,
  campaign_id              uuid,

  -- Scoring output (refreshed by /api/scrape-seller)
  match_score              numeric,
  match_rationale          text,
  top_match_marketplace_id uuid REFERENCES marketplaces(id),

  -- Marketplace signals
  amazon_presence          boolean,
  amazon_product_count     integer,

  -- Enrichment output
  contact_name             text,
  contact_email            text,
  contact_linkedin         text,
  contact_job_title        text,
  contact_confidence       integer,

  -- Lifecycle
  status                   text,
  enriched_at              timestamptz,
  created_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sellers_seller_name_idx      ON sellers (lower(seller_name));
CREATE INDEX IF NOT EXISTS sellers_company_domain_idx   ON sellers (lower(company_domain));
CREATE INDEX IF NOT EXISTS sellers_match_score_idx      ON sellers (match_score DESC);
CREATE INDEX IF NOT EXISTS sellers_enriched_at_idx      ON sellers (enriched_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- OPTIONAL — marketplace_matching_profiles
-- App falls back to hard-coded BUILTIN_PROFILES if this table is empty.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketplace_matching_profiles (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_name       text NOT NULL,
  description            text,
  region                 text,
  focus_categories       text[],
  price_bands            text[],
  accepted_price_bands   text[],
  target_countries       text[],
  accepted_countries     text[],
  customer_positioning   text[],
  catalogue_expectation  text[],
  distribution_preferences text[],
  seasonal_moments       text[],
  company_size_fit       text[],
  hero_stat              text,
  caution                text,
  roles_to_scrape        text[],
  signals                text[],
  created_at             timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO ref_product_categories (label) VALUES
  ('Fashion'), ('Beauty'), ('Footwear'), ('Accessories'),
  ('Sports'), ('Kids'), ('Luxury'), ('Home & Wellness')
ON CONFLICT (label) DO NOTHING;

INSERT INTO ref_price_categories (label) VALUES
  ('Budget (<30€)'), ('Mid-range (30-100€)'), ('Premium (100-300€)'), ('Luxury (300€+)')
ON CONFLICT (label) DO NOTHING;

INSERT INTO ref_countries (label, code) VALUES
  ('France','FR'), ('Germany','DE'), ('Italy','IT'), ('Spain','ES'),
  ('Netherlands','NL'), ('Belgium','BE'), ('United Kingdom','UK'),
  ('United States','US'), ('Sweden','SE'), ('Denmark','DK'),
  ('Portugal','PT'), ('Austria','AT'), ('Poland','PL'), ('European Union','EU')
ON CONFLICT (label) DO NOTHING;

INSERT INTO ref_customer_categories (label) VALUES
  ('Women'), ('Men'), ('Kids'), ('Unisex'), ('Baby')
ON CONFLICT (label) DO NOTHING;

INSERT INTO ref_distribution_types (label) VALUES
  ('Mono-brand'), ('Multi-brand')
ON CONFLICT (label) DO NOTHING;

INSERT INTO ref_seasonality (label) VALUES
  ('All-season'), ('Spring/Summer'), ('Fall/Winter'), ('Holiday')
ON CONFLICT (label) DO NOTHING;

-- NOTE: marketplace rows (Zalando, La Redoute, etc.) are seeded via
-- src/lib/supabase-matching.ts BUILTIN_PROFILES if this table is empty.
-- See deliverable/marketplace-profiles.json for the full list.
