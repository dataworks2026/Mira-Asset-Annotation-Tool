"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  InspectionImage,
  ImageListResponse,
  UploadUrlResponse,
} from "@/types/image";

export interface UploadProgress {
  filename: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function useImages() {
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const fetchImages = useCallback(async (inspectionId: string) => {
    setLoading(true);
    try {
      const data = await api.get<ImageListResponse>(
        `/api/inspections/${inspectionId}/images?include_urls=true`
      );
      setImages(data.images);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadImages = useCallback(
    async (inspectionId: string, files: File[]) => {
      setUploading(true);

      // Init progress
      const progress: UploadProgress[] = files.map((f) => ({
        filename: f.name,
        status: "pending",
      }));
      setUploadProgress([...progress]);

      try {
        // Get presigned URLs
        const fileInfos = files.map((f) => ({
          filename: f.name,
          content_type: f.type || "image/jpeg",
        }));

        const urlResponse = await api.post<UploadUrlResponse>(
          `/api/inspections/${inspectionId}/upload-urls`,
          { files: fileInfos }
        );

        // Upload with parallel execution and concurrency control
        const MAX_RETRIES = 3;
        const CONCURRENCY = 5; // Upload 5 files at a time for optimal performance

        // Function to upload a single file with retry logic
        const uploadFile = async (index: number) => {
          const urlInfo = urlResponse.upload_urls[index];
          progress[index].status = "uploading";
          setUploadProgress([...progress]);

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              const resp = await fetch(urlInfo.upload_url, {
                method: "PUT",
                body: files[index],
                headers: { "Content-Type": files[index].type || "image/jpeg" },
              });

              if (!resp.ok) {
                throw new Error(`Upload failed: ${resp.status}`);
              }

              progress[index].status = "done";
              setUploadProgress([...progress]);
              return;
            } catch (err) {
              if (attempt < MAX_RETRIES - 1) {
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
              } else {
                progress[index].status = "error";
                progress[index].error =
                  err instanceof Error ? err.message : "Upload failed";
                setUploadProgress([...progress]);
              }
            }
          }
        };

        // Process uploads with concurrency limit using a queue
        const processQueue = async () => {
          const activeUploads: Promise<void>[] = [];

          for (let i = 0; i < urlResponse.upload_urls.length; i++) {
            // Start upload
            const uploadPromise = uploadFile(i);
            activeUploads.push(uploadPromise);

            // If we've reached concurrency limit, wait for one to finish
            if (activeUploads.length >= CONCURRENCY) {
              await Promise.race(activeUploads);
              // Remove finished uploads
              const stillActive = activeUploads.filter(async (p) => {
                const settled = await Promise.race([p, Promise.resolve(false)]);
                return settled === false;
              });
              activeUploads.length = 0;
              activeUploads.push(...stillActive);
            }
          }

          // Wait for all remaining uploads to complete
          await Promise.allSettled(activeUploads);
        };

        await processQueue();

        // Refresh images
        await fetchImages(inspectionId);
      } finally {
        setUploading(false);
      }
    },
    [fetchImages]
  );

  // Update a single image locally (without refetching)
  const updateImageLocally = useCallback(
    (imageId: string, updates: Partial<InspectionImage>) => {
      setImages((prev) =>
        prev.map((img) =>
          img.image_id === imageId ? { ...img, ...updates } : img
        )
      );
    },
    []
  );

  const deleteImage = useCallback(
    async (imageId: string, deleteS3Files: boolean = false): Promise<void> => {
      const query = deleteS3Files ? "?delete_s3_files=true" : "";
      await api.delete(`/api/images/${imageId}${query}`);
    },
    []
  );

  return {
    images,
    loading,
    uploading,
    uploadProgress,
    fetchImages,
    uploadImages,
    updateImageLocally,
    deleteImage,
  };
}
