"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { InspectionImage } from "@/types/image";
import { AnnotationRect } from "@/components/annotations/AnnotationCanvas";

export function useAnnotations() {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<
    Record<string, AnnotationRect[]>
  >({});
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const initializeFromImages = useCallback((images: InspectionImage[]) => {
    const state: Record<string, AnnotationRect[]> = {};
    images.forEach((img) => {
      state[img.image_id] = img.annotations.map((a) => ({ ...a }));
    });
    setLastSavedState(state);
  }, []);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  const saveAnnotations = useCallback(
    async (imageId: string, annotations: AnnotationRect[]) => {
      setSaving(true);
      try {
        await api.put<InspectionImage>(
          `/api/images/${imageId}/annotations`,
          { annotations }
        );
        setLastSavedState((prev) => ({
          ...prev,
          [imageId]: annotations.map((a) => ({ ...a })),
        }));
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const saveAllDirty = useCallback(
    async (localAnnotations: Record<string, AnnotationRect[]>) => {
      setSaving(true);
      try {
        const imageIds = Object.keys(localAnnotations);
        for (const imageId of imageIds) {
          const current = localAnnotations[imageId];
          const saved = lastSavedState[imageId];

          // Skip unchanged
          if (JSON.stringify(current) !== JSON.stringify(saved)) {
            // Clean annotations: remove empty arrays for optional fields
            const cleanedAnnotations = current.map(annot => {
              const cleaned = { ...annot };
              // If structural_segments is empty array, set to undefined
              if (cleaned.structural_segments && cleaned.structural_segments.length === 0) {
                cleaned.structural_segments = undefined;
              }
              return cleaned;
            });

            await api.put<InspectionImage>(
              `/api/images/${imageId}/annotations`,
              { annotations: cleanedAnnotations }
            );
          }
        }
        setLastSavedState(
          Object.fromEntries(
            Object.entries(localAnnotations).map(([k, v]) => [
              k,
              v.map((a) => ({ ...a })),
            ])
          )
        );
        setDirty(false);
      } finally {
        setSaving(false);
      }
    },
    [lastSavedState]
  );

  // Warn on unsaved leave
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    saving,
    dirty,
    markDirty,
    setDirty,
    initializeFromImages,
    saveAnnotations,
    saveAllDirty,
  };
}
