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
          file_size: f.size,
        }));

        const urlResponse = await api.post<UploadUrlResponse>(
          `/api/inspections/${inspectionId}/upload-urls`,
          { files: fileInfos }
        );

        // Enhanced upload configuration
        const MAX_RETRIES = 5;
        const CONCURRENCY = 3; // Reduced for stability
        const UPLOAD_TIMEOUT = 120000; // 2 minutes per file

        // Upload single file with timeout and retry
        const uploadFile = async (index: number): Promise<void> => {
          const urlInfo = urlResponse.upload_urls[index];
          const file = files[index];

          progress[index].status = "uploading";
          setUploadProgress([...progress]);

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              // Create abort controller for timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

              const resp = await fetch(urlInfo.upload_url, {
                method: "PUT",
                body: file,
                headers: {
                  "Content-Type": file.type || "image/jpeg",
                },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!resp.ok) {
                throw new Error(`Upload failed: ${resp.status} ${resp.statusText}`);
              }

              progress[index].status = "done";
              setUploadProgress([...progress]);
              return;
            } catch (err) {
              const isTimeout = err instanceof Error && err.name === "AbortError";
              const errorMsg = isTimeout
                ? "Upload timeout - file too large or slow connection"
                : err instanceof Error ? err.message : "Upload failed";

              if (attempt < MAX_RETRIES - 1) {
                // Exponential backoff: 2s, 4s, 8s, 16s
                const delay = 2000 * Math.pow(2, attempt);
                console.log(`Retry ${attempt + 1}/${MAX_RETRIES} for ${file.name} after ${delay}ms`);
                await new Promise((r) => setTimeout(r, delay));
              } else {
                progress[index].status = "error";
                progress[index].error = errorMsg;
                setUploadProgress([...progress]);
                console.error(`Failed to upload ${file.name}:`, errorMsg);
              }
            }
          }
        };

        // Process with concurrency control
        const processQueue = async () => {
          const executing: Promise<void>[] = [];

          for (let i = 0; i < urlResponse.upload_urls.length; i++) {
            const uploadPromise = uploadFile(i).then(() => {
              // Remove from executing when done
              const idx = executing.indexOf(uploadPromise);
              if (idx > -1) executing.splice(idx, 1);
            });

            executing.push(uploadPromise);

            // Wait if concurrency limit reached
            if (executing.length >= CONCURRENCY) {
              await Promise.race(executing);
            }
          }

          // Wait for remaining uploads
          await Promise.allSettled(executing);
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
