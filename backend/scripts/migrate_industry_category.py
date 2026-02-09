#!/usr/bin/env python3
"""
Migration script to add industry_category to inspections and move asset_type to images.

This script:
1. Adds industry_category='coastal' to all existing inspections (default)
2. Copies asset_type from inspection to all its images (if not already set)
3. Keeps asset_type on inspection for backward compatibility

Run with: python -m scripts.migrate_industry_category
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import get_collection


def migrate():
    """Run the migration."""
    print("=" * 80)
    print("MIGRATION: Add industry_category and move asset_type to images")
    print("=" * 80)
    print()

    inspections_col = get_collection("inspections")
    images_col = get_collection("images")

    # Step 1: Add industry_category to inspections that don't have it
    print("Step 1: Adding industry_category to existing inspections...")
    result = inspections_col.update_many(
        {"industry_category": {"$exists": False}},
        {"$set": {"industry_category": "coastal"}}
    )
    print(f"  Updated {result.modified_count} inspections with industry_category='coastal'")
    print()

    # Step 2: Copy asset_type from inspection to images
    print("Step 2: Copying asset_type from inspections to images...")
    inspections = inspections_col.find({"asset_type": {"$exists": True, "$ne": None}})

    images_updated = 0
    for inspection in inspections:
        asset_type = inspection.get("asset_type")
        if not asset_type:
            continue

        # Update images that don't have asset_type set
        result = images_col.update_many(
            {
                "inspection_id": inspection["inspection_id"],
                "$or": [
                    {"asset_type": {"$exists": False}},
                    {"asset_type": None}
                ]
            },
            {"$set": {"asset_type": asset_type}}
        )
        images_updated += result.modified_count

        if result.modified_count > 0:
            print(f"  Inspection {inspection['inspection_id'][:8]}... "
                  f"({inspection.get('asset_name', 'unknown')}): "
                  f"set asset_type='{asset_type}' on {result.modified_count} images")

    print(f"  Total images updated: {images_updated}")
    print()

    # Step 3: Summary
    print("=" * 80)
    print("MIGRATION COMPLETE!")
    print("=" * 80)

    # Show current state
    total_inspections = inspections_col.count_documents({})
    inspections_with_category = inspections_col.count_documents({"industry_category": {"$exists": True}})
    total_images = images_col.count_documents({})
    images_with_asset_type = images_col.count_documents({"asset_type": {"$exists": True, "$ne": None}})

    print(f"Inspections with industry_category: {inspections_with_category}/{total_inspections}")
    print(f"Images with asset_type: {images_with_asset_type}/{total_images}")
    print()
    print("Notes:")
    print("  - All existing inspections now have industry_category='coastal'")
    print("  - Asset type is now set per-image (copied from inspection)")
    print("  - New inspections will require industry_category")
    print("  - Asset type can now vary per image within an inspection")
    print("=" * 80)


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
