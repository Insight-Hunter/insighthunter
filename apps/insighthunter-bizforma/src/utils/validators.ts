import { z } from "zod";

export const createCaseSchema = z.object({
  entity_type: z.string().min(2),
  state: z.string().min(2).max(2),
  business_name: z.string().min(2),
  registered_agent: z.string().optional()
});

export const statusSchema = z.object({
  status: z.enum(["draft", "in_review", "active", "filed", "completed", "blocked", "cancelled"])
});

export const wizardStepSchema = z.object({
  step: z.number().int().min(1),
  data: z.record(z.string(), z.unknown())
});

export const createComplianceEventSchema = z.object({
  event_type: z.string().min(2),
  title: z.string().min(2),
  due_date: z.string().min(8),
  notes: z.string().optional()
});

export const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});

export const aiAdviseSchema = z.object({
  question: z.string().min(3),
  context: z.record(z.string(), z.unknown()).optional()
});
