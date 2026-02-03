"use client";

import { InspectionImage } from "@/types/image";
import { Badge } from "@/components/ui/Badge";
import { ANNOTATION_STATUS_CONFIG } from "@/lib/statusConfig";

interface ImageThumbnailProps {
  image: InspectionImage;
  onClick: () => void;
}

export function ImageThumbnail({ image, onClick }: ImageThumbnailProps) {
  const status = ANNOTATION_STATUS_CONFIG[image.annotation_status] || ANNOTATION_STATUS_CONFIG.not_started;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left w-full"
    >
      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.s3_url}
          alt={image.filename}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          loading="lazy"
        />
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
  );
}
