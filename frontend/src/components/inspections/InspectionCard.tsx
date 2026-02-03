"use client";

import Link from "next/link";
import { Inspection } from "@/types/inspection";
import { Badge } from "@/components/ui/Badge";

interface InspectionCardProps {
  inspection: Inspection;
}

export function InspectionCard({ inspection }: InspectionCardProps) {
  const statusVariant = inspection.status === "completed" ? "green" : "yellow";
  const statusLabel =
    inspection.status === "completed" ? "Completed" : "In Progress";

  return (
    <Link
      href={`/inspections/${inspection.inspection_id}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {inspection.asset_name}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{inspection.asset_type}</p>
        </div>
        <Badge label={statusLabel} variant={statusVariant} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="text-gray-400">Date:</span>{" "}
          {inspection.inspection_date}
        </div>
        <div>
          <span className="text-gray-400">Images:</span>{" "}
          {inspection.total_images}
        </div>
        <div>
          <span className="text-gray-400">Inspector:</span>{" "}
          {inspection.inspector_name}
        </div>
      </div>
    </Link>
  );
}
