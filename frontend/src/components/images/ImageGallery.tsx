"use client";

import { useState, useCallback, useEffect } from "react";
import { InspectionImage } from "@/types/image";
import { ImageThumbnail } from "./ImageThumbnail";
import { ImageModal } from "./ImageModal";
import { DeleteImageModal } from "./DeleteImageModal";

interface ImageGalleryProps {
  images: InspectionImage[];
  loading: boolean;
  onImageUpdate?: (imageId: string, updates: Partial<InspectionImage>) => void;
  onImageDelete?: (imageId: string, deleteS3Files: boolean) => Promise<void>;
  onImageClick?: (imageId: string, index: number) => void;
  inspectionId?: string;
}

export function ImageGallery({ images, loading, onImageUpdate, onImageDelete, onImageClick, inspectionId }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [localImages, setLocalImages] = useState<InspectionImage[]>(images);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);

  // Update local images when prop changes
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const handleImageUpdate = useCallback((imageId: string, updates: Partial<InspectionImage>) => {
    // Update local state
    setLocalImages((prev) =>
      prev.map((img) =>
        img.image_id === imageId ? { ...img, ...updates } : img
      )
    );

    // Call parent callback if provided
    if (onImageUpdate) {
      onImageUpdate(imageId, updates);
    }
  }, [onImageUpdate]);

  const handleDeleteClick = useCallback((imageId: string) => {
    setDeleteImageId(imageId);
  }, []);

  const handleDeleteConfirm = useCallback(async (deleteS3Files: boolean) => {
    if (!deleteImageId) return;

    // Call parent delete handler
    if (onImageDelete) {
      await onImageDelete(deleteImageId, deleteS3Files);
    }

    // Remove from local state
    setLocalImages((prev) => prev.filter((img) => img.image_id !== deleteImageId));
    setDeleteImageId(null);

    // Close modal if deleting currently selected image
    if (selectedIndex !== null && localImages[selectedIndex]?.image_id === deleteImageId) {
      setSelectedIndex(null);
    }
  }, [deleteImageId, onImageDelete, selectedIndex, localImages]);

  if (loading) {
    return <p className="text-sm text-gray-400">Loading images...</p>;
  }

  if (localImages.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No images uploaded yet.</p>
      </div>
    );
  }

  const selectedImage = selectedIndex !== null ? localImages[selectedIndex] : null;
  const deleteImage = deleteImageId ? localImages.find(img => img.image_id === deleteImageId) : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {localImages.map((image, index) => (
          <ImageThumbnail
            key={image.image_id}
            image={image}
            onClick={() => {
              if (onImageClick) {
                onImageClick(image.image_id, index);
              } else {
                setSelectedIndex(index);
              }
            }}
            onDelete={onImageDelete ? handleDeleteClick : undefined}
            showAnnotateButton={!!onImageClick}
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
          hasNext={selectedIndex < localImages.length - 1}
          onImageUpdate={handleImageUpdate}
        />
      )}

      {/* Delete Modal */}
      {deleteImage && (
        <DeleteImageModal
          imageId={deleteImage.image_id}
          filename={deleteImage.filename}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteImageId(null)}
        />
      )}
    </>
  );
}
