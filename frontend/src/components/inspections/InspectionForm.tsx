"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useInspections } from "@/hooks/useInspections";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

const ASSET_TYPES = [
  "pier",
  "bridge",
  "seawall",
  "bulkhead",
  "wharf",
  "dock",
  "retaining_wall",
  "other",
];

export function InspectionForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { createInspection } = useInspections();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    inspection_date: new Date().toISOString().split("T")[0],
    asset_name: "",
    asset_type: ASSET_TYPES[0],
    inspector_name: user?.full_name || "",
    inspection_type: "",
    weather_conditions: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await createInspection({
        ...form,
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

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Asset Name *
        </label>
        <input
          type="text"
          required
          value={form.asset_name}
          onChange={(e) => updateField("asset_name", e.target.value)}
          placeholder="e.g. Slip 1 North Bulkhead"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Asset Type *
        </label>
        <select
          required
          value={form.asset_type}
          onChange={(e) => updateField("asset_type", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

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

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Weather Conditions
        </label>
        <input
          type="text"
          value={form.weather_conditions}
          onChange={(e) => updateField("weather_conditions", e.target.value)}
          placeholder="e.g. Clear, 72°F"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

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
