import type { Env } from "../types/env";
import {
  getBusinessById,
  getFormationCaseById,
  insertBusiness,
  insertFormationCase,
  updateFormationCaseStage,
} from "../db/queries";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function createFormationCase(
  env: Env,
  input: {
    tenantId: string;
    ownerUserId: string;
    legalName?: string;
    preferredName?: string;
    formationState?: string;
    entityType?: string;
    intake?: Record<string, unknown>;
  },
) {
  const businessId = createId("biz");
  const formationCaseId = createId("fc");

  const business = await insertBusiness(env.DB, {
    id: businessId,
    tenantId: input.tenantId,
    ownerUserId: input.ownerUserId,
    legalName: input.legalName,
    preferredName: input.preferredName,
    formationState: input.formationState,
    entityType: input.entityType,
  });

  const formationCase = await insertFormationCase(env.DB, {
    id: formationCaseId,
    tenantId: input.tenantId,
    businessId,
    stage: "concept",
    status: "draft",
    progress: 5,
    intakeJson: JSON.stringify(input.intake ?? {}),
  });

  const agentId = env.FORMATION_AGENT.idFromName(formationCaseId);
  const agent = env.FORMATION_AGENT.get(agentId);
  await agent.fetch("https://formation-agent/message", {
    method: "POST",
    body: JSON.stringify({
      type: "update-stage",
      stage: "concept",
      status: "draft",
      progress: 5,
    }),
  });

  return { business, formationCase };
}

export async function getFormationOverview(env: Env, formationCaseId: string) {
  const formationCase = await getFormationCaseById(env.DB, formationCaseId);
  if (!formationCase) return null;

  const business = await getBusinessById(env.DB, formationCase.business_id);

  return {
    formationCase,
    business,
  };
}

export async function advanceFormationStage(
  env: Env,
  input: {
    formationCaseId: string;
    stage: string;
    status: string;
    progress: number;
    intake?: Record<string, unknown>;
  },
) {
  const updated = await updateFormationCaseStage(env.DB, {
    id: input.formationCaseId,
    stage: input.stage,
    status: input.status,
    progress: input.progress,
    intakeJson: input.intake ? JSON.stringify(input.intake) : undefined,
  });

  const agentId = env.FORMATION_AGENT.idFromName(input.formationCaseId);
  const agent = env.FORMATION_AGENT.get(agentId);
  await agent.fetch("https://formation-agent/message", {
    method: "POST",
    body: JSON.stringify({
      type: "update-stage",
      stage: input.stage,
      status: input.status,
      progress: input.progress,
    }),
  });

  return updated;
}
