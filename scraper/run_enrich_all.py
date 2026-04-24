#!/usr/bin/env python3
"""
run_enrich_all.py — Lance enrich_one sur tous les sellers Supabase.
"""
import sys
import time
from config import SUPABASE_URL, SUPABASE_KEY
from enrich_one import enrich_seller

def main():
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    r = client.table("sellers").select("id, seller_name, company_domain").execute()
    sellers = r.data or []
    print(f"\n{len(sellers)} sellers à enrichir\n", flush=True)

    enriched, errors = 0, 0
    for i, seller in enumerate(sellers):
        print(f"[{i+1}/{len(sellers)}] {seller['seller_name']}", flush=True)
        try:
            enrich_seller(seller["id"], dry_run=False)
            enriched += 1
        except Exception as e:
            print(f"  ERREUR: {e}", file=sys.stderr, flush=True)
            errors += 1
        time.sleep(1.5)

    print(f"\nTerminé : {enriched} enrichis, {errors} erreurs")

if __name__ == "__main__":
    main()
