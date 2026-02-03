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
        `/api/inspections/${inspectionId}/images`
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

        // Upload with retry
        const MAX_RETRIES = 3;
        for (let i = 0; i < urlResponse.upload_urls.length; i++) {
          const urlInfo = urlResponse.upload_urls[i];
          progress[i].status = "uploading";
          setUploadProgress([...progress]);

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              const resp = await fetch(urlInfo.upload_url, {
                method: "PUT",
                body: files[i],
                headers: { "Content-Type": files[i].type || "image/jpeg" },
              });

              if (!resp.ok) {
                throw new Error(`Upload failed: ${resp.status}`);
              }

              progress[i].status = "done";
              break;
            } catch (err) {
              if (attempt < MAX_RETRIES - 1) {
                // Exponential backoff
                await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
              } else {
                progress[i].status = "error";
                progress[i].error =
                  err instanceof Error ? err.message : "Upload failed";
              }
            }
          }

          setUploadProgress([...progress]);
        }

        // Refresh images
        await fetchImages(inspectionId);
      } finally {
        setUploading(false);
      }
    },
    [fetchImages]
  );

  return {
    images,
    loading,
    uploading,
    uploadProgress,
    fetchImages,
    uploadImages,
  };
}
