import time
import re
from typing import List
from urllib.parse import urlparse
from duckduckgo_search import DDGS

from models import Seller
from config import MIRAKL_CATEGORIES
from .base import BaseSource


def extract_domain(url: str) -> str:
    """Extract clean domain from URL: 'https://www.sezane.com/fr' → 'sezane.com'"""
    try:
        netloc = urlparse(url).netloc
        return netloc.replace("www.", "").lower()
    except Exception:
        return ""


# Search queries — simple and natural, code-level filtering handles noise
SEARCH_QUERIES = {
    "fashion": [
        # FR
        "marque mode française indépendante boutique en ligne",
        "french fashion brand direct to consumer online shop",
        "marque streetwear française site officiel",
        "marque prêt-à-porter française indépendante e-shop",
        "sustainable fashion brand france acheter en ligne",
        "marque mode homme made in france boutique",
        "nouvelle marque mode femme française e-shop",
        "marque mode éthique française boutique en ligne",
        "jeune marque mode française livraison",
        # UK
        "british fashion brand independent online shop",
        "uk sustainable clothing brand e-commerce",
        "emerging british fashion brand buy online",
        "london fashion brand direct to consumer",
        # DE
        "deutsche Modemarke online shop nachhaltig",
        "german fashion brand direct to consumer",
        "nachhaltige Mode Marke Deutschland online kaufen",
        # IT
        "marca moda italiana indipendente shop online",
        "italian fashion brand e-commerce direct to consumer",
        "brand moda made in italy boutique online",
        # ES
        "marca moda española independiente tienda online",
        "spanish fashion brand direct to consumer",
        "marca ropa sostenible españa comprar online",
        # Scandinavia
        "scandinavian fashion brand online shop",
        "swedish fashion brand direct to consumer",
        "danish clothing brand e-commerce",
        # NL / BE
        "dutch fashion brand online store",
        "belgian fashion brand e-commerce",
    ],
    "beauty": [
        # FR
        "marque cosmétique naturelle française boutique en ligne",
        "indie beauty brand france e-commerce",
        "marque soins visage française vente en ligne",
        "french skincare brand online shop",
        "marque maquillage française indépendante",
        "niche perfume brand france buy online",
        "marque cosmétique bio française e-shop",
        # UK
        "british skincare brand independent online shop",
        "uk natural beauty brand e-commerce",
        "indie beauty brand london buy online",
        # DE
        "deutsche Naturkosmetik Marke online shop",
        "german skincare brand direct to consumer",
        # IT
        "marca cosmetica italiana online shop",
        "italian beauty brand e-commerce",
        # ES
        "marca cosmetica natural española tienda online",
        # Scandinavia
        "scandinavian beauty brand online shop",
    ],
    "footwear": [
        # FR
        "marque chaussures française artisanale boutique en ligne",
        "french sneaker brand online shop",
        "marque baskets made in france e-shop",
        "shoe brand made in europe e-commerce",
        "marque chaussures écoresponsable française",
        # UK
        "british shoe brand online shop handmade",
        "uk sneaker brand e-commerce",
        # IT
        "marca scarpe italiane artigianali shop online",
        "italian shoe brand e-commerce",
        # ES / PT
        "marca zapatos española artesanal tienda online",
        "portuguese shoe brand online shop",
    ],
    "accessories": [
        # FR
        "marque maroquinerie française artisanale e-shop",
        "french bag brand online store",
        "marque bijoux créateur français boutique en ligne",
        "marque accessoires mode française indépendante",
        "french jewelry brand e-commerce",
        # UK
        "british bag brand online shop leather",
        "uk jewelry brand independent e-commerce",
        # IT
        "marca borse italiana artigianale shop online",
        "italian leather goods brand e-commerce",
        # Scandinavia
        "scandinavian jewelry brand online shop",
        "danish design accessories e-commerce",
    ],
    "sports": [
        # FR
        "marque sport française indépendante boutique en ligne",
        "french activewear brand online shop",
        "marque yoga fitness france e-commerce",
        "marque running française site officiel",
        "marque sportswear française e-shop",
        # UK
        "british sportswear brand online shop",
        "uk activewear brand e-commerce",
        # Scandinavia
        "scandinavian outdoor brand online shop",
        "swedish sportswear brand e-commerce",
    ],
    "kids": [
        # FR
        "marque vêtements enfants française boutique en ligne",
        "french kids fashion brand online shop",
        "marque mode bébé française e-commerce",
        "marque vêtements bébé made in france",
        # UK
        "british kids clothing brand online shop",
        # Scandinavia
        "scandinavian kids fashion brand online",
        # ES / IT
        "marca ropa niños española tienda online",
        "italian kids fashion brand e-commerce",
    ],
    "luxury": [
        "french luxury brand e-commerce online shop",
        "marque luxe française indépendante boutique en ligne",
        "italian luxury fashion brand online shop",
        "british luxury designer brand e-commerce",
        "scandinavian luxury fashion brand online",
        "spanish luxury brand e-commerce",
    ],
}

