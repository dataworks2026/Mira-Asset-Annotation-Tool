"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Canvas, Rect, Ellipse, FabricImage, FabricObject, FabricText, TPointerEventInfo } from "fabric";
import { Annotation, BoundingBox, ShapeType } from "@/types/image";
import { getSeverityByLevel, SEVERITY_LEVELS } from "@/lib/referenceData";

export type CanvasTool = "select" | "draw" | "draw_ellipse";

export interface AnnotationRect extends Annotation {
  fabricId?: string;
}

export interface AnnotationCanvasRef {
  deleteSelected: () => void;
  deleteAnnotationById: (id: string) => void;
  getAnnotations: () => AnnotationRect[];
}

interface AnnotationCanvasProps {
  imageUrl: string;
  annotations: AnnotationRect[];
  activeTool: CanvasTool;
  onAnnotationsChange: (annotations: AnnotationRect[]) => void;
  onSelectionChange: (annotationId: string | null) => void;
  readOnly?: boolean;
}

function generateId(): string {
  // return crypto.randomUUID(); // Use this when on HTTPS
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const DEFAULT_FILL = "rgba(255, 0, 0, 0.15)";
const DEFAULT_STROKE = "rgba(255, 0, 0, 0.8)";

const SEVERITY_COLORS: Record<number, string> = {
  1: "rgba(34, 197, 94, 0.85)",
  2: "rgba(234, 179, 8, 0.85)",
  3: "rgba(249, 115, 22, 0.85)",
  4: "rgba(239, 68, 68, 0.85)",
};
const DEFAULT_LABEL_BG = "rgba(255, 0, 0, 0.85)";

function getShapeStyle(severity?: number) {
  const sev = severity ? getSeverityByLevel(severity) : null;
  return {
    fill: sev ? sev.fillColor : DEFAULT_FILL,
    stroke: sev ? sev.strokeColor : DEFAULT_STROKE,
    strokeWidth: 2,
    cornerColor: sev ? sev.strokeColor : DEFAULT_STROKE,
    cornerSize: 8,
    transparentCorners: false,
    cornerStyle: "circle" as const,
    hasRotatingPoint: false,
    lockRotation: true,
  };
}

function buildLabel(annot: AnnotationRect): string {
  const parts: string[] = [];
  if (annot.damage_type) {
    parts.push(annot.damage_type);
  }
  if (annot.severity) {
    const sevData = SEVERITY_LEVELS.find((s) => s.level === annot.severity);
    parts.push(`Sev ${annot.severity}` + (sevData ? ` (${sevData.label})` : ""));
  }
  // Get structural segments
  const segments = annot.structural_segments || annot.component;
  if (segments && segments.length > 0) {
    parts.push(segments.join(", "));
  }
  return parts.join(" | ");
}

type AnnotatedFabricObject = FabricObject & { annotationId?: string; isLabel?: boolean };

const AnnotationCanvasInner = forwardRef<
  AnnotationCanvasRef,
  AnnotationCanvasProps
>(function AnnotationCanvasInner(
  {
    imageUrl,
    annotations,
    activeTool,
    onAnnotationsChange,
    onSelectionChange,
    readOnly = false,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const annotationsRef = useRef<AnnotationRect[]>(annotations);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeShapeRef = useRef<FabricObject | null>(null);
  const copiedAnnotationRef = useRef<AnnotationRect | null>(null);
  const imageScaleRef = useRef<{ scaleX: number; scaleY: number; offsetX: number; offsetY: number }>({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Sync annotations ref
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Canvas to image coords
  const canvasToImage = useCallback((bbox: BoundingBox): BoundingBox => {
    const { scaleX, scaleY, offsetX, offsetY } = imageScaleRef.current;
    return {
      x: (bbox.x - offsetX) / scaleX,
      y: (bbox.y - offsetY) / scaleY,
      width: bbox.width / scaleX,
      height: bbox.height / scaleY,
    };
  }, []);

  // Image to canvas coords
  const imageToCanvas = useCallback((bbox: BoundingBox): BoundingBox => {
    const { scaleX, scaleY, offsetX, offsetY } = imageScaleRef.current;
    return {
      x: bbox.x * scaleX + offsetX,
      y: bbox.y * scaleY + offsetY,
      width: bbox.width * scaleX,
      height: bbox.height * scaleY,
    };
  }, []);

  // Sync shapes to canvas
  const syncShapesToCanvas = useCallback(
    (canvas: Canvas, annots: AnnotationRect[]) => {
      // Preserve the currently active object's annotation ID
      const activeObject = canvas.getActiveObject();
      const activeAnnotationId = activeObject ? (activeObject as AnnotatedFabricObject).annotationId : null;

      // Remove existing shapes and labels
      const objects = canvas.getObjects().filter(
        (obj) => obj.type === "rect" || obj.type === "ellipse" || (obj as AnnotatedFabricObject).isLabel
      );
      objects.forEach((obj) => canvas.remove(obj));

      // Add annotation shapes and labels
      let objectToReselect: FabricObject | null = null;
      annots.forEach((annot) => {
        const canvasBbox = imageToCanvas(annot.bbox);
        const shapeType = annot.shape_type || "rect";
        const style = getShapeStyle(annot.severity);

        let shape: FabricObject;
        if (shapeType === "ellipse") {
          shape = new Ellipse({
            left: canvasBbox.x,
            top: canvasBbox.y,
            rx: canvasBbox.width / 2,
            ry: canvasBbox.height / 2,
            ...style,
            selectable: !readOnly,
            evented: !readOnly,
          });
        } else {
          shape = new Rect({
            left: canvasBbox.x,
            top: canvasBbox.y,
            width: canvasBbox.width,
            height: canvasBbox.height,
            ...style,
            selectable: !readOnly,
            evented: !readOnly,
          });
        }

        (shape as AnnotatedFabricObject).annotationId = annot.annotation_id;
        canvas.add(shape);

        // If this was the previously selected annotation, remember it for reselection
        if (activeAnnotationId && annot.annotation_id === activeAnnotationId) {
          objectToReselect = shape;
        }

        // Add label text above the shape
        const labelText = buildLabel(annot);
        if (labelText) {
          const fontSize = Math.max(10, Math.min(14, canvasBbox.width / 12));
          const bgColor = annot.severity
            ? SEVERITY_COLORS[annot.severity] || DEFAULT_LABEL_BG
            : DEFAULT_LABEL_BG;

          const label = new FabricText(labelText, {
            left: canvasBbox.x,
            top: canvasBbox.y - fontSize - 6,
            fontSize,
            fill: "#ffffff",
            backgroundColor: bgColor,
            fontFamily: "sans-serif",
            fontWeight: "bold",
            padding: 3,
            selectable: false,
            evented: false,
          });
          (label as AnnotatedFabricObject).annotationId = annot.annotation_id;
          (label as AnnotatedFabricObject).isLabel = true;

          // If label would go off-canvas top, place below shape
          if ((label.top || 0) < 0) {
            label.set({ top: canvasBbox.y + canvasBbox.height + 2 });
          }

          canvas.add(label);
        }
      });

      // Reselect the previously selected annotation if it still exists
      if (objectToReselect && !readOnly) {
        canvas.setActiveObject(objectToReselect);
      }

      canvas.renderAll();
    },
    [imageToCanvas, readOnly]
  );

  // Init canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      selection: false,
    });

    fabricRef.current = canvas;

    // Load background
    FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then(
      (img) => {
        if (!fabricRef.current) return;

        const imgWidth = img.width || 1;
        const imgHeight = img.height || 1;
        const scale = Math.min(width / imgWidth, height / imgHeight);

        const offsetX = (width - imgWidth * scale) / 2;
        const offsetY = (height - imgHeight * scale) / 2;

        imageScaleRef.current = {
          scaleX: scale,
          scaleY: scale,
          offsetX,
          offsetY,
        };

        img.set({
          left: offsetX,
          top: offsetY,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = img;
        canvas.renderAll();

        // Sync annotations
        syncShapesToCanvas(canvas, annotationsRef.current);
      }
    );

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // Sync on external changes
  useEffect(() => {
    if (!fabricRef.current) return;
    syncShapesToCanvas(fabricRef.current, annotations);
  }, [annotations, syncShapesToCanvas]);

  // Handle tool changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const isDrawMode = (activeTool === "draw" || activeTool === "draw_ellipse") && !readOnly;

    if (isDrawMode) {
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      canvas.hoverCursor = "crosshair";
      canvas.discardActiveObject();
      canvas.renderAll();
      canvas.getObjects().forEach((obj) => {
        if (obj.type === "rect" || obj.type === "ellipse") {
          obj.selectable = false;
          obj.evented = false;
        }
      });
    } else {
      canvas.selection = false;
      canvas.defaultCursor = "default";
      canvas.hoverCursor = "move";
      canvas.getObjects().forEach((obj) => {
        if ((obj.type === "rect" || obj.type === "ellipse") && !(obj as AnnotatedFabricObject).isLabel) {
          obj.selectable = !readOnly;
          obj.evented = !readOnly;
        }
      });
    }
  }, [activeTool, readOnly]);

  // Canvas event handlers
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || readOnly) return;

    const handleMouseDown = (opt: TPointerEventInfo) => {
      if (activeTool !== "draw" && activeTool !== "draw_ellipse") return;
      const pointer = canvas.getScenePoint(opt.e);
      isDrawingRef.current = true;
      drawStartRef.current = { x: pointer.x, y: pointer.y };

      const style = getShapeStyle();
      let shape: FabricObject;

      if (activeTool === "draw_ellipse") {
        shape = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          ...style,
          selectable: false,
          evented: false,
        });
      } else {
        shape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          ...style,
          selectable: false,
          evented: false,
        });
      }

      activeShapeRef.current = shape;
      canvas.add(shape);
    };

    const handleMouseMove = (opt: TPointerEventInfo) => {
      if (!isDrawingRef.current || !drawStartRef.current || !activeShapeRef.current)
        return;

      const pointer = canvas.getScenePoint(opt.e);
      const start = drawStartRef.current;

      const left = Math.min(start.x, pointer.x);
      const top = Math.min(start.y, pointer.y);
      const width = Math.abs(pointer.x - start.x);
      const height = Math.abs(pointer.y - start.y);

      if (activeShapeRef.current.type === "ellipse") {
        (activeShapeRef.current as Ellipse).set({
          left,
          top,
          rx: width / 2,
          ry: height / 2,
        });
      } else {
        (activeShapeRef.current as Rect).set({ left, top, width, height });
      }
      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current || !activeShapeRef.current) return;

      isDrawingRef.current = false;
      const shape = activeShapeRef.current;
      activeShapeRef.current = null;
      drawStartRef.current = null;

      let width: number;
      let height: number;
      if (shape.type === "ellipse") {
        const ellipse = shape as Ellipse;
        width = (ellipse.rx || 0) * 2;
        height = (ellipse.ry || 0) * 2;
      } else {
        width = (shape as Rect).width || 0;
        height = (shape as Rect).height || 0;
      }

      // Min size threshold
      if (width < 5 || height < 5) {
        canvas.remove(shape);
        canvas.renderAll();
        return;
      }

      const annotationId = generateId();
      (shape as AnnotatedFabricObject).annotationId = annotationId;
      shape.set({ selectable: true, evented: true });

      const shapeType: ShapeType = shape.type === "ellipse" ? "ellipse" : "rect";

      const imageBbox = canvasToImage({
        x: shape.left || 0,
        y: shape.top || 0,
        width,
        height,
      });

      const newAnnotation: AnnotationRect = {
        annotation_id: annotationId,
        bbox: imageBbox,
        shape_type: shapeType,
      };

      const updated = [...annotationsRef.current, newAnnotation];
      annotationsRef.current = updated;
      onAnnotationsChange(updated);

      // Auto-select the newly created annotation to open the classification panel
      if (!readOnly) {
        canvas.setActiveObject(shape);
        onSelectionChange(annotationId);
        canvas.renderAll();
      }
    };

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active && (active as AnnotatedFabricObject).annotationId) {
        onSelectionChange(
          (active as AnnotatedFabricObject).annotationId || null
        );
      }
    };

    const handleSelectionCleared = () => {
      onSelectionChange(null);
    };

    const handleObjectModified = (opt: { target: FabricObject }) => {
      const obj = opt.target as AnnotatedFabricObject;
      if (!obj.annotationId) return;

      const bound = obj.getBoundingRect();
      const imageBbox = canvasToImage({
        x: bound.left,
        y: bound.top,
        width: bound.width,
        height: bound.height,
      });

      const updated = annotationsRef.current.map((a) =>
        a.annotation_id === obj.annotationId ? { ...a, bbox: imageBbox } : a
      );
      annotationsRef.current = updated;
      onAnnotationsChange(updated);
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleSelectionCleared);
    canvas.on("object:modified", handleObjectModified);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:modified", handleObjectModified);
    };
  }, [activeTool, readOnly, canvasToImage, onAnnotationsChange, onSelectionChange]);

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    deleteSelected: () => {
      const canvas = fabricRef.current;
      if (!canvas || readOnly) return;

      const active = canvas.getActiveObject();
      if (!active) return;

      const annotationId = (active as AnnotatedFabricObject).annotationId;
      if (!annotationId) return;

      // Remove shape and its label
      const toRemove = canvas.getObjects().filter(
        (o) => (o as AnnotatedFabricObject).annotationId === annotationId
      );
      toRemove.forEach((o) => canvas.remove(o));
      canvas.discardActiveObject();
      canvas.renderAll();

      const updated = annotationsRef.current.filter(
        (a) => a.annotation_id !== annotationId
      );
      annotationsRef.current = updated;
      onAnnotationsChange(updated);
      onSelectionChange(null);
    },
    deleteAnnotationById: (id: string) => {
      const canvas = fabricRef.current;
      if (!canvas || readOnly) return;

      // Remove shape and its label
      const toRemove = canvas.getObjects().filter(
        (o) => (o as AnnotatedFabricObject).annotationId === id
      );
      toRemove.forEach((o) => canvas.remove(o));
      canvas.discardActiveObject();
      canvas.renderAll();

      const updated = annotationsRef.current.filter(
        (a) => a.annotation_id !== id
      );
      annotationsRef.current = updated;
      onAnnotationsChange(updated);
      onSelectionChange(null);
    },
    getAnnotations: () => annotationsRef.current,
  }));

  // Copy-Paste functionality with Ctrl+C / Ctrl+V
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Check if Ctrl/Cmd is pressed
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Copy: Ctrl+C or Cmd+C
      if (isCtrlOrCmd && e.key === 'c') {
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;

        const annotationId = (activeObject as AnnotatedFabricObject).annotationId;
        if (!annotationId) return;

        // Find and copy the annotation data
        const annotation = annotationsRef.current.find(a => a.annotation_id === annotationId);
        if (annotation) {
          copiedAnnotationRef.current = annotation;
          e.preventDefault();
          console.log('Annotation copied');
        }
      }

      // Paste: Ctrl+V or Cmd+V
      if (isCtrlOrCmd && e.key === 'v') {
        const copiedAnnotation = copiedAnnotationRef.current;
        if (!copiedAnnotation) return;

        e.preventDefault();

        // Create a new annotation with offset position
        const offset = 20; // Offset in pixels
        const newAnnotation: AnnotationRect = {
          ...copiedAnnotation,
          annotation_id: generateId(),
          bbox: {
            x: copiedAnnotation.bbox.x + offset,
            y: copiedAnnotation.bbox.y + offset,
            width: copiedAnnotation.bbox.width,
            height: copiedAnnotation.bbox.height,
          },
        };

        const updated = [...annotationsRef.current, newAnnotation];
        annotationsRef.current = updated;
        onAnnotationsChange(updated);
        onSelectionChange(newAnnotation.annotation_id);
        console.log('Annotation pasted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [readOnly, onAnnotationsChange, onSelectionChange]);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-gray-900">
      <canvas ref={canvasRef} />
    </div>
  );
});

export { AnnotationCanvasInner as AnnotationCanvas };
