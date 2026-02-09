"use client";

import { useState } from "react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

interface DeleteInspectionModalProps {
  inspectionId: string;
  assetName: string;
  totalImages: number;
  onConfirm: (deleteS3Files: boolean) => Promise<void>;
  onCancel: () => void;
}

export function DeleteInspectionModal({
  inspectionId,
  assetName,
  totalImages,
  onConfirm,
  onCancel,
}: DeleteInspectionModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteS3Files, setDeleteS3Files] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setDeleting(true);
    setError("");
    try {
      await onConfirm(deleteS3Files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete inspection");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          Delete Inspection
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">{assetName}</span>?
        </p>

        <div className="mt-3 rounded-md bg-yellow-50 p-3">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                This will delete the inspection record and {totalImages} image record(s) from the database.
              </p>
            </div>
          </div>
        </div>

        {/* Optional S3 deletion checkbox */}
        <div className="mt-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={deleteS3Files}
              onChange={(e) => setDeleteS3Files(e.target.checked)}
              disabled={deleting}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Also delete image files from S3 storage
              <span className="block text-xs text-red-600 mt-1">
                Warning: This permanently deletes files and cannot be undone!
              </span>
            </span>
          </label>
        </div>

        <ErrorAlert message={error} />

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Inspection"}
          </button>
        </div>
      </div>
    </div>
  );
}