# E-commerce signals — must appear in page text to confirm it's a brand site
ECOMMERCE_SIGNALS = [
    "boutique en ligne", "e-shop", "acheter", "ajouter au panier",
    "livraison", "delivery", "panier", "cart",
    "nouvelle collection", "soldes", "prêt-à-porter", "ready to wear",
    "made in france", "made in europe", "fabriqué en france",
    "livraison gratuite", "free shipping", "retours gratuits",
    "paiement sécurisé", "secure payment",
]

# Non-e-commerce signals — if ANY of these appear, REJECT
NON_ECOMMERCE_SIGNALS = [
    "apprendre", "learn", "cours", "wikipedia", "actualité", "news",
    "dictionary", "grammar", "exercise", "blog post", "article de presse",
    "avis sur", "review of", "top 10", "meilleur", "best of", "comparatif",
    "emploi", "job", "recrutement", "formation", "education",
    "liste des marques", "brand list", "brand directory", "classement",
    "top marques", "guide d'achat", "buying guide",
    "définition", "definition", "signification", "meaning",
    "dictionnaire", "wiktionary", "larousse", "robert",
    "synonyme", "synonym", "traduction", "translation",
]

# Generic words that CANNOT be a brand name (or part of one if they are the main content)
GENERIC_WORDS = {
    # French generic
    "vêtements", "vetements", "vêtement", "vetement", "accessoires", "accessoire",
    "chaussures", "chaussure", "bijoux", "sacs", "mode", "sport", "sports",
    "femme", "femmes", "homme", "hommes", "enfant", "enfants", "bébé", "bebe",
    "fille", "garçon", "pour", "les", "des", "une", "boutique", "collection",
    "vente", "achat", "shopping", "soldes", "promo", "promotion",
    "marque", "marques", "française", "français", "france",
    "luxe", "premium", "officiel", "officielle", "ligne", "online",
    "tenues", "tenue", "habits", "habit",
    # English generic
    "clothing", "clothes", "fashion", "accessories", "shoes", "bags",
    "women", "men", "kids", "baby", "brand", "brands", "shop", "store",
    "online", "buy", "sale", "collection", "official", "french",
    "sportswear", "activewear", "footwear", "jewelry", "beauty",
    "the", "best", "top", "new", "free", "delivery",
    # Extra rejects — product types, descriptors
    "définition", "definition", "définitions", "definitions",
    "créateur", "createur", "designer", "sac", "sandales", "sandals",
    "maroquinerie", "joaillerie", "horlogerie", "parfumerie",
    "lingerie", "maillots", "maillot", "lunettes", "montres", "montre",
    "made", "france", "europe", "paris", "in",
    "éthique", "écoresponsable", "bio", "naturel", "naturelle",
    "indépendante", "indépendant", "artisanale", "artisanal",
}


