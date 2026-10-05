// Placeholder "provider" for physical-services add-ons (commercial address,
// virtual mailbox, mail forwarding, registered agent —
// docs/insight-pbx-master-prompt.md §4.10). Per
// docs/physical-services-feasibility.md, no physical-presence service may be
// advertised or automated until legal/operational/vendor review gates are
// satisfied. This class intentionally does not call any vendor API — it only
// records a request for manual, human-operated follow-up, and exists so the
// rest of the codebase has a concrete (if deliberately inert) implementation
// to depend on instead of nothing.
import type {
  PhysicalServiceProvider,
  PhysicalServiceRequest,
  PhysicalServiceStatus,
} from "../interfaces/PhysicalServiceProvider.js";

export class ManualOpsMailboxProvider implements PhysicalServiceProvider {
  async requestService(request: PhysicalServiceRequest): Promise<PhysicalServiceStatus> {
    // TODO(physical-services): route this to an internal ops queue/ticket
    // system for manual fulfillment once Phase B (see
    // docs/physical-services-feasibility.md §8) is approved. No automated
    // vendor integration exists today.
    return { requestId: `manual:${request.orgId}:${request.requestedAt}`, state: "requested" };
  }
}
