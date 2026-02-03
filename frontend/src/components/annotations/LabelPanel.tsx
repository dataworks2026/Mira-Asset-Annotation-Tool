"use client";

import { AnnotationRect } from "./AnnotationCanvas";
import {
  DAMAGE_TYPES,
  SEVERITY_LEVELS,
  COMPONENT_CODES,
} from "@/lib/referenceData";

interface LabelPanelProps {
  annotation: AnnotationRect | null;
  onUpdate: (updated: AnnotationRect) => void;
  readOnly?: boolean;
}

export function LabelPanel({ annotation, onUpdate, readOnly = false }: LabelPanelProps) {
  if (!annotation) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-400">
          Select an annotation to edit its labels.
        </p>
      </div>
    );
  }

  function handleChange(field: string, value: string | number) {
    if (!annotation) return;
    onUpdate({ ...annotation, [field]: value || undefined });
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
          {DAMAGE_TYPES.map((dt) => (
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

      {/* Component Code */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Component
        </label>
        <select
          value={annotation.component || ""}
          onChange={(e) => handleChange("component", e.target.value)}
          disabled={readOnly}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        >
          <option value="">-- Select --</option>
          {COMPONENT_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} - {c.label}
            </option>
          ))}
        </select>
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
