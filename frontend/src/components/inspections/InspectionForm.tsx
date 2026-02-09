"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useInspections } from "@/hooks/useInspections";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  INDUSTRY_CATEGORIES,
  getAssetTypesForCategory,
  IndustryCategory,
} from "@/lib/referenceData";

export function InspectionForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { createInspection } = useInspections();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().split("T")[0],
    industry_category: "coastal" as IndustryCategory,
    asset_name: "",
    inspector_name: user?.full_name || "",
    inspection_type: "",
    weather_conditions: "",
    notes: "",
  });

  // Get available asset types based on selected industry category
  const availableAssetTypes = getAssetTypesForCategory(form.industry_category);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await createInspection({
        industry_category: form.industry_category,
        asset_name: form.asset_name,
        inspection_date: form.inspection_date,
        inspector_name: form.inspector_name,
        inspection_type: form.inspection_type || undefined,
        weather_conditions: form.weather_conditions || undefined,
        notes: form.notes || undefined,
      });
      router.push(`/inspections/${result.inspection_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create inspection");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <ErrorAlert message={error} />

      {/* Industry Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Industry Category *
        </label>
        <select
          required
          value={form.industry_category}
          onChange={(e) => updateField("industry_category", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {INDUSTRY_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Determines available asset types, damage types, and components
        </p>
      </div>

      {/* Asset Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Asset/Location Name *
        </label>
        <input
          type="text"
          required
          value={form.asset_name}
          onChange={(e) => updateField("asset_name", e.target.value)}
          placeholder="e.g. Port of Miami Terminal A"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Asset types (pier, bulkhead, etc.) are assigned per image during annotation
        </p>
      </div>

      {/* Available Asset Types (Info only) */}
      <div className="rounded-md bg-blue-50 p-3">
        <p className="text-xs font-medium text-blue-700 mb-1">
          Available asset types for {form.industry_category}:
        </p>
        <div className="flex flex-wrap gap-1">
          {availableAssetTypes.map((at) => (
            <span
              key={at.value}
              className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
            >
              {at.label}
            </span>
          ))}
        </div>
      </div>

      {/* Inspection Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Inspection Date *
        </label>
        <input
          type="date"
          required
          value={form.inspection_date}
          onChange={(e) => updateField("inspection_date", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Inspector Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Inspector Name *
        </label>
        <input
          type="text"
          required
          value={form.inspector_name}
          onChange={(e) => updateField("inspector_name", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Inspection Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Inspection Type
        </label>
        <input
          type="text"
          value={form.inspection_type}
          onChange={(e) => updateField("inspection_type", e.target.value)}
          placeholder="e.g. Routine, Special"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Weather Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Weather Conditions
        </label>
        <input
          type="text"
          value={form.weather_conditions}
          onChange={(e) => updateField("weather_conditions", e.target.value)}
          placeholder="e.g. Clear, 72F"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          rows={3}
          placeholder="Any additional observations..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Inspection"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
