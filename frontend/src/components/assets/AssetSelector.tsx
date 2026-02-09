"use client";

import { useState, useEffect } from "react";
import { assetService } from "@/lib/assetService";
import type { Asset, AssetType } from "@/types/asset";
import { ASSET_TYPE_LABELS } from "@/types/asset";

interface AssetSelectorProps {
  value?: string; // asset_id
  onChange: (assetId: string, asset: Asset) => void;
  assetType?: AssetType;
  disabled?: boolean;
  error?: string;
}

export default function AssetSelector({
  value,
  onChange,
  assetType,
  disabled = false,
  error,
}: AssetSelectorProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [assetType]);

  const loadAssets = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await assetService.list(assetType);
      setAssets(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assetId = e.target.value;
    if (assetId === "create_new") {
      setShowCreateNew(true);
      return;
    }
    const selectedAsset = assets.find((a) => a.asset_id === assetId);
    if (selectedAsset) {
      onChange(assetId, selectedAsset);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Asset <span className="text-red-500">*</span>
        </label>
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          Loading assets...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Asset <span className="text-red-500">*</span>
        </label>
        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm">
          {loadError}
        </div>
        <button
          type="button"
          onClick={loadAssets}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="asset_id" className="block text-sm font-medium text-gray-700">
        Asset <span className="text-red-500">*</span>
      </label>
      <select
        id="asset_id"
        value={value || ""}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-300" : "border-gray-300"
        } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        required
      >
        <option value="">Select an asset...</option>
        {assets.map((asset) => (
          <option key={asset.asset_id} value={asset.asset_id}>
            {asset.asset_name} ({ASSET_TYPE_LABELS[asset.asset_type]})
          </option>
        ))}
        <option value="create_new" className="font-semibold text-blue-600">
          + Create New Asset
        </option>
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {assets.length === 0 && (
        <p className="text-sm text-gray-500">
          No assets found. Create your first asset to get started!
        </p>
      )}
      {showCreateNew && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            To create a new asset, go to the <strong>Assets</strong> page in the navigation menu.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateNew(false)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
