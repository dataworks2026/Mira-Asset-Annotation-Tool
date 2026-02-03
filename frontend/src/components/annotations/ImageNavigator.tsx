"use client";

import { InspectionImage } from "@/types/image";

interface ImageNavigatorProps {
  images: InspectionImage[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function ImageNavigator({
  images,
  currentIndex,
  onNavigate,
}: ImageNavigatorProps) {
  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onNavigate(currentIndex - 1)}
        disabled={currentIndex === 0}
        className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
        title="Previous image"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-sm text-gray-600 whitespace-nowrap">
        {currentIndex + 1} / {images.length}
      </span>

      <button
        onClick={() => onNavigate(currentIndex + 1)}
        disabled={currentIndex === images.length - 1}
        className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
        title="Next image"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <span className="truncate text-sm text-gray-500 max-w-[200px]" title={current.filename}>
        {current.filename}
      </span>
    </div>
  );
}
