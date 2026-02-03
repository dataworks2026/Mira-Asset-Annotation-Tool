"use client";

import { AnnotationRect } from "./AnnotationCanvas";
import {
  getDamageTypeByCode,
  getSeverityByLevel,
  getComponentByCode,
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
        const component = annot.component
          ? getComponentByCode(annot.component)
          : null;
        const isSelected = annot.annotation_id === selectedId;

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
                  {damageType
                    ? damageType.label
                    : `${annot.shape_type === "ellipse" ? "Oval" : "Box"} ${index + 1}`}
                </span>
              </div>
              {(severity || component) && (
                <div className="text-xs text-gray-500 mt-0.5 ml-4">
                  {severity && `Sev ${severity.level}`}
                  {severity && component && " · "}
                  {component && component.code}
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
