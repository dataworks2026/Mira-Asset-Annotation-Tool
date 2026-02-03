"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { InspectionForm } from "@/components/inspections/InspectionForm";

export default function NewInspectionPage() {
  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          New Inspection
        </h2>
        <InspectionForm />
      </main>
    </AuthGuard>
  );
}
