export type AssetType = "coastal" | "wind" | "railway";

export interface Asset {
  asset_id: string;
  asset_name: string;
  asset_type: AssetType;
  metadata?: Record<string, any>;
  user_email: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface AssetCreateRequest {
  asset_name: string;
  asset_type: AssetType;
  metadata?: Record<string, any>;
}

export interface AssetUpdateRequest {
  asset_name?: string;
  asset_type?: AssetType;
  metadata?: Record<string, any>;
}

export interface AssetListResponse {
  assets: Asset[];
  total: number;
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  coastal: "Coastal",
  wind: "Wind",
  railway: "Railway",
};

export const ASSET_TYPE_DESCRIPTIONS: Record<AssetType, string> = {
  coastal: "Coastal infrastructure (piers, jetties, seawalls)",
  wind: "Wind turbines and related infrastructure",
  railway: "Railway tracks, bridges, and infrastructure",
};
