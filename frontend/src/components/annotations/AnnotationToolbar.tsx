"use client";

import { CanvasTool } from "./AnnotationCanvas";

interface AnnotationToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onDelete: () => void;
  hasSelection: boolean;
  readOnly?: boolean;
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  onDelete,
  hasSelection,
  readOnly = false,
}: AnnotationToolbarProps) {
  if (readOnly) return null;

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onToolChange("select")}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTool === "select"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        title="Select / Move (V)"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          Select
        </span>
      </button>

      <button
        onClick={() => onToolChange("draw")}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTool === "draw"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        title="Draw Bounding Box (B)"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Box
        </span>
      </button>

      <button
        onClick={() => onToolChange("draw_ellipse")}
        className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
          activeTool === "draw_ellipse"
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        title="Draw Oval (O)"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <ellipse cx="12" cy="12" rx="10" ry="7" />
          </svg>
          Oval
        </span>
      </button>

      <div className="mx-1 h-6 w-px bg-gray-200" />

      <button
        onClick={onDelete}
        disabled={!hasSelection}
        className="rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-default transition-colors"
        title="Delete Selected (Delete)"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </span>
      </button>
    </div>
  );
}
