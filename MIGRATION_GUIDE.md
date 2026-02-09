# Migration Guide: Asset Registry & Inspection Editing

## 📋 Overview

This guide walks you through migrating your existing Mira Asset Annotation Tool data to the new asset-based architecture.

**What changes:**
- Assets are now managed separately from inspections
- Inspections reference assets via `asset_id`
- S3 paths now use immutable inspection_id (new inspections only)
- You can rename assets and edit inspection dates freely!

**What stays the same:**
- All existing data remains accessible
- Existing S3 files don't move
- API responses include all the same data
- Frontend continues to work during migration

---

## 🚀 Migration Steps

### Prerequisites

- Docker and Docker Compose installed
- Backend environment configured (.env file)
- No critical operations in progress

### Step 1: Backup Your Data (Recommended)

```bash
# Backup MongoDB
docker exec mongodb mongodump --out=/backup --db=annotation_app

# Copy backup to host
docker cp mongodb:/backup ./mongodb_backup_$(date +%Y%m%d)

# Backup .env
cp backend/.env backend/.env.backup
```

### Step 2: Pull Latest Code

```bash
git pull origin feat/initial-project-setup
# or whichever branch contains the new changes
```

### Step 3: Stop Services

```bash
docker-compose down
```

### Step 4: Start Services with New Schema

```bash
docker-compose up -d
```

**What happens:**
- MongoDB initializes with new `assets` collection
- Inspections collection gets updated validation rules
- Images collection gets new optional fields
- Backend starts with new API endpoints

**Check health:**
```bash
curl http://localhost:8000/api/health

# Should return:
# {"status": "healthy", "mongodb": "connected"}
```

### Step 5: Run Migration Script

```bash
cd backend
python -m scripts.migrate_to_assets
```

**Expected output:**
```
================================================================================
MIGRATION: Create Assets Collection from Existing Inspections
================================================================================

Step 1: Finding unique assets from existing inspections...
  Found 5 unique assets

Step 2: Creating asset records...
  [1/5] Created asset: Bridge A (type: coastal) for user@example.com - 3 inspections
  [2/5] Created asset: Pier 5 (type: coastal) for user@example.com - 2 inspections
  ...

Step 3: Updating inspections with asset_id and snapshots...
  Updated 10 inspections with asset references

Step 3b: Fixing snapshot date references...
  Fixed 10 snapshot date references

Step 4: Marking existing images as v1 format...
  Marked 47 images as v1 format

Step 4b: Copying filenames to original_filename...
  Fixed 47 original_filename references

================================================================================
MIGRATION COMPLETE!
================================================================================
Assets created:           5
Inspections updated:      10
Images marked as v1:      47

Next steps:
  1. All NEW inspections will use v2 format (inspection_id-based S3 paths)
  2. Existing inspections continue to work with v1 format (backward compatible)
  3. You can now rename assets and inspection dates without affecting S3!
================================================================================
```

### Step 6: Verify Migration

#### Check Assets Collection
```bash
docker exec -it mongodb mongosh annotation_app

db.assets.find().pretty()
```

**Expected:** List of all unique assets extracted from inspections

#### Check Inspections Have asset_id
```bash
db.inspections.findOne()
```

**Expected:** Inspection document with `asset_id` field and `snapshots` object

#### Check Images Have Version
```bash
db.images.findOne()
```

**Expected:** Image document with `s3_key_version: "v1"`

### Step 7: Test API Endpoints

#### List Assets
```bash
curl -X GET http://localhost:8000/api/assets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Create New Asset
```bash
curl -X POST http://localhost:8000/api/assets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_name": "Test Bridge",
    "asset_type": "coastal"
  }'
```

#### Rename Asset (The Magic!)
```bash
curl -X PUT http://localhost:8000/api/assets/ASSET_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_name": "Test Bridge (Renamed)"
  }'
```

**Verify:** Asset renamed, inspections still work, S3 paths unchanged!

#### Edit Inspection Date
```bash
curl -X PUT http://localhost:8000/api/inspections/INSPECTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inspection_date": "2026-02-07"
  }'
```

**Verify:** Date changed, S3 paths unchanged!

---

## 🔄 Rollback Plan

If something goes wrong, you can rollback:

### Option 1: Restore from Backup

```bash
# Stop services
docker-compose down

# Restore MongoDB backup
docker-compose up -d mongodb
docker exec -it mongodb mongorestore --drop --db=annotation_app /backup

# Restore old code
git checkout HEAD~1

# Restart
docker-compose restart
```

### Option 2: Manual Cleanup (if migration script failed mid-way)

```bash
docker exec -it mongodb mongosh annotation_app

