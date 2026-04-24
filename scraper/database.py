from typing import List, Dict, Optional
import csv
import os
from datetime import datetime

from models import ScoredSeller
from config import SUPABASE_URL, SUPABASE_KEY


def export_csv(sellers: List[ScoredSeller], output_dir: str = ".") -> str:
    """Export scored sellers to CSV file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(output_dir, f"mirakl_sellers_{timestamp}.csv")

    if not sellers:
        print("  [!] No sellers to export")
        return ""

    fieldnames = list(sellers[0].to_dict().keys())

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for seller in sellers:
            writer.writerow(seller.to_dict())

    print(f"  CSV exported: {filename} ({len(sellers)} sellers)")
    return filename


# ---- Supabase UUID mapping ----

def _load_ref_tables(client) -> Dict[str, Dict]:
    """Load all reference tables and build lookup dicts."""
    refs = {}

    # Categories: label -> id
    r = client.table("ref_product_categories").select("id, label").execute()
    refs["categories"] = {row["label"].lower(): row["id"] for row in r.data}

    # Countries: code -> id
    r = client.table("ref_countries").select("id, label, code").execute()
    refs["countries"] = {row["code"]: row["id"] for row in r.data}

    # Distribution types: label -> id
    r = client.table("ref_distribution_types").select("id, label").execute()
    refs["dist_types"] = {row["label"].lower(): row["id"] for row in r.data}

    # Price categories: label -> id
    r = client.table("ref_price_categories").select("id, label").execute()
    refs["prices"] = {row["label"].lower(): row["id"] for row in r.data}

    # Company sizes: label -> id
    r = client.table("ref_company_sizes").select("id, label").execute()
    refs["sizes"] = {row["label"].lower(): row["id"] for row in r.data}

    # Customer categories: label -> id
    r = client.table("ref_customer_categories").select("id, label").execute()
    refs["customers"] = {row["label"].lower(): row["id"] for row in r.data}

    # Seasonality: label -> id
    r = client.table("ref_seasonality").select("id, label").execute()
    refs["seasons"] = {row["label"].lower(): row["id"] for row in r.data}

    # Marketplaces: name -> id (column name has a space, must quote for PostgREST)
    r = client.table("marketplaces").select('id, "marketplace name"').execute()
    refs["marketplaces"] = {row.get("marketplace name", "").lower(): row["id"] for row in r.data}

    return refs


def _map_category(categories: List[str], refs: Dict) -> Optional[str]:
    """Map our category labels to ref_product_categories UUID."""
    mapping = {
        "fashion": "fashion",
        "beauty": "beauty",
        "footwear": "footwear",
        "accessories": "accessories",
        "sports": "sports",
        "kids": "kids",
        "luxury": "luxury",
        "home": "home & wellness",
    }
    for cat in categories:
        key = mapping.get(cat.lower(), cat.lower())
        if key in refs["categories"]:
            return refs["categories"][key]
    return refs["categories"].get("fashion")  # default


def _map_country(country: str, refs: Dict) -> Optional[str]:
    """Map country code to ref_countries UUID."""
    return refs["countries"].get(country, refs["countries"].get("EU"))


def _map_price(price_range: str, refs: Dict) -> Optional[str]:
    """Map price range to ref_price_categories UUID."""
    mapping = {
        "budget": "budget (<30€)",
        "mid": "mid-range (30-100€)",
        "premium": "premium (100-300€)",
        "luxury": "luxury (300€+)",
    }
    key = mapping.get(price_range, "mid-range (30-100€)")
    return refs["prices"].get(key)


def _map_distribution(dist_type: str, refs: Dict) -> Optional[str]:
    """Map distribution type to ref_distribution_types UUID."""
    if "multi" in dist_type.lower():
        return refs["dist_types"].get("multi-brand")
    return refs["dist_types"].get("mono-brand")


def _map_marketplace(marketplace_name: str, refs: Dict) -> Optional[str]:
    """Map marketplace key to marketplaces UUID."""
    name_mapping = {
        "zalando": "zalando",
        "laredoute": "la redoute",
        "galeries_lafayette": "galerie lafayette",
        "john_lewis": "john lewis",
        "debenhams": "debenhams",
        "bloomingdales": "bloomingdales",
        "nordstrom": "nordstrom",
    }
    mp_name = name_mapping.get(marketplace_name, marketplace_name)
    return refs["marketplaces"].get(mp_name)


def _map_catalogue_size(product_count: int) -> str:
    """Map product count to a descriptive catalogue size."""
    if product_count >= 500:
        return "Large (500+)"
    elif product_count >= 100:
        return "Medium (100-500)"
    elif product_count >= 10:
        return "Small (10-100)"
    elif product_count > 0:
        return "Micro (<10)"
    return "Unknown"


def _seller_to_row(seller: ScoredSeller, refs: Dict) -> Dict:
    """Convert a ScoredSeller to a Supabase sellers row with proper UUIDs."""
    # Best marketplace from per-marketplace scoring
    best_mp = getattr(seller, '_best_marketplace', '')
    rationale = getattr(seller, '_rationale', '')

    return {
        "seller_name": seller.name,
        "category_id": _map_category(seller.categories, refs),
        "catalogue_size": _map_catalogue_size(seller.avg_product_count),
        "distribution_type_id": _map_distribution(seller.distribution_type, refs),
        "season_type_id": refs["seasons"].get("all-season"),
        "country_id": _map_country(seller.country, refs),
        "price_category_id": _map_price(seller.price_range, refs),
        "customer_category_id": refs["customers"].get("unisex"),
        "match_score": seller.total_score,
        "match_rationale": rationale,
        "top_match_marketplace_id": _map_marketplace(best_mp, refs),
        "amazon_presence": getattr(seller, '_amazon_presence', False),
        "amazon_product_count": getattr(seller, '_amazon_product_count', 0),
        "company_domain": seller.company_domain if seller.company_domain else None,
        "status": "pending",
    }


def export_supabase(sellers: List[ScoredSeller], table_name: str = "sellers") -> bool:
    """Export scored sellers to Supabase with proper UUID foreign keys.

    Skips sellers that already exist (by seller_name) to avoid duplicates.
    Does NOT delete existing data.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  [!] Supabase credentials not set — skipping DB export")
        return False

    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Load reference tables for UUID mapping
        print("  Loading reference tables...")
        refs = _load_ref_tables(client)

        # Fetch existing seller names to avoid duplicates
        print("  Fetching existing sellers...")
        existing = set()
        page_size = 1000
        offset = 0
        while True:
            r = client.table(table_name).select("seller_name").range(offset, offset + page_size - 1).execute()
            if not r.data:
                break
            for row in r.data:
                name = (row.get("seller_name") or "").strip().lower()
                if name:
                    existing.add(name)
            if len(r.data) < page_size:
                break
            offset += page_size
        print(f"  {len(existing)} sellers already in DB")

        # Map sellers to Supabase rows, skip existing
        rows = []
        skipped = 0
        for s in sellers:
            name_key = s.name.strip().lower()
            if name_key in existing:
                skipped += 1
                continue
            row = _seller_to_row(s, refs)
            rows.append(row)
            existing.add(name_key)  # prevent intra-batch duplicates

        print(f"  {skipped} sellers skipped (already in DB)")
        print(f"  {len(rows)} new sellers to insert")

        if not rows:
            print("  Nothing new to insert.")
            return True

        # Insert in batches
        batch_size = 50
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            client.table(table_name).insert(batch).execute()
            print(f"  Supabase: inserted batch {i // batch_size + 1} ({len(batch)} rows)")

        print(f"  Supabase: {len(rows)} new sellers added (total in DB: {len(existing)})")
        return True

    except ImportError:
        print("  [!] supabase package not installed — run: pip install supabase")
        return False
    except Exception as e:
        print(f"  [!] Supabase error: {e}")
        return False


def backfill_domains(sellers: List[ScoredSeller], table_name: str = "sellers") -> bool:
    """Update company_domain for existing sellers that have NULL domain."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  [!] Supabase credentials not set")
        return False

    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Build lookup: seller_name (lower) -> company_domain
        domain_map = {}
        for s in sellers:
            if s.company_domain:
                domain_map[s.name.strip().lower()] = s.company_domain

        # Fetch sellers with NULL domain
        r = client.table(table_name).select("id, seller_name").is_("company_domain", "null").execute()
        to_update = r.data or []
        print(f"  {len(to_update)} sellers with NULL domain in DB")

        updated = 0
        for row in to_update:
            name_key = (row.get("seller_name") or "").strip().lower()
            domain = domain_map.get(name_key)
            if domain:
                client.table(table_name).update({"company_domain": domain}).eq("id", row["id"]).execute()
                updated += 1

        print(f"  Backfilled {updated} domains")
        return True

    except Exception as e:
        print(f"  [!] Backfill error: {e}")
        return False
