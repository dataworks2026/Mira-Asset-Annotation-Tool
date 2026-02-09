"use client";

import { useState } from "react";

interface DeleteImageModalProps {
  imageId: string;
  filename: string;
  onConfirm: (deleteS3Files: boolean) => Promise<void>;
  onCancel: () => void;
}

export function DeleteImageModal({
  imageId,
  filename,
  onConfirm,
  onCancel,
}: DeleteImageModalProps) {
  const [deleteS3Files, setDeleteS3Files] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await onConfirm(deleteS3Files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Delete Image</h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete <strong>{filename}</strong>?
        </p>

        <div className="mt-4 rounded-md bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            This will remove the image from the inspection. The database record will be soft-deleted.
          </p>
        </div>

        <div className="mt-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={deleteS3Files}
              onChange={(e) => setDeleteS3Files(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Also permanently delete files from S3
              <span className="block text-xs text-red-600 mt-1">
                ⚠️ Cannot be undone! Only check this if you're absolutely sure.
              </span>
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete Image"}
          </button>
        </div>
      </div>
    </div>
  );
}
