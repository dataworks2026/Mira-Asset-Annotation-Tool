"use client";

import { Inspection } from "@/types/inspection";
import { InspectionCard } from "./InspectionCard";

interface InspectionListProps {
  inspections: Inspection[];
  loading: boolean;
}

export function InspectionList({ inspections, loading }: InspectionListProps) {
  if (loading) {
    return <p className="text-sm text-gray-400">Loading inspections...</p>;
  }

  if (inspections.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No inspections yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Create your first inspection to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {inspections.map((inspection) => (
        <InspectionCard
          key={inspection.inspection_id}
          inspection={inspection}
        />
      ))}
    </div>
  );
}
