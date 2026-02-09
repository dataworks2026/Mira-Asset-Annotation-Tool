"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { InspectionImage, ImageListResponse } from "@/types/image";

const PRELOAD_WINDOW = 2; // Load current +/- 2 images

interface LazyImageData extends InspectionImage {
  isLoaded: boolean;
}

export function useLazyImages() {
  const [allImages, setAllImages] = useState<LazyImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const loadedIndices = useRef<Set<number>>(new Set());

  // Fetch metadata for all images (without presigned URLs for performance)
  const fetchImageMetadata = useCallback(async (inspectionId: string) => {
    setLoading(true);
    try {
      const data = await api.get<ImageListResponse>(
        `/api/inspections/${inspectionId}/images?include_urls=false`
      );
      // Mark all as not loaded initially
      const lazyImages: LazyImageData[] = data.images.map((img) => ({
        ...img,
        isLoaded: false,
      }));
      setAllImages(lazyImages);
      loadedIndices.current.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  // Load presigned URL for a specific image
  const loadSingleImage = useCallback(async (imageId: string, index: number) => {
    if (loadedIndices.current.has(index)) return;

    try {
      const imageData = await api.get<InspectionImage>(`/api/images/${imageId}`);

      setAllImages((prev) =>
        prev.map((img, idx) =>
          idx === index
            ? { ...img, s3_url: imageData.s3_url, isLoaded: true }
            : img
        )
      );
      loadedIndices.current.add(index);
    } catch (err) {
      console.error(`Failed to load image ${imageId}:`, err);
    }
  }, []);

  // Load images within the window around current index
  const loadImagesInWindow = useCallback(
    async (index: number) => {
      const start = Math.max(0, index - PRELOAD_WINDOW);
      const end = Math.min(allImages.length - 1, index + PRELOAD_WINDOW);

      const loadPromises: Promise<void>[] = [];
      for (let i = start; i <= end; i++) {
        if (!loadedIndices.current.has(i) && allImages[i]) {
          loadPromises.push(loadSingleImage(allImages[i].image_id, i));
        }
      }

      await Promise.all(loadPromises);
    },
    [allImages, loadSingleImage]
  );

  // Update current index and trigger loading
  const navigateToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= allImages.length) return;
      setCurrentIndex(index);
      loadImagesInWindow(index);
    },
    [allImages.length, loadImagesInWindow]
  );

  // Load images when currentIndex changes or allImages updates
  useEffect(() => {
    if (allImages.length > 0) {
      loadImagesInWindow(currentIndex);
    }
  }, [currentIndex, allImages.length, loadImagesInWindow]);

  // Update a single image locally
  const updateImageLocally = useCallback(
    (imageId: string, updates: Partial<InspectionImage>) => {
      setAllImages((prev) =>
        prev.map((img) =>
          img.image_id === imageId ? { ...img, ...updates } : img
        )
      );
    },
    []
  );

  // Get current image
  const currentImage = allImages[currentIndex] || null;

  return {
    images: allImages,
    currentImage,
    currentIndex,
    loading,
    fetchImageMetadata,
    navigateToIndex,
    updateImageLocally,
    totalImages: allImages.length,
  };
}
