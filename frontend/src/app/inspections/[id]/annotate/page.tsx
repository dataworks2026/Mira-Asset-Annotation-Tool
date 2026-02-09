"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/layout/AuthGuard";
import {
  AnnotationCanvas,
  AnnotationCanvasRef,
  AnnotationRect,
  CanvasTool,
} from "@/components/annotations/AnnotationCanvas";
import { AnnotationToolbar } from "@/components/annotations/AnnotationToolbar";
import { ImageNavigator } from "@/components/annotations/ImageNavigator";
import { LabelPanel } from "@/components/annotations/LabelPanel";
import { AnnotationList } from "@/components/annotations/AnnotationList";
import { useImages } from "@/hooks/useImages";
import { useAnnotations } from "@/hooks/useAnnotations";
import { useInspections } from "@/hooks/useInspections";
import { Inspection } from "@/types/inspection";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { showToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import {
  getAssetTypesForCategory,
  IndustryCategory,
  ELEVATION_ZONES,
  SIDE_FACE_OPTIONS,
} from "@/lib/referenceData";

export default function AnnotatePage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;
  const { images, loading, fetchImages, updateImageLocally } = useImages();
  const { getInspection } = useInspections();
  const {
    saving,
    dirty,
    markDirty,
    initializeFromImages,
    saveAllDirty,
  } = useAnnotations();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const isReadOnly = inspection?.status === "completed";

  // Read URL index parameter
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const indexParam = searchParams.get('index');
      return indexParam ? parseInt(indexParam, 10) : 0;
    }
    return 0;
  });
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [localAnnotations, setLocalAnnotations] = useState<
    Record<string, AnnotationRect[]>
  >({});
  const [saveError, setSaveError] = useState("");

  // Track asset_type per image locally (for unsaved changes)
  const [localAssetTypes, setLocalAssetTypes] = useState<Record<string, string>>({});
  // Track spatial awareness fields per image
  const [localSegments, setLocalSegments] = useState<Record<string, string>>({});
  const [localElevations, setLocalElevations] = useState<Record<string, string>>({});
  const [localSideFaces, setLocalSideFaces] = useState<Record<string, string>>({});
  // Track GPS coordinates per image
  const [localLatitudes, setLocalLatitudes] = useState<Record<string, number | undefined>>({});
  const [localLongitudes, setLocalLongitudes] = useState<Record<string, number | undefined>>({});
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef<AnnotationCanvasRef>(null);

  // Get inspection industry category
  const industryCategory = (inspection?.industry_category || "coastal") as IndustryCategory;
  const availableAssetTypes = getAssetTypesForCategory(industryCategory);

  useEffect(() => {
    fetchImages(inspectionId);
    getInspection(inspectionId).then(setInspection).catch(() => {});
  }, [inspectionId, fetchImages, getInspection]);

  // Navigate to URL index
  useEffect(() => {
    if (images.length === 0) return;

    // Set index from URL
    const searchParams = new URLSearchParams(window.location.search);
    const indexParam = searchParams.get('index');
    if (indexParam) {
      const targetIndex = parseInt(indexParam, 10);
      if (targetIndex >= 0 && targetIndex < images.length) {
        setCurrentIndex(targetIndex);
      }
    }
  }, [images.length]);

  // Initialize local state
  useEffect(() => {
    if (images.length === 0) return;
    const initial: Record<string, AnnotationRect[]> = {};
    const initialAssetTypes: Record<string, string> = {};
    const initialSegments: Record<string, string> = {};
    const initialElevations: Record<string, string> = {};
    const initialSideFaces: Record<string, string> = {};
    const initialLatitudes: Record<string, number | undefined> = {};
    const initialLongitudes: Record<string, number | undefined> = {};

    images.forEach((img) => {
      if (!localAnnotations[img.image_id]) {
        initial[img.image_id] = img.annotations.map((a) => ({ ...a }));
      }
      if (img.asset_type && !localAssetTypes[img.image_id]) {
        initialAssetTypes[img.image_id] = img.asset_type;
      }
      if (img.segment && !localSegments[img.image_id]) {
        initialSegments[img.image_id] = img.segment;
      }
      if (img.elevation && !localElevations[img.image_id]) {
        initialElevations[img.image_id] = img.elevation;
      }
      if (img.side_face && !localSideFaces[img.image_id]) {
        initialSideFaces[img.image_id] = img.side_face;
      }
      if (img.latitude !== undefined && !localLatitudes[img.image_id]) {
        initialLatitudes[img.image_id] = img.latitude;
      }
      if (img.longitude !== undefined && !localLongitudes[img.image_id]) {
        initialLongitudes[img.image_id] = img.longitude;
      }
    });

    if (Object.keys(initial).length > 0) {
      setLocalAnnotations((prev) => ({ ...initial, ...prev }));
      initializeFromImages(images);
    }
    if (Object.keys(initialAssetTypes).length > 0) {
      setLocalAssetTypes((prev) => ({ ...initialAssetTypes, ...prev }));
    }
    if (Object.keys(initialSegments).length > 0) {
      setLocalSegments((prev) => ({ ...initialSegments, ...prev }));
    }
    if (Object.keys(initialElevations).length > 0) {
      setLocalElevations((prev) => ({ ...initialElevations, ...prev }));
    }
    if (Object.keys(initialSideFaces).length > 0) {
      setLocalSideFaces((prev) => ({ ...initialSideFaces, ...prev }));
    }
    if (Object.keys(initialLatitudes).length > 0) {
      setLocalLatitudes((prev) => ({ ...initialLatitudes, ...prev }));
    }
    if (Object.keys(initialLongitudes).length > 0) {
      setLocalLongitudes((prev) => ({ ...initialLongitudes, ...prev }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const currentImage = images[currentIndex] || null;
  const currentAnnotations = currentImage
    ? localAnnotations[currentImage.image_id] || []
    : [];
  const selectedAnnotation =
    currentAnnotations.find(
      (a) => a.annotation_id === selectedAnnotationId
    ) || null;

  // Current image asset type
  const currentAssetType = currentImage
    ? localAssetTypes[currentImage.image_id] || currentImage.asset_type
    : undefined;

  // Reset on image change
  useEffect(() => {
    if (currentImage) {
      setImageLoaded(false);
    }
  }, [currentImage?.image_id]);

  // Check loading state
  const isLoadingImage = loading || (images.length > 0 && !currentImage) || (currentImage && !currentImage.s3_url) || (currentImage && currentImage.s3_url && !imageLoaded);

  const handleAnnotationsChange = useCallback(
    (updated: AnnotationRect[]) => {
      if (!currentImage || isReadOnly) return;
      setLocalAnnotations((prev) => ({
        ...prev,
        [currentImage.image_id]: updated,
      }));
      markDirty();
    },
    [currentImage, markDirty, isReadOnly]
  );

  const handleSelectionChange = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const handleDelete = useCallback(() => {
    canvasRef.current?.deleteSelected();
  }, []);

  const handleDeleteById = useCallback((id: string) => {
    canvasRef.current?.deleteAnnotationById(id);
  }, []);

  const handleNavigate = useCallback((index: number) => {
    setCurrentIndex(index);
    setSelectedAnnotationId(null);
    setActiveTool("select");
  }, []);

  const handleLabelUpdate = useCallback(
    (updated: AnnotationRect) => {
      if (!currentImage) return;
      setLocalAnnotations((prev) => {
        const list = prev[currentImage.image_id] || [];
        return {
          ...prev,
          [currentImage.image_id]: list.map((a) =>
            a.annotation_id === updated.annotation_id ? updated : a
          ),
        };
      });
      markDirty();
    },
    [currentImage, markDirty]
  );

  // Handle asset type change for current image
  const handleAssetTypeChange = useCallback(
    async (newAssetType: string) => {
      if (!currentImage || isReadOnly) return;

      // Update local state immediately
      setLocalAssetTypes((prev) => ({
        ...prev,
        [currentImage.image_id]: newAssetType,
      }));

      // Save to backend
      try {
        await api.patch(`/api/images/${currentImage.image_id}`, {
          asset_type: newAssetType,
        });
        // Update the image in the hook's state
        if (updateImageLocally) {
          updateImageLocally(currentImage.image_id, { asset_type: newAssetType });
        }
        showToast("success", "Asset type updated");
      } catch (err) {
        showToast("error", "Failed to update asset type");
      }
    },
    [currentImage, isReadOnly, updateImageLocally]
  );

  // Handle spatial field changes
  const handleSpatialFieldChange = useCallback(
    async (field: "segment" | "elevation" | "side_face", value: string) => {
      if (!currentImage || isReadOnly) return;

      // Update local state immediately
      const setters = {
        segment: setLocalSegments,
        elevation: setLocalElevations,
        side_face: setLocalSideFaces,
      };

      setters[field]((prev) => ({
        ...prev,
        [currentImage.image_id]: value,
      }));

      // Save to backend
      try {
        await api.patch(`/api/images/${currentImage.image_id}`, {
          [field]: value || null,
        });
        // Update the image in the hook's state
        if (updateImageLocally) {
          updateImageLocally(currentImage.image_id, { [field]: value || undefined });
        }
        const fieldLabels = {
          segment: "Segment",
          elevation: "Elevation",
          side_face: "Side/Face",
        };
        showToast("success", `${fieldLabels[field]} updated`);
      } catch (err) {
        showToast("error", `Failed to update ${field}`);
      }
    },
    [currentImage, isReadOnly, updateImageLocally]
  );

  // Handle GPS coordinate changes
  const handleGPSFieldChange = useCallback(
    async (field: "latitude" | "longitude", value: string) => {
      if (!currentImage || isReadOnly) return;

      const numValue = value === "" ? undefined : parseFloat(value);

      // Validate range
      if (numValue !== undefined) {
        if (field === "latitude" && (numValue < -90 || numValue > 90)) {
          showToast("error", "Latitude must be between -90 and 90");
          return;
        }
        if (field === "longitude" && (numValue < -180 || numValue > 180)) {
          showToast("error", "Longitude must be between -180 and 180");
          return;
        }
      }

      // Update local state immediately
      const setters = {
        latitude: setLocalLatitudes,
        longitude: setLocalLongitudes,
      };

      setters[field]((prev) => ({
        ...prev,
        [currentImage.image_id]: numValue,
      }));

      // Save to backend
      try {
        await api.patch(`/api/images/${currentImage.image_id}`, {
          [field]: numValue,
        });
        // Update the image in the hook's state
        if (updateImageLocally) {
          updateImageLocally(currentImage.image_id, { [field]: numValue });
        }
        const fieldLabels = {
          latitude: "Latitude",
          longitude: "Longitude",
        };
        showToast("success", `${fieldLabels[field]} updated`);
      } catch (err) {
        showToast("error", `Failed to update ${field}`);
      }
    },
    [currentImage, isReadOnly, updateImageLocally]
  );

  const handleSave = useCallback(async () => {
    setSaveError("");
    try {
      await saveAllDirty(localAnnotations);
      showToast("success", "Annotations saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setSaveError(msg);
      showToast("error", msg);
    }
  }, [localAnnotations, saveAllDirty]);

  // Keyboard shortcuts handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      // Ctrl/Cmd+S to save
      if (!isReadOnly && (e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      switch (e.key) {
        case "v":
        case "V":
          setActiveTool("select");
          break;
        case "b":
        case "B":
          if (!isReadOnly) setActiveTool("draw");
          break;
        case "o":
        case "O":
          if (!isReadOnly) setActiveTool("draw_ellipse");
          break;
        case "Delete":
        case "Backspace":
          if (!isReadOnly) handleDelete();
          break;
        case "ArrowLeft":
          if (currentIndex > 0) handleNavigate(currentIndex - 1);
          break;
        case "ArrowRight":
          if (currentIndex < images.length - 1)
            handleNavigate(currentIndex + 1);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, handleDelete, handleNavigate, handleSave, isReadOnly]);

  if (isLoadingImage) {
    return (
      <AuthGuard>
        {/* Preload image during loading */}
        {currentImage && currentImage.s3_url && (
          <img
            src={currentImage.s3_url}
            alt=""
            style={{ display: 'none' }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        )}
        <div className="flex h-screen items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="mb-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            </div>
            <p className="text-sm font-medium text-gray-700">Loading images...</p>
            <p className="mt-1 text-xs text-gray-500">Please wait</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (images.length === 0) {
    return (
      <AuthGuard>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-500">
            No images to annotate. Upload images first.
          </p>
          <Link
            href={`/inspections/${inspectionId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Inspection
          </Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col bg-gray-100">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/inspections/${inspectionId}`)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; Back
            </button>
            {inspection && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {inspection.asset_name}
                </span>
                {inspection.industry_category && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    {inspection.industry_category.charAt(0).toUpperCase() + inspection.industry_category.slice(1)}
                  </span>
                )}
              </div>
            )}
            <div className="h-4 w-px bg-gray-300" />
            <ImageNavigator
              images={images}
              currentIndex={currentIndex}
              onNavigate={handleNavigate}
            />
          </div>

          <div className="flex items-center gap-3">
            {isReadOnly ? (
              <span className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
                Read-Only — Inspection Completed
              </span>
            ) : (
              <>
                <AnnotationToolbar
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                  onDelete={handleDelete}
                  hasSelection={selectedAnnotationId !== null}
                />

                <div className="mx-1 h-6 w-px bg-gray-200" />

                {/* Dirty indicator */}
                {dirty && (
                  <span className="text-xs text-amber-600">Unsaved changes</span>
                )}

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Save error */}
        <ErrorAlert message={saveError} className="px-4 py-2 border-b border-red-200" />

        {/* Main content: canvas + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas area */}
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary>
              {currentImage && (
                <AnnotationCanvas
                  ref={canvasRef}
                  imageUrl={currentImage.s3_url}
                  annotations={currentAnnotations}
                  activeTool={isReadOnly ? "select" : activeTool}
                  onAnnotationsChange={handleAnnotationsChange}
                  onSelectionChange={handleSelectionChange}
                />
              )}
            </ErrorBoundary>
          </div>

          {/* Right sidebar */}
          <div className="w-72 flex-shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-3 space-y-4">
            {/* Image Asset Type Selector */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                Image Asset Type
              </h3>
              <select
                value={currentAssetType || ""}
                onChange={(e) => handleAssetTypeChange(e.target.value)}
                disabled={isReadOnly}
                aria-label="Image Asset Type"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">-- Select Asset Type --</option>
                {availableAssetTypes.map((at) => (
                  <option key={at.value} value={at.value}>
                    {at.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Set the asset type for this specific image
              </p>
            </div>

            {/* Spatial Awareness Fields */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase text-blue-700 mb-2">
                Location Context
              </h3>

              {/* Segment */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Segment/Bay
                </label>
                <input
                  type="text"
                  value={
                    currentImage
                      ? localSegments[currentImage.image_id] || currentImage.segment || ""
                      : ""
                  }
                  onChange={(e) => handleSpatialFieldChange("segment", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g., Segment 1, Bay 3"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              {/* Elevation */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Elevation
                </label>
                <select
                  value={
                    currentImage
                      ? localElevations[currentImage.image_id] || currentImage.elevation || ""
                      : ""
                  }
                  onChange={(e) => handleSpatialFieldChange("elevation", e.target.value)}
                  disabled={isReadOnly}
                  aria-label="Elevation Zone"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">-- Select --</option>
                  {ELEVATION_ZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Side/Face */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Side/Face
                </label>
                <select
                  value={
                    currentImage
                      ? localSideFaces[currentImage.image_id] || currentImage.side_face || ""
                      : ""
                  }
                  onChange={(e) => handleSpatialFieldChange("side_face", e.target.value)}
                  disabled={isReadOnly}
                  aria-label="Side Face Orientation"
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">-- Select --</option>
                  {SIDE_FACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      currentImage
                        ? (localLatitudes[currentImage.image_id] ?? currentImage.latitude ?? "")
                        : ""
                    }
                    onChange={(e) => handleGPSFieldChange("latitude", e.target.value)}
                    disabled={isReadOnly}
                    placeholder="e.g., 40.7128"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      currentImage
                        ? (localLongitudes[currentImage.image_id] ?? currentImage.longitude ?? "")
                        : ""
                    }
                    onChange={(e) => handleGPSFieldChange("longitude", e.target.value)}
                    disabled={isReadOnly}
                    placeholder="e.g., -74.0060"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 pt-1">
                Track defect location across inspections
              </p>
            </div>

            {/* Annotations List */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                Annotations ({currentAnnotations.length})
              </h3>
              <AnnotationList
                annotations={currentAnnotations}
                selectedId={selectedAnnotationId}
                onSelect={handleSelectionChange}
                onDelete={handleDeleteById}
                readOnly={isReadOnly}
              />
            </div>

            {/* Labels Panel */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                Labels
              </h3>
              <LabelPanel
                annotation={selectedAnnotation}
                onUpdate={handleLabelUpdate}
                readOnly={isReadOnly}
                assetType={currentAssetType}
                industryCategory={industryCategory}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
