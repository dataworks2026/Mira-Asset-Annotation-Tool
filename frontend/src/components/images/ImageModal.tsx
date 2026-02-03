"use client";

import { useEffect, useCallback } from "react";
import { InspectionImage } from "@/types/image";
import { Badge } from "@/components/ui/Badge";
import { ANNOTATION_STATUS_CONFIG } from "@/lib/statusConfig";

interface ImageModalProps {
  image: InspectionImage;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function ImageModal({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: ImageModalProps) {
  const status = ANNOTATION_STATUS_CONFIG[image.annotation_status] || ANNOTATION_STATUS_CONFIG.not_started;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-gray-50">
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
              onClick={onPrev}
              disabled={!hasPrev}
              className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
            >
              &larr; Previous
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
