#!/usr/bin/env python3
"""
Migration script to create assets collection from existing inspections.

This script:
1. Extracts unique (user_email, asset_name, asset_type) combinations from inspections
2. Creates asset records for each unique combination
3. Updates inspections to reference the new assets via asset_id
4. Adds snapshots to existing inspections
5. Marks all existing images as v1 format for backward compatibility

Run with: python -m scripts.migrate_to_assets
"""

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import get_collection


def migrate():
    """Run the migration."""
    print("=" * 80)
    print("MIGRATION: Create Assets Collection from Existing Inspections")
    print("=" * 80)
    print()

    inspections_col = get_collection("inspections")
    assets_col = get_collection("assets")
    images_col = get_collection("images")

    # Step 1: Find all unique (user_email, asset_name, asset_type) combinations
    print("Step 1: Finding unique assets from existing inspections...")
    pipeline = [
        {
            "$group": {
                "_id": {
                    "user_email": "$user_email",
                    "asset_name": "$asset_name",
                    "asset_type": "$asset_type",
                },
                "first_seen": {"$min": "$created_at"},
                "inspection_count": {"$sum": 1},
            }
        },
        {"$sort": {"first_seen": 1}},
    ]

    unique_assets = list(inspections_col.aggregate(pipeline))
    print(f"  Found {len(unique_assets)} unique assets")
    print()

    if not unique_assets:
        print("No inspections found. Nothing to migrate.")
        return

    # Step 2: Create asset records
    print("Step 2: Creating asset records...")
    asset_map = {}  # (user_email, asset_name, asset_type) -> asset_id

    for i, asset_group in enumerate(unique_assets, 1):
        user_email = asset_group["_id"]["user_email"]
        asset_name = asset_group["_id"]["asset_name"]
        asset_type = asset_group["_id"]["asset_type"]
        first_seen = asset_group["first_seen"]
        inspection_count = asset_group["inspection_count"]

        # Check if asset already exists
        existing = assets_col.find_one({
            "user_email": user_email,
            "asset_name": asset_name,
            "asset_type": asset_type,
        })

        if existing:
            asset_id = existing["asset_id"]
            print(f"  [{i}/{len(unique_assets)}] Asset already exists: {asset_name} (type: {asset_type}) "
                  f"for {user_email} - {inspection_count} inspections")
        else:
            asset_id = str(uuid.uuid4())

            asset_doc = {
                "asset_id": asset_id,
                "asset_name": asset_name,
                "asset_type": asset_type,
                "user_email": user_email,
                "metadata": {},
                "created_at": first_seen,
                "updated_at": None,
                "deleted_at": None,
            }

            assets_col.insert_one(asset_doc)
            print(f"  [{i}/{len(unique_assets)}] Created asset: {asset_name} (type: {asset_type}) "
                  f"for {user_email} - {inspection_count} inspections")

        # Store mapping
        key = (user_email, asset_name, asset_type)
        asset_map[key] = asset_id

    print()

    # Step 3: Update inspections with asset_id and snapshots
    print("Step 3: Updating inspections with asset_id and snapshots...")
    updated_count = 0

    for key, asset_id in asset_map.items():
        user_email, asset_name, asset_type = key

        result = inspections_col.update_many(
            {
                "user_email": user_email,
                "asset_name": asset_name,
                "asset_type": asset_type,
                "asset_id": {"$exists": False},  # Only update if not already migrated
            },
            {
                "$set": {
                    "asset_id": asset_id,
                    "snapshots": {
                        "asset_name_at_creation": asset_name,
                        "inspection_date_at_creation": "$inspection_date",  # Will use existing value
                    },
                    "num_annotations": 0,  # Initialize if missing
                    "updated_at": None,
                    "deleted_at": None,
                }
            },
        )
        updated_count += result.modified_count

    print(f"  Updated {updated_count} inspections with asset references")
    print()

    # Step 3b: Fix snapshot date references (MongoDB doesn't support field references in $set)
    print("Step 3b: Fixing snapshot date references...")
    inspections_with_snapshots = inspections_col.find({"snapshots": {"$exists": True}})
    snapshot_fix_count = 0

    for inspection in inspections_with_snapshots:
        if inspection.get("snapshots", {}).get("inspection_date_at_creation") == "$inspection_date":
            inspections_col.update_one(
                {"inspection_id": inspection["inspection_id"]},
                {
                    "$set": {
                        "snapshots.inspection_date_at_creation": inspection.get("inspection_date", "unknown")
                    }
                }
            )
            snapshot_fix_count += 1

    print(f"  Fixed {snapshot_fix_count} snapshot date references")
    print()

    # Step 4: Mark all existing images as v1 format
    print("Step 4: Marking existing images as v1 format (for backward compatibility)...")
    result = images_col.update_many(
        {"s3_key_version": {"$exists": False}},
        {
            "$set": {
                "s3_key_version": "v1",
                "original_filename": "$filename",  # Will use existing filename
                "s3_key_annotated": None,
                "file_size": None,
                "updated_at": None,
                "deleted_at": None,
            }
        },
    )
    print(f"  Marked {result.modified_count} images as v1 format")
    print()

    # Step 4b: Fix original_filename references
    print("Step 4b: Copying filenames to original_filename...")
    images_to_fix = images_col.find({"original_filename": "$filename"})
    filename_fix_count = 0

    for image in images_to_fix:
        images_col.update_one(
            {"image_id": image["image_id"]},
            {"$set": {"original_filename": image.get("filename", "unknown")}}
        )
        filename_fix_count += 1

    print(f"  Fixed {filename_fix_count} original_filename references")
    print()

    # Summary
    print("=" * 80)
    print("MIGRATION COMPLETE!")
    print("=" * 80)
    print(f"Assets created:           {len(unique_assets)}")
    print(f"Inspections updated:      {updated_count}")
    print(f"Images marked as v1:      {result.modified_count}")
    print()
    print("Next steps:")
    print("  1. All NEW inspections will use v2 format (inspection_id-based S3 paths)")
    print("  2. Existing inspections continue to work with v1 format (backward compatible)")
    print("  3. You can now rename assets and inspection dates without affecting S3!")
    print("=" * 80)


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
