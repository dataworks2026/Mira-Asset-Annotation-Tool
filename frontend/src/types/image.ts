export type ShapeType = "rect" | "ellipse";

export interface Annotation {
  annotation_id: string;
  bbox: BoundingBox;
  shape_type?: ShapeType;
  damage_type?: string;
  severity?: number;
  component?: string;
  notes?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InspectionImage {
  image_id: string;
  inspection_id: string;
  filename: string;
  s3_url: string;
  s3_key: string;
  content_type: string;
  annotation_status: "not_started" | "in_progress" | "completed";
  annotations: Annotation[];
  num_annotations: number;
  uploaded_at: string;
}

export interface PresignedUrlInfo {
  image_id: string;
  filename: string;
  upload_url: string;
  s3_key: string;
}

export interface UploadUrlResponse {
  upload_urls: PresignedUrlInfo[];
}

export interface ImageListResponse {
  images: InspectionImage[];
  total: number;
}
