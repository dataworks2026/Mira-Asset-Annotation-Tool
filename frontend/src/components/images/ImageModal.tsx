"use client";

import { useEffect, useCallback, useState } from "react";
import { InspectionImage } from "@/types/image";
import { Badge } from "@/components/ui/Badge";
import { ANNOTATION_STATUS_CONFIG } from "@/lib/statusConfig";
import { ELEVATION_ZONES, SIDE_FACE_OPTIONS } from "@/lib/referenceData";
import { api } from "@/lib/api";
import { showToast } from "@/components/ui/Toast";

interface ImageModalProps {
  image: InspectionImage;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onImageUpdate?: (imageId: string, updates: Partial<InspectionImage>) => void;
}

export function ImageModal({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onImageUpdate,
}: ImageModalProps) {
  const status = ANNOTATION_STATUS_CONFIG[image.annotation_status] || ANNOTATION_STATUS_CONFIG.not_started;

  // Local state for editable fields
  const [localSegment, setLocalSegment] = useState(image.segment || "");
  const [localElevation, setLocalElevation] = useState(image.elevation || "");
  const [localSideFace, setLocalSideFace] = useState(image.side_face || "");
  const [saving, setSaving] = useState(false);

  // Update local state when image changes (navigation)
  useEffect(() => {
    setLocalSegment(image.segment || "");
    setLocalElevation(image.elevation || "");
    setLocalSideFace(image.side_face || "");
  }, [image.image_id, image.segment, image.elevation, image.side_face]);

  const handleFieldUpdate = async (field: "segment" | "elevation" | "side_face", value: string) => {
    setSaving(true);
    try {
      await api.patch(`/api/images/${image.image_id}`, {
        [field]: value || null,
      });

      // Update parent component state if callback provided
      if (onImageUpdate) {
        onImageUpdate(image.image_id, { [field]: value || undefined });
      }

      showToast("success", `${field === "segment" ? "Segment" : field === "elevation" ? "Elevation" : "Side/Face"} updated`);
    } catch (err) {
      showToast("error", `Failed to update ${field}`);
      // Revert local state on error
      if (field === "segment") setLocalSegment(image.segment || "");
      if (field === "elevation") setLocalElevation(image.elevation || "");
      if (field === "side_face") setLocalSideFace(image.side_face || "");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't interfere with keyboard if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="truncate text-sm font-medium text-gray-900">
                {image.filename}
              </h3>
              <Badge label={status.label} variant={status.variant} />
              {image.num_annotations > 0 && (
                <span className="whitespace-nowrap text-xs text-gray-500">
                  {image.num_annotations} annotation{image.num_annotations !== 1 && "s"}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-gray-50 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.s3_url}
              alt={image.filename}
              className="max-h-[75vh] max-w-full object-contain"
            />
          </div>

          {/* Navigation */}
          {(hasPrev || hasNext) && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!hasPrev}
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
              >
                &larr; Previous
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!hasNext}
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Sidebar with editable metadata */}
        <div className="w-72 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Image Details</h4>

          <div className="space-y-3">
            {/* Segment/Bay */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Segment/Bay
              </label>
              <input
                type="text"
                value={localSegment}
                onChange={(e) => setLocalSegment(e.target.value)}
                onBlur={() => {
                  if (localSegment !== (image.segment || "")) {
                    handleFieldUpdate("segment", localSegment);
                  }
                }}
                disabled={saving}
                placeholder="e.g., Segment 1, Bay 3"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
              />
            </div>

            {/* Elevation */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Elevation
              </label>
              <select
                value={localElevation}
                onChange={(e) => {
                  setLocalElevation(e.target.value);
                  handleFieldUpdate("elevation", e.target.value);
                }}
                disabled={saving}
                aria-label="Elevation Zone"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
              >
                <option value="">-- Select --</option>
                {ELEVATION_ZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Side/Face */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Side/Face
              </label>
              <select
                value={localSideFace}
                onChange={(e) => {
                  setLocalSideFace(e.target.value);
                  handleFieldUpdate("side_face", e.target.value);
                }}
                disabled={saving}
                aria-label="Side Face Orientation"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:opacity-50"
              >
                <option value="">-- Select --</option>
                {SIDE_FACE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Type (read-only for now, set in annotation page) */}
            {image.asset_type && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Asset Type
                </label>
                <div className="text-sm text-gray-900 py-1">
                  {image.asset_type}
                </div>
              </div>
            )}

            {saving && (
              <p className="text-xs text-blue-600">Saving...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
