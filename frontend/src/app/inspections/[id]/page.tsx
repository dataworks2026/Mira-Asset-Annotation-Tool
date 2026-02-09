"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { ImageGallery } from "@/components/images/ImageGallery";
import { CompletionModal } from "@/components/inspections/CompletionModal";
import { DeleteInspectionModal } from "@/components/inspections/DeleteInspectionModal";
import { showToast } from "@/components/ui/Toast";
import { useInspections } from "@/hooks/useInspections";
import { useImages } from "@/hooks/useImages";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { api } from "@/lib/api";
import { Inspection } from "@/types/inspection";

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getInspection, completeInspection, deleteInspection } = useInspections();
  const { images, loading: imagesLoading, fetchImages, updateImageLocally, deleteImage } = useImages();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    asset_name: "",
    inspection_date: "",
    inspector_name: "",
    inspection_type: "",
    weather_conditions: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getInspection(params.id as string);
        setInspection(data);
        // Initialize edit form with current values
        setEditForm({
          asset_name: data.asset_name || "",
          inspection_date: data.inspection_date || "",
          inspector_name: data.inspector_name || "",
          inspection_type: data.inspection_type || "",
          weather_conditions: data.weather_conditions || "",
          notes: data.notes || "",
        });
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

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form to current inspection values
      if (inspection) {
        setEditForm({
          asset_name: inspection.asset_name || "",
          inspection_date: inspection.inspection_date || "",
          inspector_name: inspection.inspector_name || "",
          inspection_type: inspection.inspection_type || "",
          weather_conditions: inspection.weather_conditions || "",
          notes: inspection.notes || "",
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!inspection) return;
    setSaving(true);
    try {
      await api.put(`/api/inspections/${inspection.inspection_id}`, {
        asset_name: editForm.asset_name,
        inspection_date: editForm.inspection_date,
        inspector_name: editForm.inspector_name,
        inspection_type: editForm.inspection_type || undefined,
        weather_conditions: editForm.weather_conditions || undefined,
        notes: editForm.notes || undefined,
      });

      // Reload inspection data
      const updated = await getInspection(inspection.inspection_id);
      setInspection(updated);
      setIsEditing(false);
      showToast("success", "Inspection details updated");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deleteS3Files: boolean) => {
    if (!inspection) return;
    try {
      await deleteInspection(inspection.inspection_id, deleteS3Files);
      showToast("success", "Inspection deleted successfully");
      router.push("/inspections");
    } catch (err) {
      throw err; // Let modal handle the error
    }
  };

  const handleImageDelete = async (imageId: string, deleteS3Files: boolean) => {
    try {
      await deleteImage(imageId, deleteS3Files);
      showToast("success", "Image deleted successfully");
      // Refresh inspection to update total_images count
      const updated = await getInspection(params.id as string);
      setInspection(updated);
    } catch (err) {
      throw err; // Let modal handle error
    }
  };

  const updateEditField = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
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
              <div className="flex-1">
                <Link
                  href="/inspections"
                  className="text-sm text-blue-600 hover:underline"
                >
                  &larr; Back to Inspections
                </Link>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.asset_name}
                    onChange={(e) => updateEditField("asset_name", e.target.value)}
                    className="mt-2 text-xl font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent w-full max-w-md"
                    placeholder="Asset/Location Name"
                  />
                ) : (
                  <h2 className="mt-2 text-xl font-semibold text-gray-900">
                    {inspection.asset_name}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-3">
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
                {inspection.status !== "completed" && (
                  <>
                    <button
                      type="button"
                      onClick={isEditing ? handleSaveChanges : handleEditToggle}
                      disabled={saving}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : isEditing ? "Save Changes" : "Edit Details"}
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleEditToggle}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {/* Industry Category - Read-only (can't change after creation) */}
                <div>
                  <dt className="text-gray-500">Industry Category</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {inspection.industry_category
                      ? inspection.industry_category.charAt(0).toUpperCase() + inspection.industry_category.slice(1)
                      : "Coastal"}
                  </dd>
                  {isEditing && (
                    <p className="mt-1 text-xs text-gray-400">
                      Cannot be changed after creation
                    </p>
                  )}
                </div>

                {/* Inspection Date */}
                <div>
                  <dt className="text-gray-500">Inspection Date</dt>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.inspection_date}
                      onChange={(e) => updateEditField("inspection_date", e.target.value)}
                      aria-label="Inspection Date"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.inspection_date}
                    </dd>
                  )}
                </div>

                {/* Inspector Name */}
                <div>
                  <dt className="text-gray-500">Inspector</dt>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.inspector_name}
                      onChange={(e) => updateEditField("inspector_name", e.target.value)}
                      aria-label="Inspector Name"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.inspector_name}
                    </dd>
                  )}
                </div>

                {/* Total Images */}
                <div>
                  <dt className="text-gray-500">Total Images</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {inspection.total_images}
                  </dd>
                </div>

                {/* Inspection Type */}
                <div>
                  <dt className="text-gray-500">Inspection Type</dt>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.inspection_type}
                      onChange={(e) => updateEditField("inspection_type", e.target.value)}
                      placeholder="e.g., Routine, Special"
                      aria-label="Inspection Type"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.inspection_type || "—"}
                    </dd>
                  )}
                </div>

                {/* Weather Conditions */}
                <div>
                  <dt className="text-gray-500">Weather</dt>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.weather_conditions}
                      onChange={(e) => updateEditField("weather_conditions", e.target.value)}
                      placeholder="e.g., Clear, 72F"
                      aria-label="Weather Conditions"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.weather_conditions || "—"}
                    </dd>
                  )}
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => updateEditField("notes", e.target.value)}
                      rows={3}
                      placeholder="Any additional observations..."
                      aria-label="Notes"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <dd className="mt-1 font-medium text-gray-900">
                      {inspection.notes || "—"}
                    </dd>
                  )}
                </div>
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

              {/* Delete button - shown for all inspection states */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="ml-auto rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete Inspection
              </button>
            </div>

            {/* Image Gallery */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Images{!imagesLoading && images.length > 0 && ` (${images.length})`}
              </h3>
              <ImageGallery
                images={images}
                loading={imagesLoading}
                onImageUpdate={(imageId, updates) => {
                  if (updateImageLocally) {
                    updateImageLocally(imageId, updates);
                  }
                }}
                onImageDelete={handleImageDelete}
                onImageClick={(imageId, index) => {
                  router.push(`/inspections/${inspection.inspection_id}/annotate?index=${index}`);
                }}
                inspectionId={inspection.inspection_id}
              />
            </div>
          </div>
        )}
      </main>

      {showCompletionModal && inspection && (
        <CompletionModal
          assetName={inspection.asset_name || "Unknown Asset"}
          onConfirm={async () => {
            const updated = await completeInspection(inspection.inspection_id);
            setInspection(updated);
            setShowCompletionModal(false);
            showToast("success", "Inspection completed and submitted for processing");
          }}
          onCancel={() => setShowCompletionModal(false)}
        />
      )}

      {showDeleteModal && inspection && (
        <DeleteInspectionModal
          inspectionId={inspection.inspection_id}
          assetName={inspection.asset_name || "Unknown Asset"}
          totalImages={inspection.total_images}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </AuthGuard>
  );
}
