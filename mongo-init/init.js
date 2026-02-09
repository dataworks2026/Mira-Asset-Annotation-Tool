// MongoDB initialization script
// Creates the annotation_app database with collections, schema validation, and indexes

db = db.getSiblingDB("annotation_app");

// --- Create collections with JSON Schema validation ---

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "full_name", "role"],
      properties: {
        email:     { bsonType: "string" },
        password:  { bsonType: "string" },
        full_name: { bsonType: "string" },
        role:      { bsonType: "string" },
      },
    },
  },
});

db.createCollection("assets", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["asset_id", "asset_name", "asset_type", "user_email", "created_at"],
      properties: {
        asset_id:      { bsonType: "string", pattern: "^[a-f0-9-]{36}$" },
        asset_name:    { bsonType: "string", minLength: 1, maxLength: 200 },
        asset_type:    { bsonType: "string", enum: ["coastal", "wind", "railway"] },
        user_email:    { bsonType: "string" },
        metadata:      { bsonType: ["object", "null"] },
        created_at:    { bsonType: "date" },
        updated_at:    { bsonType: ["date", "null"] },
        deleted_at:    { bsonType: ["date", "null"] },
      },
    },
  },
});

db.createCollection("inspections", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "inspection_id",
        "industry_category",
        "asset_name",
        "inspection_date",
        "inspector_name",
        "status",
        "total_images",
        "user_email",
        "created_at",
      ],
      properties: {
        inspection_id:     { bsonType: "string", pattern: "^[a-f0-9-]{36}$" },
        industry_category: { bsonType: "string", enum: ["coastal", "railway", "wind"] },
        asset_name:        { bsonType: "string", minLength: 1, maxLength: 200 },
        asset_type:        { bsonType: ["string", "null"], maxLength: 100 },  // DEPRECATED - kept for backward compatibility
        asset_id:          { bsonType: ["string", "null"], pattern: "^[a-f0-9-]{36}$" },  // DEPRECATED
        inspection_date:   { bsonType: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
        inspection_name:   { bsonType: ["string", "null"], maxLength: 200 },
        inspector_name:    { bsonType: "string", minLength: 1, maxLength: 100 },
        inspection_type:   { bsonType: ["string", "null"], maxLength: 100 },
        method:            { bsonType: ["string", "null"], maxLength: 100 },
        weather_conditions:{ bsonType: ["string", "null"], maxLength: 200 },
        notes:             { bsonType: ["string", "null"], maxLength: 2000 },
        status:            { bsonType: "string", enum: ["in_progress", "completed"] },
        total_images:      { bsonType: "int", minimum: 0 },
        num_annotations:   { bsonType: ["int", "null"], minimum: 0 },
        user_email:        { bsonType: "string" },
        snapshots:         {
          bsonType: ["object", "null"],
          properties: {
            asset_name_at_creation:        { bsonType: "string" },
            inspection_date_at_creation:   { bsonType: "string" },
          }
        },
        created_at:        { bsonType: "date" },
        updated_at:        { bsonType: ["date", "null"] },
        completed_at:      { bsonType: ["date", "null"] },
        deleted_at:        { bsonType: ["date", "null"] },
      },
    },
  },
});

db.createCollection("images", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "image_id",
        "inspection_id",
        "filename",
        "s3_key",
        "content_type",
        "annotation_status",
        "annotations",
        "num_annotations",
        "uploaded_at",
      ],
      properties: {
        image_id:          { bsonType: "string", pattern: "^[a-f0-9-]{36}$" },
        inspection_id:     { bsonType: "string", pattern: "^[a-f0-9-]{36}$" },
        filename:          { bsonType: "string" },
        original_filename: { bsonType: ["string", "null"] },
        s3_key:            { bsonType: "string" },
        s3_key_annotated:  { bsonType: ["string", "null"] },
        s3_key_version:    { bsonType: ["string", "null"] },
        s3_key_old:        { bsonType: ["string", "null"] },
        content_type:      { bsonType: "string" },
        file_size:         { bsonType: ["int", "null"], minimum: 0 },
        // Spatial Awareness fields - per-image location context
        asset_type:        { bsonType: ["string", "null"], maxLength: 100 },
        segment:           { bsonType: ["string", "null"], maxLength: 100 },
        elevation:         { bsonType: ["string", "null"], enum: [null, "above_water", "splash_zone", "tidal_zone", "submerged", "buried", "top", "middle", "bottom"] },
        side_face:         { bsonType: ["string", "null"], enum: [null, "north", "south", "east", "west", "seaward", "landward", "upstream", "downstream", "front", "back", "left", "right", "interior", "exterior"] },
        annotation_status: { bsonType: "string", enum: ["not_started", "in_progress", "completed"] },
        annotations:       { bsonType: "array" },  // Each annotation can have defect_id field
        num_annotations:   { bsonType: "int", minimum: 0 },
        uploaded_at:       { bsonType: "date" },
        updated_at:        { bsonType: ["date", "null"] },
        deleted_at:        { bsonType: ["date", "null"] },
      },
    },
  },
});

// --- Create indexes ---

// Users
db.users.createIndex({ email: 1 }, { unique: true });

// Assets
db.assets.createIndex({ asset_id: 1 }, { unique: true });
db.assets.createIndex({ user_email: 1, deleted_at: 1 });
db.assets.createIndex({ asset_name: 1, user_email: 1 });
db.assets.createIndex({ asset_type: 1 });

// Inspections
db.inspections.createIndex({ inspection_id: 1 }, { unique: true });
db.inspections.createIndex({ asset_id: 1, inspection_date: -1 });
db.inspections.createIndex({ status: 1 });
db.inspections.createIndex({ created_at: -1 });
db.inspections.createIndex({ user_email: 1, status: 1, created_at: -1 });
db.inspections.createIndex({ inspection_id: 1, user_email: 1 });
db.inspections.createIndex(
  { user_email: 1, asset_id: 1, inspection_date: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted_at: null }
  }
);

// Images
db.images.createIndex({ image_id: 1 }, { unique: true });
db.images.createIndex({ inspection_id: 1 });
db.images.createIndex({ annotation_status: 1 });
// Spatial Awareness indexes
db.images.createIndex({ inspection_id: 1, segment: 1 });
db.images.createIndex({ inspection_id: 1, elevation: 1 });
db.images.createIndex({ inspection_id: 1, side_face: 1 });
db.images.createIndex({ "annotations.defect_id": 1 });  // For defect tracking queries
// Structural Segments indexes
db.images.createIndex({ "annotations.structural_segments": 1 });  // Query by structural segment
db.images.createIndex({ "annotations.damage_type": 1, "annotations.structural_segments": 1 });  // Damage + segment queries

print("Database initialized: annotation_app");
print("Collections created with schema validation: users, assets, inspections, images");
print("Indexes created successfully");
