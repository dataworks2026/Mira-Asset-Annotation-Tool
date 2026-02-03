"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { ImageGallery } from "@/components/images/ImageGallery";
import { CompletionModal } from "@/components/inspections/CompletionModal";
import { showToast } from "@/components/ui/Toast";
import { useInspections } from "@/hooks/useInspections";
import { useImages } from "@/hooks/useImages";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { api } from "@/lib/api";
import { Inspection } from "@/types/inspection";

export default function InspectionDetailPage() {
  const params = useParams();
  const { getInspection, completeInspection } = useInspections();
  const { images, loading: imagesLoading, fetchImages } = useImages();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getInspection(params.id as string);
        setInspection(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, getInspection]);

  useEffect(() => {
    if (params.id) {
      fetchImages(params.id as string);
    }
  }, [params.id, fetchImages]);

  const handleDownloadAnnotated = async () => {
    if (!inspection) return;
    setDownloading(true);
    try {
      const blob = await api.downloadBlob(
        `/api/inspections/${inspection.inspection_id}/download-annotated`
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inspection.asset_name}_annotated.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        <ErrorAlert message={error} />

        {inspection && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <Link
                  href="/inspections"
                  className="text-sm text-blue-600 hover:underline"
                >
                  &larr; Back to Inspections
                </Link>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">
                  {inspection.asset_name}
                </h2>
              </div>
              <Badge
                label={
                  inspection.status === "completed"
                    ? "Completed"
                    : "In Progress"
                }
                variant={
                  inspection.status === "completed" ? "green" : "yellow"
                }
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-gray-500">Asset Type</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {inspection.asset_type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Inspection Date</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {inspection.inspection_date}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Inspector</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {inspection.inspector_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total Images</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {inspection.total_images}
                  </dd>
                </div>
                {inspection.inspection_type && (
                  <div>
                    <dt className="text-gray-500">Inspection Type</dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.inspection_type}
                    </dd>
                  </div>
                )}
                {inspection.weather_conditions && (
                  <div>
                    <dt className="text-gray-500">Weather</dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.weather_conditions}
                    </dd>
                  </div>
                )}
                {inspection.notes && (
                  <div className="col-span-2">
                    <dt className="text-gray-500">Notes</dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="mt-6 flex gap-3">
              {inspection.status !== "completed" && (
                <>
                  <Link
                    href={`/inspections/${inspection.inspection_id}/upload`}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Upload Images
                  </Link>
                  <Link
                    href={`/inspections/${inspection.inspection_id}/annotate`}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annotate
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowCompletionModal(true)}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Complete Inspection
                  </button>
                </>
              )}
              {inspection.status === "completed" && (
                <>
                  <Link
                    href={`/inspections/${inspection.inspection_id}/annotate`}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Annotations
                  </Link>
                  <button
                    type="button"
                    onClick={handleDownloadAnnotated}
                    disabled={downloading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-default transition-colors"
                  >
                    {downloading ? "Downloading..." : "Download Annotated Images"}
                  </button>
                </>
              )}
            </div>

            {/* Image Gallery */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Images{!imagesLoading && images.length > 0 && ` (${images.length})`}
              </h3>
              <ImageGallery images={images} loading={imagesLoading} />
            </div>
          </div>
        )}
      </main>

      {showCompletionModal && inspection && (
        <CompletionModal
          assetName={inspection.asset_name}
          onConfirm={async () => {
            const updated = await completeInspection(inspection.inspection_id);
            setInspection(updated);
            setShowCompletionModal(false);
            showToast("success", "Inspection completed and submitted for processing");
          }}
          onCancel={() => setShowCompletionModal(false)}
        />
      )}
    </AuthGuard>
  );
}
