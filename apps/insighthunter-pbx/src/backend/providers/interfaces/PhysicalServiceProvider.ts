// Provider-neutral contract for physical-presence add-ons (commercial
// address, virtual mailbox, mail scanning/forwarding, registered agent —
// docs/insight-pbx-master-prompt.md §4.10). TODO(physical-services): planning
// stub only. Per docs/physical-services-feasibility.md, no physical-presence
// service may be advertised or operated until a legal/operational/vendor
// review is complete; do not implement against this interface until that
// review's go/no-go gates are satisfied. See
// providers/partner/ManualOpsMailboxProvider.ts for the current (manual,
// non-automated) placeholder.

export interface PhysicalServiceRequest {
  orgId: string;
  serviceType: "virtual_mailbox" | "mail_forwarding" | "registered_agent" | "freight";
  requestedAt: string;
}

export interface PhysicalServiceStatus {
  requestId: string;
  state: "requested" | "vendor_provisioning" | "active" | "cancelled";
}

export interface PhysicalServiceProvider {
  requestService(request: PhysicalServiceRequest): Promise<PhysicalServiceStatus>;
}
