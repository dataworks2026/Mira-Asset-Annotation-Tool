"use client";

import { useState, useRef, DragEvent } from "react";
import { UploadProgress } from "@/hooks/useImages";

const MAX_FILES = 100;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

interface ImageUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  uploading: boolean;
  progress: UploadProgress[];
}

export function ImageUploader({
  onUpload,
  uploading,
  progress,
}: ImageUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError("");

    const files = Array.from(fileList).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} file(s) exceed 50MB limit and were skipped`);
    }

    const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE);

    setSelectedFiles((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed. Only first ${MAX_FILES} will be uploaded.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles);
    setSelectedFiles([]);
  }

  const showProgress = progress.length > 0 && uploading;
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600 font-medium">
          Drag & drop images here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">
          JPEG and PNG only • Up to {MAX_FILES} files • Max 50MB per file
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Selected files list */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {selectedFiles.length} file{selectedFiles.length !== 1 && "s"} selected
              <span className="ml-2 text-gray-500 font-normal">({totalSizeMB} MB)</span>
            </p>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-2">
            {selectedFiles.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-3 text-gray-400 hover:text-red-500 text-xs flex-shrink-0"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleUpload}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Upload {selectedFiles.length} Image{selectedFiles.length !== 1 && "s"}
          </button>
        </div>
      )}

      {/* Upload progress */}
      {showProgress && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Uploading files...</p>
              <p className="text-xs text-gray-500">
                {progress.filter(p => p.status === "done").length} / {progress.length} complete
              </p>
            </div>
            {/* Overall progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.filter(p => p.status === "done").length / progress.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Individual file progress */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-200 rounded-md p-2">
            {progress.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {p.status === "pending" && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  {p.status === "uploading" && (
                    <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  )}
                  {p.status === "done" && (
                    <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {p.status === "error" && (
                    <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Filename */}
                <span className="truncate flex-1 text-gray-700">
                  {p.filename}
                </span>

                {/* Status text */}
                {p.status === "pending" && (
                  <span className="text-xs text-gray-400 flex-shrink-0">Waiting</span>
                )}
                {p.status === "uploading" && (
                  <span className="text-xs text-blue-600 flex-shrink-0">Uploading...</span>
                )}
                {p.status === "done" && (
                  <span className="text-xs text-green-600 flex-shrink-0">✓ Done</span>
                )}
                {p.status === "error" && (
                  <span className="text-xs text-red-600 flex-shrink-0" title={p.error}>
                    ✗ Failed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
