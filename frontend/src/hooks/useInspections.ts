"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Inspection,
  CreateInspectionPayload,
  UpdateInspectionPayload,
  InspectionListResponse,
} from "@/types/inspection";

export function useInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = status ? `?status=${status}` : "";
      const data = await api.get<InspectionListResponse>(
        `/api/inspections${query}`
      );
      setInspections(data.inspections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inspections");
    } finally {
      setLoading(false);
    }
  }, []);

  const createInspection = useCallback(
    async (payload: CreateInspectionPayload): Promise<Inspection> => {
      const data = await api.post<Inspection>("/api/inspections", payload);
      return data;
    },
    []
  );

  const getInspection = useCallback(
    async (id: string): Promise<Inspection> => {
      return api.get<Inspection>(`/api/inspections/${id}`);
    },
    []
  );

  const updateInspection = useCallback(
    async (id: string, payload: UpdateInspectionPayload): Promise<Inspection> => {
      return api.put<Inspection>(`/api/inspections/${id}`, payload);
    },
    []
  );

  const completeInspection = useCallback(
    async (id: string): Promise<Inspection> => {
      return api.post<Inspection>(`/api/inspections/${id}/complete`);
    },
    []
  );

  const deleteInspection = useCallback(
    async (id: string, deleteS3Files: boolean = false): Promise<void> => {
      const query = deleteS3Files ? "?delete_s3_files=true" : "";
      await api.delete(`/api/inspections/${id}${query}`);
    },
    []
  );

  return {
    inspections,
    loading,
    error,
    fetchInspections,
    createInspection,
    getInspection,
    updateInspection,
    completeInspection,
    deleteInspection,
  };
}
