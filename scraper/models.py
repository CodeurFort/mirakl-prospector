from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class Seller:
    name: str
    marketplace_source: str  # zalando, laredoute, galeries_lafayette, etc.
    brand_url: str = ""
    categories: List[str] = field(default_factory=list)
    price_range: str = ""  # budget (<30€), mid (30-100€), premium (100-300€), luxury (300€+)
    product_count: int = 0
    country: str = ""  # FR, DE, UK, US, etc.
    distribution_type: str = ""  # mono-brand, multi-brand
    rating: float = 0.0
    description: str = ""
    company_domain: str = ""


@dataclass
class ScoredSeller:
    name: str
    marketplaces: List[str] = field(default_factory=list)
    brand_urls: Dict = field(default_factory=dict)  # {marketplace: url}
    company_domain: str = ""
    categories: List[str] = field(default_factory=list)
    price_range: str = ""
    avg_product_count: int = 0
    country: str = ""
    distribution_type: str = ""
    avg_rating: float = 0.0
    # Scores
    score_category: float = 0.0
    score_price: float = 0.0
    score_catalog: float = 0.0
    score_multi_marketplace: float = 0.0
    score_geography: float = 0.0
    score_distribution: float = 0.0
    total_score: float = 0.0
    priority: str = ""  # HIGH, MEDIUM, LOW

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "marketplaces": ", ".join(self.marketplaces),
            "marketplace_count": len(self.marketplaces),
            "brand_urls": str(self.brand_urls),
            "categories": ", ".join(self.categories),
            "price_range": self.price_range,
            "avg_product_count": self.avg_product_count,
            "country": self.country,
            "distribution_type": self.distribution_type,
            "avg_rating": self.avg_rating,
            "score_category": round(self.score_category, 1),
            "score_price": round(self.score_price, 1),
            "score_catalog": round(self.score_catalog, 1),
            "score_multi_marketplace": round(self.score_multi_marketplace, 1),
            "score_geography": round(self.score_geography, 1),
            "score_distribution": round(self.score_distribution, 1),
            "total_score": round(self.total_score, 1),
            "priority": self.priority,
            "company_domain": self.company_domain,
        }
