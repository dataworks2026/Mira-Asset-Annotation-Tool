"use client";

import { useState } from "react";
import type { Asset, AssetType, AssetCreateRequest } from "@/types/asset";
import { ASSET_TYPE_LABELS, ASSET_TYPE_DESCRIPTIONS } from "@/types/asset";

interface AssetFormProps {
  asset?: Asset; // For editing
  onSubmit: (data: AssetCreateRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function AssetForm({
  asset,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AssetFormProps) {
  const [formData, setFormData] = useState<AssetCreateRequest>({
    asset_name: asset?.asset_name || "",
    asset_type: asset?.asset_type || "coastal",
    metadata: asset?.metadata || {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.asset_name.trim()) {
      newErrors.asset_name = "Asset name is required";
    } else if (formData.asset_name.length > 200) {
      newErrors.asset_name = "Asset name must be less than 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Failed to save asset",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asset Name */}
      <div>
        <label htmlFor="asset_name" className="block text-sm font-medium text-gray-700 mb-2">
          Asset Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="asset_name"
          value={formData.asset_name}
          onChange={(e) =>
            setFormData({ ...formData, asset_name: e.target.value })
          }
          disabled={isSubmitting}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.asset_name ? "border-red-300" : "border-gray-300"
          }`}
          placeholder="e.g., Golden Gate Bridge, Pier 5, Wind Farm A"
          required
        />
        {errors.asset_name && (
          <p className="mt-1 text-sm text-red-600">{errors.asset_name}</p>
        )}
      </div>

      {/* Asset Type */}
      <div>
        <label htmlFor="asset_type" className="block text-sm font-medium text-gray-700 mb-2">
          Asset Type <span className="text-red-500">*</span>
        </label>
        <select
          id="asset_type"
          value={formData.asset_type}
          onChange={(e) =>
            setFormData({ ...formData, asset_type: e.target.value as AssetType })
          }
          disabled={isSubmitting || !!asset} // Can't change type when editing
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            asset ? "bg-gray-100 cursor-not-allowed" : "border-gray-300"
          }`}
          required
        >
          {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((type) => (
            <option key={type} value={type}>
              {ASSET_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {ASSET_TYPE_DESCRIPTIONS[formData.asset_type]}
        </p>
        {asset && (
          <p className="mt-1 text-sm text-amber-600">
            Note: Asset type cannot be changed after creation
          </p>
        )}
      </div>

      {/* Optional Metadata Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Information <span className="text-gray-400">(Optional)</span>
        </label>
        <div className="space-y-3 p-4 bg-gray-50 rounded-md">
          <div>
            <label htmlFor="location" className="block text-xs font-medium text-gray-600 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={formData.metadata?.location || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, location: e.target.value },
                })
              }
              disabled={isSubmitting}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              placeholder="e.g., San Francisco, CA"
            />
          </div>
          <div>
            <label htmlFor="construction_year" className="block text-xs font-medium text-gray-600 mb-1">
              Construction Year
            </label>
            <input
              type="number"
              id="construction_year"
              value={formData.metadata?.construction_year || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    construction_year: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
              disabled={isSubmitting}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              placeholder="e.g., 1937"
              min="1800"
              max={new Date().getFullYear()}
            />
          </div>
          <div>
            <label htmlFor="owner" className="block text-xs font-medium text-gray-600 mb-1">
              Owner
            </label>
            <input
              type="text"
              id="owner"
              value={formData.metadata?.owner || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, owner: e.target.value },
                })
              }
              disabled={isSubmitting}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
              placeholder="e.g., Department of Transportation"
            />
          </div>
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : asset ? "Save Changes" : "Create Asset"}
        </button>
      </div>
    </form>
  );
}
