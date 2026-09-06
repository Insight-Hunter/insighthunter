export type TenantProvisioningStatus =
  | "requested"
  | "provisioning"
  | "ready"
  | "failed";

export interface TenantProvisioningRequest {
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly correlationId: string;
  readonly sourceEventId: string;
  readonly requestedAt: string;
}

export interface TenantProvisioningRecord extends TenantProvisioningRequest {
  readonly status: TenantProvisioningStatus;
  readonly attempt: number;
  readonly updatedAt: string;
  readonly failureCode?: string;
}

const VALID_TRANSITIONS: Readonly<
  Record<TenantProvisioningStatus, readonly TenantProvisioningStatus[]>
> = {
  requested: ["provisioning", "failed"],
  provisioning: ["ready", "failed"],
  ready: [],
  failed: ["requested"],
};

export function canTransitionProvisioningStatus(
  from: TenantProvisioningStatus,
  to: TenantProvisioningStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transitionProvisioningStatus(
  record: TenantProvisioningRecord,
  nextStatus: TenantProvisioningStatus,
  now = new Date().toISOString(),
  failureCode?: string,
): TenantProvisioningRecord {
  if (!canTransitionProvisioningStatus(record.status, nextStatus)) {
    throw new TypeError(
      `Invalid tenant provisioning transition: ${record.status} -> ${nextStatus}`,
    );
  }

  if (nextStatus === "failed" && !failureCode) {
    throw new TypeError(
      "A failure code is required when tenant provisioning fails.",
    );
  }

  if (nextStatus !== "failed" && failureCode) {
    throw new TypeError(
      "A failure code is only valid for failed tenant provisioning.",
    );
  }

  return {
    ...record,
    status: nextStatus,
    attempt: nextStatus === "provisioning" ? record.attempt + 1 : record.attempt,
    updatedAt: now,
    ...(failureCode ? { failureCode } : {}),
  };
}

export function canAcceptFinancialData(
  status: TenantProvisioningStatus,
): boolean {
  return status === "ready";
}
