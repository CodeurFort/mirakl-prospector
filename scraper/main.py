#!/usr/bin/env python3
"""
Mirakl Scraper — Hackathon Mirakl x Eugenia School

Mission : trouver des vendeurs compatibles pour les 7 marketplaces Mirakl
et scorer chaque couple (seller × marketplace) individuellement.

Pipeline :
  1. Charger les listes de marques des 7 marketplaces
  2. Sourcer des candidats (DTC brands + web search + Amazon FR)
  3. Scorer chaque candidat contre chaque marketplace (exclusion per-marketplace)
  4. Exporter vers Supabase + CSV
"""
import sys
import argparse
from datetime import datetime
from typing import List

from sources import ALL_SOURCES
from marketplace_filter import load_marketplace_brands
from scoring import merge_and_score
from database import export_csv, export_supabase, backfill_domains
from amazon_check import check_amazon_presence
from models import Seller
from config import MARKETPLACE_PROFILES


def main():
    parser = argparse.ArgumentParser(
        description="Find new sellers for Mirakl Connect marketplaces"
    )
    parser.add_argument(
        "--sources", "-s",
        nargs="+",
        choices=list(ALL_SOURCES.keys()) + ["all"],
        default=["dtc_brands", "web_search"],
        help="Candidate sources (default: dtc_brands web_search)",
    )
    parser.add_argument(
        "--max-candidates", "-n",
        type=int,
        default=500,
        help="Max candidates per source (default: 500)",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Force refresh marketplace brand lists (ignore cache)",
    )
    parser.add_argument(
        "--no-supabase",
        action="store_true",
        help="Skip Supabase export",
    )
    parser.add_argument(
        "--output-dir", "-o",
        default=".",
        help="Output directory for CSV (default: current dir)",
    )
    args = parser.parse_args()

    sources_to_run = list(ALL_SOURCES.keys()) if "all" in args.sources else args.sources

    print(f"\n{'#'*60}")
    print(f"  MIRAKL PROSPECT FINDER")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Sources: {', '.join(sources_to_run)}")
    print(f"  Max candidates per source: {args.max_candidates}")
    print(f"{'#'*60}")

    # =========================================================
    # Phase 1 : Charger les marques des 7 marketplaces
    # =========================================================
    print(f"\n{'='*60}")
    print(f"  PHASE 1 : Chargement des marques existantes (7 marketplaces)")
    print(f"{'='*60}")

    marketplace_brands = load_marketplace_brands(use_cache=not args.no_cache)

    for mp, brands in marketplace_brands.items():
        print(f"    {mp:<25} {len(brands):>5} marques")

    # =========================================================
    # Phase 2 : Sourcer des candidats
    # =========================================================
    print(f"\n{'='*60}")
    print(f"  PHASE 2 : Sourcing candidats")
    print(f"{'='*60}")

    all_candidates: List[Seller] = []

    for source_key in sources_to_run:
        source_class = ALL_SOURCES[source_key]
        source = source_class()
        try:
            candidates = source.discover(max_results=args.max_candidates)
            all_candidates.extend(candidates)
        except Exception as e:
            print(f"\n  [X] Error with source {source_key}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\n  Total candidats bruts : {len(all_candidates)}")

    if not all_candidates:
        print("\n  Aucun candidat trouvé. Vérifie ta connexion ou tes clés API.")
        sys.exit(1)

    # =========================================================
    # Phase 3 : Scoring per-marketplace (avec exclusion intégrée)
    # =========================================================
    print(f"\n{'='*60}")
    print(f"  PHASE 3 : Scoring par marketplace")
    print(f"{'='*60}")

    scored = merge_and_score(all_candidates, marketplace_brands)

    high = [s for s in scored if s.priority == "HIGH"]
    medium = [s for s in scored if s.priority == "MEDIUM"]
    low = [s for s in scored if s.priority == "LOW"]

    print(f"  Candidats uniques scorés : {len(scored)}")
    print(f"  HIGH (≥70) :  {len(high)}")
    print(f"  MEDIUM (50-69) : {len(medium)}")
    print(f"  LOW (<50) :   {len(low)}")

    # Per-marketplace breakdown
    print(f"\n  PROSPECTS PAR MARKETPLACE :")
    print(f"  {'Marketplace':<25} {'Prospects':>10} {'Déjà présents':>15}")
    print(f"  {'-'*55}")

    for mp_key in MARKETPLACE_PROFILES:
        mp_name = MARKETPLACE_PROFILES[mp_key]["name"]
        prospects = sum(1 for s in scored if mp_key in getattr(s, '_mp_scores', {}))
        already = sum(1 for s in scored if mp_key in getattr(s, '_present_on', set()))
        # Also count those globally excluded (not in scored at all)
        excluded_count = len(marketplace_brands.get(mp_key, set()))
        print(f"  {mp_name:<25} {prospects:>10} {already:>15}")

    # Top 20
    print(f"\n  TOP 20 PROSPECTS :")
    print(f"  {'Nom':<30} {'Score':>6} {'Best Marketplace':<22} {'Pays':<5} {'Prix':<8} {'#MP'}")
    print(f"  {'-'*85}")
    for s in scored[:20]:
        best_mp = getattr(s, '_best_marketplace', '?')
        mp_name = MARKETPLACE_PROFILES.get(best_mp, {}).get("name", best_mp)
        n_mp = len(getattr(s, '_mp_scores', {}))
        print(f"  {s.name[:30]:<30} {s.total_score:>6.1f} {mp_name:<22} {s.country:<5} {s.price_range:<8} {n_mp}")

    # =========================================================
    # Phase 4 : Vérification Amazon FR
    # =========================================================
    print(f"\n{'='*60}")
    print(f"  PHASE 4 : Vérification présence Amazon FR")
    print(f"{'='*60}")

    brand_names = [s.name for s in scored]
    amazon_results = check_amazon_presence(brand_names, delay=1.5)

    # Attach results to scored sellers
    for s in scored:
        key = s.name.strip().lower()
        if key in amazon_results:
            is_present, count = amazon_results[key]
            s._amazon_presence = is_present
            s._amazon_product_count = count
        else:
            s._amazon_presence = False
            s._amazon_product_count = 0

    # =========================================================
    # Phase 5 : Export
    # =========================================================
    print(f"\n{'='*60}")
    print(f"  PHASE 5 : Export")
    print(f"{'='*60}")

    csv_path = export_csv(scored, args.output_dir)

    if not args.no_supabase:
        export_supabase(scored)
        backfill_domains(scored)

    print(f"\n  Terminé !")
    print(f"  CSV : {csv_path}")
    print(f"  {len(high)} prospects HIGH prêts pour enrichissement + prospection")


if __name__ == "__main__":
    main()