class WebSearchSource(BaseSource):
    source_name = "web_search"

    def discover(self, max_results: int = 100, categories: List[str] = None) -> List[Seller]:
        """Discover brands via DuckDuckGo web search."""
        print(f"\n{'='*60}")
        print(f"  Sourcing candidates via Web Search...")
        print(f"{'='*60}")

        if categories is None:
            categories = list(SEARCH_QUERIES.keys())

        candidates = []
        seen_domains = set()

        for category in categories:
            queries = SEARCH_QUERIES.get(category, [])
            print(f"\n  Category: {category} ({len(queries)} queries)")

            for query in queries:
                if len(candidates) >= max_results:
                    break

                print(f"    \"{query[:50]}...\"", end=" ")
                try:
                    with DDGS() as ddgs:
                        results = list(ddgs.text(query, max_results=10, region="fr-fr"))

                    found = 0
                    for r in results:
                        url = r.get("href", "")
                        title = r.get("title", "")
                        body = r.get("body", "")
                        combined = (title + " " + body).lower()

                        # Extract domain
                        domain = self._extract_domain(url)
                        if not domain or domain in seen_domains:
                            continue

                        # Skip known non-brand sites
                        if self._is_excluded_domain(domain):
                            continue

                        # Must look like an e-commerce / brand site
                        if not self._looks_like_brand(combined, url):
                            continue

                        # Extract brand name
                        brand_name = self._extract_brand_name(title, domain)
                        if not brand_name or len(brand_name) < 3:
                            continue

                        # Final check: brand name must not contain off-scope words
                        if self._is_off_scope_brand(brand_name):
                            continue

                        seen_domains.add(domain)
                        found += 1

                        seller = Seller(
                            name=brand_name,
                            marketplace_source="web_search",
                            brand_url=url,
                            categories=[category],
                            price_range=self._guess_price_range(combined),
                            country=self._guess_country(url, body),
                            distribution_type="mono-brand",
                            description=body[:200],
                            company_domain=extract_domain(url),
                        )
                        candidates.append(seller)

                    print(f"→ {found} brands")
                    time.sleep(1.5)

                except Exception as e:
                    print(f"Error: {e}")
                    time.sleep(3)

        print(f"\n  Total candidates from web search: {len(candidates)}")
        return candidates

    def _extract_domain(self, url: str) -> str:
        match = re.search(r"https?://(?:www\.)?([^/]+)", url)
        return match.group(1) if match else ""

    def _extract_brand_name(self, title: str, domain: str) -> str:
        """Extract a clean brand name from title or domain.

        Strategy: prefer domain-based name (more reliable), validate with title.
        A real brand name is a proper noun, not a description.
        """
        # 1. Try domain first — most reliable signal for a brand site
        domain_name = domain.split(".")[0]
        domain_clean = domain_name.replace("-", " ").strip()

        # 2. Try title before separator
        title_name = ""
        for sep in [" | ", " - ", " – ", " — ", " : "]:
            if sep in title:
                candidate = title.split(sep)[0].strip()
                if 2 < len(candidate) < 35:
                    title_name = candidate
                    break

        # 3. Validate: prefer title_name if it looks like a real brand, else use domain
        if title_name and self._is_valid_brand_name(title_name):
            return title_name

        # 4. Fallback: domain-based name
        if domain_clean and len(domain_clean) > 2 and self._is_valid_brand_name(domain_clean.title()):
            return domain_clean.title()

        return ""

    def _is_valid_brand_name(self, name: str) -> bool:
        """Strict validation: is this a plausible brand name?

        A brand name:
        - Is 2-35 characters
        - Has 1-4 words (not a sentence)
        - Does NOT consist mainly of generic/descriptive words
        - Does NOT look like a page title or category name
        """
        if not name or len(name) < 2 or len(name) > 35:
            return False

        words = name.lower().split()

        # Too many words = probably a description, not a brand
        if len(words) > 4:
            return False

        # Count how many words are generic
        generic_count = sum(1 for w in words if w in GENERIC_WORDS)

        # If ALL words are generic, it's not a brand ("Vêtements de sport pour femmes")
        non_generic = len(words) - generic_count
        if non_generic == 0:
            return False

        # If majority of words are generic (>60%), reject
        if len(words) >= 3 and generic_count / len(words) > 0.6:
            return False

        # Reject if it starts with a common article/preposition in context of descriptions
        first_lower = words[0]
        if first_lower in {"les", "des", "nos", "mes", "ces", "vos", "leurs", "tous", "toutes",
                           "our", "my", "all", "the", "best", "top", "new"}:
            # Unless the whole thing is 1-2 words and the second is not generic
            if len(words) == 1 or (len(words) >= 2 and words[1] in GENERIC_WORDS):
                return False

        # Reject common patterns that are clearly not brands
        name_lower = name.lower()
        reject_patterns = [
            r"^(vêtements?|accessoires?|chaussures?|bijoux|sacs?|mode)\s+(de|pour|du|des|et)\s+",
            r"^(clothing|shoes|bags|jewelry)\s+(for|and|from)\s+",
            r"^(french|marque|brand)\s+(de|du|des|sport|fashion|mode)",
            r"(sucks|wtf|lol|haha)",
            r"^(top|best|meilleur|guide|liste|comparatif|avis)\s+",
            r"^(définition|definition|signification|meaning)\b",
            # Name contains product category descriptions (e.g. "Crocs Chaussures & Sandales")
            r"(chaussures?|sandales?|baskets?|bottes?|vêtements?|accessoires?)\s*(et|&|,)\s*(chaussures?|sandales?|baskets?|bottes?|vêtements?|accessoires?)",
        ]
        for pattern in reject_patterns:
            if re.search(pattern, name_lower):
                return False

        return True

    def _is_off_scope_brand(self, name: str) -> bool:
        """Reject brands clearly outside Mirakl fashion/beauty/sports scope."""
        name_lower = name.lower()
        off_scope = [
            "librairie", "library", "books", "book", "livres", "livre",
            "restaurant", "café", "cafe", "traiteur", "boulangerie",
            "pharmacie", "pharmacy", "médecin", "dentiste", "clinique",
            "immobilier", "real estate", "assurance", "insurance", "banque", "bank",
            "auto", "voiture", "car", "garage", "pneu",
            "informatique", "computer", "software", "hosting", "hébergement",
            "plombier", "electricien", "serrurier", "dépannage",
            "supermarché", "supermarket", "grocery", "épicerie",
            "meuble", "furniture", "bricolage", "jardinage",
            "élégance", "elegance",
        ]
        return any(word in name_lower for word in off_scope)

    def _is_excluded_domain(self, domain: str) -> bool:
        """Exclude marketplaces, retailers, media, aggregators, and non-commerce sites."""
        excluded = [
            # Major marketplaces
            "zalando", "laredoute", "galerieslafayette", "johnlewis",
            "debenhams", "bloomingdales", "nordstrom", "amazon",
            "ebay", "etsy", "asos", "shein", "aliexpress", "wish",
            "aboutyou", "veepee", "showroomprive", "brandalley",
            "cdiscount", "fnac", "darty", "manomano", "spartoo",
            "sarenza", "boohoo", "prettylittlething", "misguided",
            "farfetch", "yoox", "net-a-porter", "mytheresa", "matchesfashion",
            "24sevres", "ssense", "revolve", "zappos", "6pm",
            # Big retailers / supermarkets / chains
            "tesco", "dunelm", "argos", "asda", "sainsburys", "morrisons",
            "waitrose", "ocado", "carrefour", "auchan", "leclerc", "lidl",
            "aldi", "monoprix", "franprix", "intermarche", "casino",
            "walmart", "target", "costco", "ikea", "hm", "zara", "uniqlo",
            "primark", "kiabi", "orchestra", "decathlon", "intersport",
            "go-sport", "courir", "footlocker", "jdsports",
            "sephora", "nocibe", "marionnaud", "thebodyshop",
            # Books / non-fashion
            "worldofbooks", "lireka", "fnac", "amazon", "abebooks",
            "bookdepository", "decitre", "cultura", "gibert",
            # Social
            "facebook", "instagram", "twitter", "tiktok", "youtube",
            "pinterest", "linkedin", "reddit", "threads", "snapchat",
            # Media / Info / Blogs
            "wikipedia", "vogue", "elle", "glamour", "cosmopolitan",
            "marieclaire", "madame.lefigaro", "journaldesfemmes",
            "google", "bing", "duckduckgo", "yahoo",
            "lemonde", "lefigaro", "bfmtv", "forbes", "businessinsider",
            "huffpost", "20minutes", "franceinfo", "medium.com",
            "substack", "blogspot", "wordpress.com", "tumblr",
            # Platforms / Tools
            "shopify.com", "squarespace", "wix", "wordpress",
            "trustpilot", "tripadvisor", "yelp", "glassdoor",
            "notion.so", "github", "gitlab",
            # Directories / Aggregators / Lists
            "madein-france.fr", "marquedefrance", "lafrenchfab",
            "pagesjaunes", "societe.com", "infogreffe",
            "lsa-conso", "fashionnetwork", "journalduluxe",
            "modemonline", "stylight", "lyst", "tagwalk",
            "thingiverse", "stlfinder", "3dprint",
        ]
        return any(ex in domain.lower() for ex in excluded)

    def _looks_like_brand(self, text: str, url: str) -> bool:
        """Check if the result looks like an actual e-commerce brand site."""
        # Reject aggregator / directory / blog pages
        has_non_ecommerce = any(sig in text for sig in NON_ECOMMERCE_SIGNALS)
        if has_non_ecommerce:
            return False

        # Must have at least 1 e-commerce signal
        has_ecommerce = any(sig in text for sig in ECOMMERCE_SIGNALS)
        if not has_ecommerce:
            return False

        # URL should look like a brand's own site, not a subpage of a directory
        url_lower = url.lower()
        if any(p in url_lower for p in ["/top-", "/best-", "/liste", "/classement",
                                         "/guide/", "/blog/", "/article/", "/news/",
                                         "/marques/", "/brands/", "/directory/"]):
            return False

        return True

    def _guess_price_range(self, text: str) -> str:
        if any(w in text for w in ["luxe", "luxury", "premium", "haute", "designer", "haut de gamme"]):
            return "premium"
        elif any(w in text for w in ["accessible", "abordable", "petit prix", "budget", "pas cher"]):
            return "budget"
        return "mid"

    def _guess_country(self, url: str, text: str) -> str:
        text_lower = text.lower()
        if ".fr" in url or "france" in text_lower or "français" in text_lower or "made in france" in text_lower:
            return "FR"
        elif ".de" in url or "germany" in text_lower or "deutschland" in text_lower:
            return "DE"
        elif ".co.uk" in url or "british" in text_lower or "uk" in text_lower:
            return "UK"
        elif ".it" in url or "italia" in text_lower:
            return "IT"
        elif ".es" in url or "españa" in text_lower:
            return "ES"
        return "EU"
