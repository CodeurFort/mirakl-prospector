# Scoring engine

Pure TypeScript, lives in [`src/lib/bdr-engine.ts`](../src/lib/bdr-engine.ts). Runs both on the server (in `/api/scrape-seller`) and on the client (the bulk dashboard re-scores on filter changes).

## The 6 criteria

Each seller is scored against each marketplace profile on 6 dimensions. Every dimension returns a score 0–100; the total is a weighted sum.

| Key | Weight | Source (seller) | Source (marketplace) |
|---|---|---|---|
| `category` | 28 | `category.label` | `focusCategories` |
| `geography` | 22 | `country.code` / `country.label` | `targetCountries` + `acceptedCountries` |
| `price` | 16 | `price_category.label` | `priceBands` + `acceptedPriceBands` |
| `customer` | 14 | `customer_category.label` | `customerPositioning` |
| `seasonality` | 10 | `seasonality.label` | `seasonalMoments` |
| `marketplaceSignals` | 10 | `amazon_presence`, `amazon_product_count`, `company_domain`, `enriched_at`, `contact_email` | `priceBands` (selectivity modifier) |

Total weight = **100**.

## Why these 6 (and not more)

The previous version had 8 criteria including `catalogue` (size) and `distribution` (mono vs multi-brand) and `companySize`. We dropped them because:

- `catalogue_size` in Supabase is unreliable (hard to scrape, often null)
- `distribution_type` (mono/multi-brand) isn't a useful discriminant — almost every DTC brand is mono-brand, almost every aggregator is multi-brand, so it doesn't separate sellers
- `companySize` was derived from `catalogue_size` → same signal twice

`marketplaceSignals` replaces them with something we can actually measure: **Amazon presence** (live scraped), **enrichment status** (domain known, contact found), **email confirmed**.

## Continuous vs bucketed scoring

The old engine returned only 4 discrete values per criterion (95, 72, 45, 32 — a hit/accepted/missing/miss bucket). With 8 criteria × 4 buckets, totals clustered tightly around 60–75.

The new engine uses **continuous** scoring:

### `continuousListScore` (used by category, customer, seasonality)

Returns a score in `[0, 100]` based on four passes:

1. **Exact hit on preferred list** — score scales with position in the list: first match → ~98, tail → ~78.
2. **Exact hit on accepted list** — 60–70 range, again position-weighted.
3. **Token-level overlap** — tokenises seller value and target values on `\s,;/&|()`; intersection ratio maps to 35–65.
4. **No alignment** — 22.

Missing seller data returns a prudent 38 (not 0) — don't penalise hard when a field is unknown.

### Price tier distance

Price uses an ordered tier list `[budget, mid, premium, luxury]`. Score by distance to nearest preferred tier:

| Distance | Preferred | Accepted |
|---|---|---|
| 0 | 94 | 65 |
| 1 | 72 | 52 |
| 2 | 48 | 34 |
| 3 | 28 | — |

### Geography

Same logic as category but with two lists (target + accepted countries). Exact hit on target → 78–98 depending on priority; accepted → 60–70; token overlap → 35–65.

### Marketplace signals (the only one that touches seller-only data)

Starts at baseline 40 and adjusts:

| Signal | Adjustment |
|---|---|
| Amazon presence with ≥500 SKUs | +24 |
| Amazon presence with ≥100 SKUs | +18 |
| Amazon presence with ≥1 SKU | +10 to +12 |
| Premium/luxury marketplace + heavy Amazon (≥500 SKUs) | −6 (over-exposure penalty) |
| `company_domain` known | +8 |
| `enriched_at` populated | +6 |
| `contact_email` populated | +12 |

Clamped to `[0, 100]`.

## Total computation

```
totalScore = Σ (criterion.score × criterion.weight) / 100
```

Priority mapping:

| Score | Priority |
|---|---|
| ≥ 88 | HOT |
| ≥ 72 | HIGH |
| ≥ 55 | MEDIUM |
| < 55 | LOW |

## Why the gate exists

Before scoring, `/api/scrape-seller` runs `classifyBrandScope` (OpenAI) with `temperature=0`. Only brands confirmed as in-scope (fashion, beauty, accessories, sports, kids, luxury, home, footwear) reach the scorer. Out-of-scope brands (Michelin, Total, Samsung) short-circuit with `outOfScope: true` and never touch Supabase.

This is critical: without it, the regex-based classifier silently defaulted to `category=fashion` for any brand where no keyword matched, polluting the table and skewing scores.

## Example

Seller: **AGMES** — NY fine jewelry brand, domain `agmesnyc.com`.

OpenAI classification → `category=accessories`, `priceBand=luxury`, `country=US`, `inScope=true`.

Scoring against Bloomingdales (`priceBands=[premium, luxury]`, `targetCountries=[US]`, `customerPositioning=[women, men]`) :

| Criterion | Score | Weighted |
|---|---|---|
| category (accessories in focus) | 98 | 27.4 |
| geography (US in target) | 98 | 21.6 |
| price (luxury in preferred) | 94 | 15.0 |
| customer (luxury positioning) | 72 | 10.1 |
| seasonality (always_on) | 74 | 7.4 |
| marketplaceSignals (no Amazon, domain known) | 48 | 4.8 |
| **Total** | | **86.3** |

Priority → HIGH (just under HOT threshold).

## Extending

To add a new criterion:

1. Add the key to `ScoreWeightKey` in `bdr-engine.ts`
2. Rebalance weights so they still sum to 100
3. Write a `scoreXxx(seller, profile)` function returning `{score, reason}`
4. Register in the `scorers` map inside `scoreSellerAgainstMarketplace`
5. Add label to `SCORE_LABELS` and `CRITERIA_ORDER`

Nothing else needs to change — the UI renders criteria dynamically.
