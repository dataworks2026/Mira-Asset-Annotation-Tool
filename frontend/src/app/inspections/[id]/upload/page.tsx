"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { ImageUploader } from "@/components/images/ImageUploader";
import { useImages } from "@/hooks/useImages";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { showToast } from "@/components/ui/Toast";

export default function UploadPage() {
  const params = useParams();
  const inspectionId = params.id as string;
  const { images, loading, uploading, uploadProgress, fetchImages, uploadImages } =
    useImages();
  const [error, setError] = useState("");

  useEffect(() => {
    fetchImages(inspectionId);
  }, [inspectionId, fetchImages]);

  async function handleUpload(files: File[]) {
    setError("");
    try {
      await uploadImages(inspectionId, files);

      // Check upload results
      const successful = uploadProgress.filter(p => p.status === "done").length;
      const failed = uploadProgress.filter(p => p.status === "error").length;

      if (failed === 0) {
        showToast("success", `${successful} image${successful > 1 ? "s" : ""} uploaded successfully`);
      } else if (successful === 0) {
        showToast("error", `All ${failed} upload${failed > 1 ? "s" : ""} failed`);
        setError(`All uploads failed. Check your internet connection and try again.`);
      } else {
        showToast("info", `${successful} uploaded, ${failed} failed`);
        setError(`${failed} file${failed > 1 ? "s" : ""} failed to upload. You can retry them.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      showToast("error", msg);
    }
  }

  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href={`/inspections/${inspectionId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to Inspection
        </Link>

        <h2 className="mt-2 text-xl font-semibold text-gray-900 mb-6">
          Upload Images
        </h2>

        <ErrorAlert message={error} className="mb-4" />

        <ImageUploader
          onUpload={handleUpload}
          uploading={uploading}
          progress={uploadProgress}
        />

        {/* Already uploaded images */}
        {!loading && images.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Uploaded ({images.length})
            </h3>
            <ul className="space-y-1">
              {images.map((img) => (
                <li
                  key={img.image_id}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="truncate text-gray-700">{img.filename}</span>
                  <span className="text-xs text-gray-400">
                    {img.annotation_status.replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
