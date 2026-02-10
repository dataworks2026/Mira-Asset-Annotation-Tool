"use client";

import { InspectionImage } from "@/types/image";
import { Badge } from "@/components/ui/Badge";
import { ANNOTATION_STATUS_CONFIG } from "@/lib/statusConfig";
import { getImageUrl } from "@/lib/api";

interface ImageThumbnailProps {
  image: InspectionImage;
  onClick: () => void;
  onDelete?: (imageId: string) => void;
  showAnnotateButton?: boolean;
}

export function ImageThumbnail({ image, onClick, onDelete, showAnnotateButton = false }: ImageThumbnailProps) {
  const status = ANNOTATION_STATUS_CONFIG[image.annotation_status] || ANNOTATION_STATUS_CONFIG.not_started;

  return (
    <div className="relative group">
      {/* Delete button - shown on hover */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.image_id);
          }}
          className="absolute top-2 right-2 z-10 rounded-full bg-red-600 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
          aria-label="Delete image"
          title="Delete image"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={onClick}
        className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left w-full"
      >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getImageUrl(image.s3_url)}
          alt={image.filename}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          loading="lazy"
        />
        {/* Hover overlay to indicate clickability */}
        {showAnnotateButton && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 shadow-lg">
              Click to Annotate
            </div>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs text-gray-700" title={image.filename}>
          {image.filename}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <Badge label={status.label} variant={status.variant} />
          {image.num_annotations > 0 && (
            <span className="text-xs text-gray-500">
              {image.num_annotations} annotation{image.num_annotations !== 1 && "s"}
            </span>
          )}
        </div>
      </div>
      </button>
    </div>
  );
}