# Drop assets collection
db.assets.drop()

# Remove asset_id from inspections
db.inspections.updateMany(
  {},
  { $unset: { asset_id: "", snapshots: "", num_annotations: "" } }
)

# Remove version from images
db.images.updateMany(
  {},
  { $unset: { s3_key_version: "", original_filename: "", s3_key_annotated: "" } }
)
```

Then restore old code and restart.

---

## 📊 Migration Statistics

Track your migration progress:

```bash
# Count assets created
docker exec -it mongodb mongosh annotation_app --eval "db.assets.countDocuments({})"

# Count inspections with asset_id
docker exec -it mongodb mongosh annotation_app --eval "db.inspections.countDocuments({asset_id: {\$exists: true}})"

# Count v1 images
docker exec -it mongodb mongosh annotation_app --eval "db.images.countDocuments({s3_key_version: 'v1'})"

# Count v2 images (new uploads)
docker exec -it mongodb mongosh annotation_app --eval "db.images.countDocuments({s3_key_version: 'v2'})"
```

---

## ⚠️ Common Issues

### Issue: "Cannot connect to MongoDB"
**Solution:**
```bash
docker-compose logs mongodb
# Check if MongoDB is running
docker-compose up -d mongodb
# Wait 10 seconds and retry
```

### Issue: Migration script says "No inspections found"
**Cause:** Database name mismatch or empty database
**Solution:**
```bash
# Check which database has data
docker exec -it mongodb mongosh
show dbs
use annotation_app
db.inspections.countDocuments({})
```

### Issue: "Asset with name X already exists"
**Cause:** Migration script run multiple times (this is OK!)
**Solution:** Script is idempotent - it skips existing assets automatically

### Issue: Duplicate asset_id errors
**Cause:** Inspections already migrated
**Solution:** This is expected - script only updates inspections without asset_id

---

## 🧪 Post-Migration Testing

Test these scenarios to ensure everything works:

### Test 1: Legacy Inspection Works
1. Find an old inspection (created before migration)
2. List its images
3. View images (presigned URLs should work)
4. Add annotations
5. Complete inspection

**Expected:** Everything works as before

### Test 2: Create New Inspection
1. Create or select an asset
2. Create new inspection with asset_id
3. Upload images
4. Check S3 - paths should be `{inspection_id}/raw/...`

**Expected:** Images use v2 format

### Test 3: Rename Asset
1. Select an asset
2. Rename it
3. View inspections for that asset
4. Verify inspections still show

**Expected:** Works seamlessly, no errors

### Test 4: Edit Inspection Date
1. Select an inspection
2. Change the date
3. View images for that inspection
4. Verify images still load

**Expected:** Works seamlessly, no S3 issues

---

## 📈 Monitoring

After migration, monitor these metrics:

### API Performance
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/assets
```

### Database Size
```bash
docker exec -it mongodb mongosh annotation_app --eval "db.stats()"
```

### S3 Usage
- Monitor S3 bucket size
- Track number of objects
- Check for orphaned files

---

## 🎯 Next Steps After Migration

1. **Update Frontend** (if needed)
   - Update inspection creation to use asset selector
   - Add asset management UI
   - Add edit inspection form

2. **User Communication**
   - Notify users of new rename capability
   - Document new inspection creation flow
   - Provide API examples

3. **Cleanup** (optional, after 30 days)
   - Consider migrating v1 images to v2 format
   - Archive old backups
   - Remove legacy code branches

---

## 📞 Support

**During Migration:**
- Monitor logs: `docker-compose logs -f backend`
- Check MongoDB: `docker-compose logs -f mongodb`
- Test endpoints immediately after each step

**If Issues Persist:**
1. Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. Review error logs
3. Consider rollback if critical

---

## ✅ Migration Checklist

Print this and check off as you go:

- [ ] Backup MongoDB data
- [ ] Backup .env file
- [ ] Stop Docker services
- [ ] Pull latest code
- [ ] Start services with new schema
- [ ] Verify health check passes
- [ ] Run migration script
- [ ] Verify assets created
- [ ] Verify inspections have asset_id
- [ ] Verify images marked as v1
- [ ] Test GET /api/assets
- [ ] Test POST /api/assets
- [ ] Test PUT /api/assets (rename)
- [ ] Test PUT /api/inspections (edit date)
- [ ] Test creating new inspection
- [ ] Test uploading images to new inspection
- [ ] Verify old inspections still work
- [ ] Update frontend (if needed)
- [ ] Notify users
- [ ] Monitor for 24 hours

---

**Good luck with your migration!** 🚀

Remember: The migration script is safe to run multiple times, and you can always rollback if needed.
