"use client";

import { useState, useRef, DragEvent } from "react";
import { UploadProgress } from "@/hooks/useImages";

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
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    setSelectedFiles((prev) => [...prev, ...files]);
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
        <p className="text-sm text-gray-600">
          Drag & drop images here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">JPEG and PNG only</p>
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {selectedFiles.length} file{selectedFiles.length !== 1 && "s"}{" "}
            selected
          </p>
          <ul className="max-h-48 overflow-y-auto space-y-1">
            {selectedFiles.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm"
              >
                <span className="truncate text-gray-700">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="ml-2 text-gray-400 hover:text-red-500 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpload}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Upload {selectedFiles.length} Image
            {selectedFiles.length !== 1 && "s"}
          </button>
        </div>
      )}

      {/* Upload progress */}
      {showProgress && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700">Uploading...</p>
          {progress.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm"
            >
              <span className="truncate flex-1 text-gray-600">
                {p.filename}
              </span>
              {p.status === "pending" && (
                <span className="text-gray-400">Waiting</span>
              )}
              {p.status === "uploading" && (
                <span className="text-blue-600">Uploading...</span>
              )}
              {p.status === "done" && (
                <span className="text-green-600">Done</span>
              )}
              {p.status === "error" && (
                <span className="text-red-600">{p.error || "Failed"}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
