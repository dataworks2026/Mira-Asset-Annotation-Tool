export interface Inspection {
  inspection_id: string;
  inspection_date: string;
  asset_name: string;
  asset_type: string;
  inspector_name: string;
  inspection_type?: string;
  method?: string;
  weather_conditions?: string;
  notes?: string;
  status: "in_progress" | "completed";
  total_images: number;
  created_at: string;
  completed_at?: string;
}

export interface CreateInspectionPayload {
  inspection_date: string;
  asset_name: string;
  asset_type: string;
  inspector_name: string;
  inspection_type?: string;
  method?: string;
  weather_conditions?: string;
  notes?: string;
}

export interface InspectionListResponse {
  inspections: Inspection[];
  total: number;
}
