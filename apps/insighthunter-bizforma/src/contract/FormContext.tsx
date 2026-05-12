// src/context/FormContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { FormData, StepData } from "../types";
import { useProgress } from "../hooks/useApi";
import { ALL_STEPS } from "../constants";

// ─── Session ID ───────────────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  const KEY = "bizforma_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ─── Context Shape ────────────────────────────────────────────────────────────
interface FormContextValue {
  formData: FormData;
  setStepData: (stepId: string, data: StepData) => void;
  getStepData: <T extends StepData>(stepId: string) => T;
  sessionId: string;
  saving: boolean;
  lastSaved: Date | null;
  progressPct: number;
  completedSteps: number;
  totalSteps: number;
  resetAll: () => void;
  loadFromApi: () => Promise<void>;
}

const FormContext = createContext<FormContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function FormProvider({ children }: { children: ReactNode }) {
  const sessionId = useRef(getOrCreateSessionId()).current;
  const [formData, setFormData] = useState<FormData>({});
  const { save, load, saving, lastSaved } = useProgress(sessionId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    load().then((data) => {
      if (data) setFormData(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save with debounce after each change
  useEffect(() => {
    if (Object.keys(formData).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const nameData = formData["name"] as { name?: string } | undefined;
      save(formData, nameData?.name);
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [formData, save]);

  const setStepData = useCallback((stepId: string, data: StepData) => {
    setFormData((prev) => ({ ...prev, [stepId]: data }));
  }, []);

  const getStepData = useCallback(
    <T extends StepData>(stepId: string): T => {
      return (formData[stepId] ?? {}) as T;
    },
    [formData]
  );

  const resetAll = useCallback(() => {
    setFormData({});
  }, []);

  const loadFromApi = useCallback(async () => {
    const data = await load();
    if (data) setFormData(data);
  }, [load]);

  // Progress calculation
  const completedSteps = ALL_STEPS.filter(
    (s) => Object.keys(formData[s.id] ?? {}).length > 0
  ).length;
  const totalSteps = ALL_STEPS.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <FormContext.Provider
      value={{
        formData,
        setStepData,
        getStepData,
        sessionId,
        saving,
        lastSaved,
        progressPct,
        completedSteps,
        totalSteps,
        resetAll,
        loadFromApi,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useForm(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useForm must be used within FormProvider");
  return ctx;
}
