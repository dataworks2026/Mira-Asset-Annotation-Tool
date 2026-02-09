"use client";

import { STRUCTURAL_SEGMENTS } from "@/lib/referenceData";

interface StructuralSegmentSelectorProps {
  selectedSegments: string[];
  onChange: (segments: string[]) => void;
  readOnly?: boolean;
}

export function StructuralSegmentSelector({
  selectedSegments,
  onChange,
  readOnly = false,
}: StructuralSegmentSelectorProps) {
  const handleToggle = (code: string) => {
    if (readOnly) return;

    const updated = selectedSegments.includes(code)
      ? selectedSegments.filter((s) => s !== code)
      : [...selectedSegments, code];

    onChange(updated);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Structural Segments <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-gray-400 mb-2">
        Select all structural components affected by this damage
      </p>
      <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 p-1.5 space-y-0.5">
        {STRUCTURAL_SEGMENTS.map((segment) => {
          const checked = selectedSegments.includes(segment.code);
          return (
            <label
              key={segment.code}
              className={`flex items-center gap-2 rounded px-1.5 py-1 text-sm cursor-pointer transition-colors ${
                checked ? "bg-blue-50" : "hover:bg-gray-50"
              } ${readOnly ? "cursor-default" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggle(segment.code)}
                disabled={readOnly}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-gray-700 flex-1">
                <span className="font-medium">{segment.code}</span> - {segment.name}
              </span>
              {segment.category && (
                <span className="text-xs text-gray-400">{segment.category}</span>
              )}
            </label>
          );
        })}
      </div>
      {selectedSegments.length === 0 && (
        <p className="mt-1 text-xs text-red-500">
          ⚠️ At least one structural segment is required
        </p>
      )}
    </div>
  );
}
