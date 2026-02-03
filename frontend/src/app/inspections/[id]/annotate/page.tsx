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

export default function AnnotatePage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;
  const { images, loading, fetchImages } = useImages();
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [localAnnotations, setLocalAnnotations] = useState<
    Record<string, AnnotationRect[]>
  >({});
  const [saveError, setSaveError] = useState("");

  const canvasRef = useRef<AnnotationCanvasRef>(null);

  useEffect(() => {
    fetchImages(inspectionId);
    getInspection(inspectionId).then(setInspection).catch(() => {});
  }, [inspectionId, fetchImages, getInspection]);

  // Init local annotations
  useEffect(() => {
    if (images.length === 0) return;
    const initial: Record<string, AnnotationRect[]> = {};
    images.forEach((img) => {
      if (!localAnnotations[img.image_id]) {
        initial[img.image_id] = img.annotations.map((a) => ({ ...a }));
      }
    });
    if (Object.keys(initial).length > 0) {
      setLocalAnnotations((prev) => ({ ...initial, ...prev }));
      initializeFromImages(images);
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

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center">
          <p className="text-sm text-gray-400">Loading...</p>
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

            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                Labels
              </h3>
              <LabelPanel
                annotation={selectedAnnotation}
                onUpdate={handleLabelUpdate}
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
