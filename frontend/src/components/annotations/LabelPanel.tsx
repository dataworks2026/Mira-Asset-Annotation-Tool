"use client";

import { AnnotationRect } from "./AnnotationCanvas";
import {
  SEVERITY_LEVELS,
  getComponentsForAssetType,
  getDamageTypesForCategory,
  IndustryCategory,
} from "@/lib/referenceData";
import { StructuralSegmentSelector } from "./StructuralSegmentSelector";

interface LabelPanelProps {
  annotation: AnnotationRect | null;
  onUpdate: (updated: AnnotationRect) => void;
  readOnly?: boolean;
  assetType?: string;
  industryCategory?: IndustryCategory;
}

export function LabelPanel({
  annotation,
  onUpdate,
  readOnly = false,
  assetType,
  industryCategory,
}: LabelPanelProps) {
  const componentCodes = getComponentsForAssetType(assetType);
  const damageTypes = getDamageTypesForCategory(industryCategory);

  if (!annotation) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-400">
          Select an annotation to edit its labels.
        </p>
      </div>
    );
  }

  function handleChange(field: string, value: string | number | string[]) {
    if (!annotation) return;
    if (Array.isArray(value)) {
      onUpdate({ ...annotation, [field]: value.length > 0 ? value : undefined });
    } else {
      onUpdate({ ...annotation, [field]: value || undefined });
    }
  }

  function handleComponentToggle(code: string) {
    if (!annotation) return;
    const current = annotation.component || [];
    const updated = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    handleChange("component", updated);
  }

  function handleStructuralSegmentsChange(segments: string[]) {
    if (!annotation) return;
    onUpdate({
      ...annotation,
      structural_segments: segments.length > 0 ? segments : undefined
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Classification</h4>

      {/* Damage Type */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Damage Type
        </label>
        <select
          value={annotation.damage_type || ""}
          onChange={(e) => handleChange("damage_type", e.target.value)}
          disabled={readOnly}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value="">-- Select --</option>
          {damageTypes.map((dt) => (
            <option key={dt.code} value={dt.code}>
              {dt.code} - {dt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Severity
        </label>
        <select
          value={annotation.severity ?? ""}
          onChange={(e) =>
            handleChange(
              "severity",
              e.target.value ? parseInt(e.target.value, 10) : ""
            )
          }
          disabled={readOnly}
          aria-label="Severity Level"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value="">-- Select --</option>
          {SEVERITY_LEVELS.map((s) => (
            <option key={s.level} value={s.level}>
              {s.level} - {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Structural Segments - NEW multi-select */}
      <StructuralSegmentSelector
        selectedSegments={annotation.structural_segments || []}
        onChange={handleStructuralSegmentsChange}
        readOnly={readOnly}
      />

      {/* Component Codes - DEPRECATED (kept for backward compatibility) */}
      {annotation.component && annotation.component.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs font-medium text-amber-800 mb-1">
            Legacy Components (Deprecated)
          </p>
          <div className="text-xs text-amber-700">
            {annotation.component.map((c) => {
              const comp = componentCodes.find((cc) => cc.code === c);
              return (
                <span key={c} className="mr-2">
                  {c}{comp ? ` - ${comp.label}` : ""}
                </span>
              );
            })}
          </div>
          <p className="text-xs text-amber-600 mt-1">
            Use Structural Segments above instead
          </p>
        </div>
      )}

      {/* Defect ID - Spatial Awareness */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Defect ID <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={annotation.defect_id || ""}
          onChange={(e) => handleChange("defect_id", e.target.value.toUpperCase())}
          disabled={readOnly}
          placeholder="e.g., PIER-CR-001"
          pattern="[A-Z0-9-]*"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 uppercase"
        />
        <p className="mt-0.5 text-xs text-gray-400">
          Track this defect across inspections
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Notes
        </label>
        <textarea
          value={annotation.notes || ""}
          onChange={(e) => handleChange("notes", e.target.value)}
          disabled={readOnly}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
          placeholder="Optional notes..."
        />
      </div>
    </div>
  );
}
