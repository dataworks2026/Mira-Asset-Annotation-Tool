"use client";

import { AnnotationRect } from "./AnnotationCanvas";
import {
  getDamageTypeByCode,
  getSeverityByLevel,
  formatStructuralSegments,
} from "@/lib/referenceData";

interface AnnotationListProps {
  annotations: AnnotationRect[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export function AnnotationList({
  annotations,
  selectedId,
  onSelect,
  onDelete,
  readOnly = false,
}: AnnotationListProps) {
  if (annotations.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-2">
        No annotations yet. Use the Draw Box tool to create one.
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {annotations.map((annot, index) => {
        const damageType = annot.damage_type
          ? getDamageTypeByCode(annot.damage_type)
          : null;
        const severity = annot.severity
          ? getSeverityByLevel(annot.severity)
          : null;

        // NEW: Structural segments (preferred)
        const structuralSegments = annot.structural_segments || [];
        const hasStructuralSegments = structuralSegments.length > 0;
        const segmentsDisplay = formatStructuralSegments(structuralSegments);

        // OLD: Legacy component codes (deprecated)
        const componentCodes = annot.component && annot.component.length > 0
          ? annot.component
          : [];
        const hasComponents = componentCodes.length > 0;

        const isSelected = annot.annotation_id === selectedId;

        // Create summary label: DAMAGE_CODE-SEVERITY | SEGMENTS
        // Example: "CO-2 | SZ" or "BG-3 | BH & SZ"
        let summaryLabel = "";
        if (damageType && severity && hasStructuralSegments) {
          summaryLabel = `${damageType.code}-${severity.level} | ${segmentsDisplay}`;
        }

        return (
          <li
            key={annot.annotation_id}
            onClick={() => onSelect(annot.annotation_id)}
            className={`flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer transition-colors ${
              isSelected
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {severity && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: severity.strokeColor }}
                  />
                )}
                <span className="font-medium text-gray-800 truncate">
                  {summaryLabel || (damageType
                    ? damageType.label
                    : `${annot.shape_type === "ellipse" ? "Oval" : "Box"} ${index + 1}`)}
                </span>
              </div>

              {/* Show warning if no structural segments */}
              {!hasStructuralSegments && damageType && (
                <div className="text-xs text-amber-600 mt-0.5 ml-4">
                  ⚠️ Needs structural segment assignment
                </div>
              )}

              {/* Show legacy components if present (deprecated) */}
              {hasComponents && !hasStructuralSegments && (
                <div className="text-xs text-gray-400 mt-0.5 ml-4">
                  Legacy: {componentCodes.join(", ")}
                </div>
              )}
            </div>
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(annot.annotation_id);
                }}
                className="ml-2 text-gray-300 hover:text-red-500 flex-shrink-0"
                title="Delete annotation"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
