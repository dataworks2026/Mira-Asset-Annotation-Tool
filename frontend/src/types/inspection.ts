import { IndustryCategory } from "@/lib/referenceData";

export interface Inspection {
  inspection_id: string;
  industry_category?: IndustryCategory;  // coastal, railway, wind
  asset_name?: string;  // Name of the asset/location
  asset_type?: string;  // DEPRECATED - now stored on images
  inspection_date: string;
  inspection_name?: string;
  inspector_name: string;
  inspection_type?: string;
  method?: string;
  weather_conditions?: string;
  notes?: string;
  status: "in_progress" | "completed";
  total_images: number;
  num_annotations?: number;
  snapshots?: {
    asset_name_at_creation: string;
    inspection_date_at_creation: string;
  };
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface CreateInspectionPayload {
  industry_category: IndustryCategory;
  asset_name: string;
  asset_type?: string;  // DEPRECATED - kept for backward compat
  inspection_date: string;
  inspection_name?: string;
  inspector_name: string;
  inspection_type?: string;
  method?: string;
  weather_conditions?: string;
  notes?: string;
}

export interface UpdateInspectionPayload {
  inspection_date?: string;
  inspection_name?: string;
  inspector_name?: string;
  inspection_type?: string;
  method?: string;
  weather_conditions?: string;
  notes?: string;
}

export interface InspectionListResponse {
  inspections: Inspection[];
  total: number;
}
