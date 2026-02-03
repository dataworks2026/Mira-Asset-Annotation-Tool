"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { InspectionList } from "@/components/inspections/InspectionList";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { useInspections } from "@/hooks/useInspections";

export default function InspectionsPage() {
  const { inspections, loading, error, fetchInspections } = useInspections();

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Inspections</h2>
          <Link
            href="/inspections/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Inspection
          </Link>
        </div>

        <ErrorAlert message={error} className="mb-4" />

        <InspectionList inspections={inspections} loading={loading} />
      </main>
    </AuthGuard>
  );
}
