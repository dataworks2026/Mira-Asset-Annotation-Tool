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

db.createCollection("inspections", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "inspection_id",
        "inspection_date",
        "asset_name",
        "asset_type",
        "inspector_name",
        "status",
        "total_images",
        "user_email",
        "created_at",
      ],
      properties: {
        inspection_id:     { bsonType: "string" },
        inspection_date:   { bsonType: "string" },
        asset_name:        { bsonType: "string" },
        asset_type:        { bsonType: "string" },
        inspector_name:    { bsonType: "string" },
        inspection_type:   { bsonType: ["string", "null"] },
        method:            { bsonType: ["string", "null"] },
        weather_conditions:{ bsonType: ["string", "null"] },
        notes:             { bsonType: ["string", "null"] },
        status:            { bsonType: "string", enum: ["in_progress", "completed"] },
        total_images:      { bsonType: "int" },
        user_email:        { bsonType: "string" },
        created_at:        { bsonType: "date" },
        completed_at:      { bsonType: ["date", "null"] },
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
        image_id:          { bsonType: "string" },
        inspection_id:     { bsonType: "string" },
        filename:          { bsonType: "string" },
        s3_key:            { bsonType: "string" },
        content_type:      { bsonType: "string" },
        annotation_status: { bsonType: "string", enum: ["not_started", "in_progress", "completed"] },
        annotations:       { bsonType: "array" },
        num_annotations:   { bsonType: "int" },
        uploaded_at:       { bsonType: "date" },
      },
    },
  },
});

// --- Create indexes ---

// Users
db.users.createIndex({ email: 1 }, { unique: true });

// Inspections
db.inspections.createIndex({ inspection_id: 1 }, { unique: true });
db.inspections.createIndex({ status: 1 });
db.inspections.createIndex({ created_at: -1 });
db.inspections.createIndex({ user_email: 1, status: 1, created_at: -1 });
db.inspections.createIndex({ inspection_id: 1, user_email: 1 });

// Images
db.images.createIndex({ image_id: 1 }, { unique: true });
db.images.createIndex({ inspection_id: 1 });
db.images.createIndex({ annotation_status: 1 });

print("Database initialized: annotation_app");
print("Collections created with schema validation: users, inspections, images");
print("Indexes created successfully");
