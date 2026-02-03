"use client";

import { useState } from "react";
import { InspectionImage } from "@/types/image";
import { ImageThumbnail } from "./ImageThumbnail";
import { ImageModal } from "./ImageModal";

interface ImageGalleryProps {
  images: InspectionImage[];
  loading: boolean;
}

export function ImageGallery({ images, loading }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading images...</p>;
  }

  if (images.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No images uploaded yet.</p>
      </div>
    );
  }

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <ImageThumbnail
            key={image.image_id}
            image={image}
            onClick={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      {selectedImage && selectedIndex !== null && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedIndex(null)}
          onPrev={() => setSelectedIndex(selectedIndex - 1)}
          onNext={() => setSelectedIndex(selectedIndex + 1)}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < images.length - 1}
        />
      )}
    </>
  );
}
