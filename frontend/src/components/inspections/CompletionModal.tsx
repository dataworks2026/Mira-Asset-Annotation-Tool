"use client";

import { useState } from "react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

interface CompletionModalProps {
  assetName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function CompletionModal({
  assetName,
  onConfirm,
  onCancel,
}: CompletionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete inspection");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          Complete Inspection
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to mark{" "}
          <span className="font-medium">{assetName}</span> as completed? This
          will submit the inspection and all annotations for processing.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Once completed, annotations can no longer be edited.
        </p>

        <ErrorAlert message={error} className="mt-3" />

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Completing..." : "Complete Inspection"}
          </button>
        </div>
      </div>
    </div>
  );
}
