import { api } from "./api";
import type {
  Asset,
  AssetCreateRequest,
  AssetUpdateRequest,
  AssetListResponse,
  AssetType,
} from "@/types/asset";

export const assetService = {
  /**
   * Get all assets for the current user
   */
  async list(assetType?: AssetType): Promise<Asset[]> {
    const params = new URLSearchParams();
    if (assetType) {
      params.append("asset_type", assetType);
    }
    const query = params.toString();
    const response = await api.get<AssetListResponse>(
      `/api/assets${query ? `?${query}` : ""}`
    );
    return response.assets;
  },

  /**
   * Get a single asset by ID
   */
  async getById(assetId: string): Promise<Asset> {
    return api.get<Asset>(`/api/assets/${assetId}`);
  },

  /**
   * Create a new asset
   */
  async create(data: AssetCreateRequest): Promise<Asset> {
    return api.post<Asset>("/api/assets", data);
  },

  /**
   * Update an asset (rename, change type, update metadata)
   * This operation is safe - no S3 changes needed!
   */
  async update(
    assetId: string,
    data: AssetUpdateRequest
  ): Promise<Asset> {
    return api.put<Asset>(`/api/assets/${assetId}`, data);
  },

  /**
   * Delete an asset (soft delete)
   * Will fail if inspections exist for this asset
   */
  async delete(assetId: string): Promise<{ message: string; asset_id: string }> {
    return api.delete<{ message: string; asset_id: string }>(
      `/api/assets/${assetId}`
    );
  },
};
