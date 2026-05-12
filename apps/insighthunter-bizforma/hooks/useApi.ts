// src/hooks/useApi.ts
import { useState, useCallback } from "react";
import { API_BASE } from "../constants";
import type {
  NameCheckResponse,
  DomainCheckResponse,
  TaxDeadline,
  GeneratedDoc,
  ProgressResponse,
  FormData,
  Resource,
} from "../types";

// ─── Generic fetch helper ─────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ─── Business Name Check ──────────────────────────────────────────────────────
export function useNameCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NameCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (name: string, state?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<NameCheckResponse>("/api/check-name", {
        method: "POST",
        body: JSON.stringify({ name, state }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { check, loading, result, error, reset: () => setResult(null) };
}

// ─── Domain Check ─────────────────────────────────────────────────────────────
export function useDomainCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (domain: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DomainCheckResponse>("/api/check-domain", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { check, loading, result, error, reset: () => setResult(null) };
}

// ─── Progress Persistence ─────────────────────────────────────────────────────
export function useProgress(sessionId: string) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = useCallback(
    async (data: FormData, businessName?: string) => {
      setSaving(true);
      try {
        await apiFetch("/api/progress", {
          method: "POST",
          body: JSON.stringify({ sessionId, data, businessName }),
        });
        setLastSaved(new Date());
      } catch (e) {
        console.error("Failed to save progress:", e);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  const load = useCallback(async (): Promise<FormData | null> => {
    setLoading(true);
    try {
      const res = await apiFetch<ProgressResponse>(`/api/progress/${sessionId}`);
      return res.found ? (res.data ?? null) : null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return { save, load, saving, loading, lastSaved };
}

// ─── Tax Deadlines ────────────────────────────────────────────────────────────
export function useTaxDeadlines() {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ deadlines: TaxDeadline[] }>("/api/deadlines");
      setDeadlines(data.deadlines);
    } catch (e) {
      console.error("Failed to load deadlines:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { deadlines, loading, fetch: fetch_ };
}

// ─── AI Document Generation ───────────────────────────────────────────────────
export function useDocGeneration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      docType: GeneratedDoc["docType"],
      businessData: Record<string, unknown>
    ) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<GeneratedDoc>("/api/generate-doc", {
          method: "POST",
          body: JSON.stringify({ docType, businessData }),
        });
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { generate, loading, result, error, reset: () => setResult(null) };
}

// ─── Step Resources ───────────────────────────────────────────────────────────
export function useResources(stepId: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ resources: Resource[] }>(`/api/resources/${stepId}`);
      setResources(data.resources);
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [stepId]);

  return { resources, loading, fetch: fetch_ };
}

// ─── Export / Download ────────────────────────────────────────────────────────
export function useExport() {
  const [loading, setLoading] = useState(false);

  const exportJson = useCallback((formData: FormData) => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bizforma-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportSummary = useCallback(
    async (formData: FormData, sessionId: string) => {
      setLoading(true);
      try {
        const data = await apiFetch<{ summary: string; businessName: string }>(
          "/api/export",
          {
            method: "POST",
            body: JSON.stringify({ formData, sessionId }),
          }
        );
        const blob = new Blob([data.summary], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.businessName.replace(/\s+/g, "-")}-bizforma-summary.md`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Export failed:", e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { exportJson, exportSummary, loading };
}
