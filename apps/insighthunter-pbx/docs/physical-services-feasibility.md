# Physical business address, mail, package, and freight add-ons — feasibility

Status: **decision document only — no physical-presence service is built,
advertised, or operational**. See
[insight-pbx-master-prompt.md §4.10](./insight-pbx-master-prompt.md) for the
originating requirement. This document exists to satisfy that requirement and
to give Insight Hunter a reviewable go/no-go framework before any engineering
investment is made in this area.

**Nothing in this document should be read as a commitment to ship any of
these add-ons.** Insight Hunter must not market a "business address,"
"mailbox," "registered agent," "mail forwarding," "freight," or "delivery"
capability until a legal, operational, contractual, and vendor-backed
fulfillment path exists for that specific capability, in that specific
jurisdiction.

## 1. Candidate service categories

| # | Category | Description |
|---|---|---|
| 1 | Commercial business address | A real street address a tenant can use as their registered business address on filings, websites, and invoices. |
| 2 | Virtual mailbox | Ongoing receipt of physical mail at category 1's address, with online inventory. |
| 3 | Mail scanning | Scan-on-demand or scan-all of received mail, delivered digitally. |
| 4 | Mail forwarding | Physically re-mailing received items to a tenant-specified address. |
| 5 | Parcel receiving and forwarding | Same as mail but for parcels/packages (different carrier rules, size/liability limits). |
| 6 | Registered-agent coordination | Acting as, or coordinating with, a registered agent for service-of-process and state compliance mail. |
| 7 | Freight/shipping coordination | Arranging freight or courier shipments on behalf of a tenant (e.g., via Uber Freight or similar). |
| 8 | Local delivery/pickup logistics | Last-mile delivery or pickup coordination tied to a tenant's local operations. |
| 9 | Business formation address support | Supplying an address usable by `insighthunter-bizforma` filings. |
| 10 | Address verification / profile consistency | Validating a tenant-supplied address is deliverable and consistent across the platform (lowest-risk category; a data-quality feature, not a physical-presence service). |

## 2. Why each is operationally difficult

- **Commercial business address / virtual mailbox (1–2)**: Requires either
  leasing/operating real estate or a contracted Commercial Mail Receiving
  Agency (CMRA) relationship. USPS Form 1583 identity verification is
  mandatory for any CMRA mail receipt in the US, and must be notarized or
  verified in person/via an approved remote process — Insight Hunter would be
  on the hook for KYC chain-of-custody, not just software.
- **Mail scanning / forwarding (3–4)**: Requires physical staff/SOPs for
  opening, scanning, and re-mailing physical mail; chain-of-custody and
  secure destruction procedures for anything not forwarded; liability for
  lost, delayed, or misdelivered mail (including legal/government mail with
  hard deadlines).
- **Parcel receiving/forwarding (5)**: Carrier-specific size/weight/liability
  rules differ from USPS mail; requires physical storage and insurance for
  held parcels.
- **Registered-agent coordination (6)**: Many US states require a registered
  agent to be a resident/entity authorized to do business in-state with a
  physical (non-PO-box) address, available during business hours to accept
  service of process — this is a licensed/regulated role in several states,
  not a generic mail feature, and failure to promptly relay a service-of-process
  document can cause a tenant to lose a legal case by default.
- **Freight/shipping and local delivery (7–8)**: Involves third-party carrier
  liability, customs/hazmat rules for freight, and real-time logistics
  coordination outside Insight Hunter's current operational footprint;
  requires a logistics partner API and a support escalation process for
  damaged/lost/delayed shipments.
- **Business formation address support (9)**: Directly intersects with
  `insighthunter-bizforma` filings; an incorrect or non-deliverable address
  used on a state filing can cause filing rejection or missed legal notices.
- **Address verification (10)**: Comparatively low difficulty — this can be
  built as a software-only feature (e.g., third-party address-validation
  API) without taking on mail-handling liability, and could ship ahead of the
  rest of this category.

## 3. Vendor/partner criteria

Any candidate vendor/partner must satisfy all of the following before
Insight Hunter integrates with or resells their service:

- Licensed/compliant for the specific service in the specific
  state/jurisdiction (e.g., CMRA registration, registered-agent authorization).
- Willing to operate under a written SLA covering mail/parcel handling time,
  loss/damage liability, and data-retention/destruction commitments.
- Able to support an API or structured data feed for item-received
  notifications, scan delivery, and forwarding status (manual/email-only
  vendors are not viable integration partners at platform scale).
- Carries adequate liability insurance for mail/parcel handling and,
  for registered-agent service, professional liability coverage.
- Passes a security/privacy review: physical-address and scanned-mail-content
  data is sensitive and must be isolable from the rest of a tenant's
  communications data (see constraint below).
- Pricing structure is transparent enough to support a pass-through-cost +
  markup billing model (no opaque bundled vendor pricing).

## 4. Regulatory and privacy concerns

- **CMRA/USPS Form 1583**: Required identity verification for any US mail
  receiving agency relationship; Insight Hunter would need a documented
  process (own or delegated to the vendor) for notarized/verified identity
  collection, retention, and audit.
- **Registered-agent statutes**: State-by-state requirements for who may
  serve as a registered agent, required availability, and penalties for
  missed service-of-process — varies by state; requires per-state legal
  review before any state is enabled.
- **Mail privacy / tampering law**: Federal law (18 U.S.C. §1702 and related)
  criminalizes mail obstruction/tampering; any scanning/forwarding workflow
  must have documented controls proving only the authorized recipient's
  own mail is opened/scanned, and only with that tenant's standing consent.
- **Data residency and access control**: Scanned mail content and physical
  addresses are more sensitive than typical account metadata (can reveal
  legal notices, financial statements, government correspondence) and must
  be stored and access-controlled separately from call/SMS/voicemail data,
  per the master prompt's explicit instruction.
- **International/freight**: Customs, hazmat, and export-control rules apply
  to freight coordination and are jurisdiction- and goods-type-specific;
  out of scope for an initial US-only launch.

## 5. Customer identity and fraud risks

- Business addresses and registered-agent services are a known vector for
  shell-company and mail/identity fraud; vendors and regulators expect
  KYC-equivalent verification (e.g., government ID + notarization) before
  activating a mailbox or registered-agent relationship — this cannot be a
  simple self-serve signup flow.
- Insight Hunter must decide, per vendor, whether identity verification is
  performed by Insight Hunter, delegated entirely to the vendor/partner, or
  split — and document which option is chosen for audit purposes before
  launch, not after.
- Fraudulent use of a received-mail/forwarding service (e.g., for
  intercepting financial instruments or forged legal documents) is a
  materially higher-severity risk than typical SaaS billing fraud and should
  be explicitly modeled in any future risk review.

## 6. Geographic constraints

- Address/mailbox/registered-agent services are inherently per-state
  (US) / per-country (international) — there is no single nationwide
  offering without either operating physical locations in every supported
  jurisdiction or partnering with a vendor that already has that footprint.
- Freight/local-delivery logistics are metro/region-specific and depend on
  carrier/partner coverage maps.
- Recommend starting with a small number of high-demand US states (e.g.,
  states commonly used for registered-agent/formation purposes) rather than
  attempting national coverage at launch.

## 7. Pricing and margin framework

- Treat every physical-services add-on as a **separately billable line
  item**, distinct from PBX/messaging subscription tiers, recorded through
  the same `usage_ledger` append-only accounting pattern used for
  voice/SMS (see [README.md](../README.md) "Usage accounting model").
- Each line item should carry: vendor pass-through cost, Insight Hunter
  markup percentage or flat fee, applicable taxes/fees, and a fulfillment
  state (e.g., `requested`, `vendor_provisioning`, `active`,
  `forwarding_in_progress`, `cancelled`).
- Do not blend physical-services costs into the core PBX subscription price;
  keep them auditable and reversible independently, since vendor contracts
  and regulatory posture may change per state/vendor.

## 8. Recommended launch phases

1. **Phase A — Address verification only** (lowest risk, software-only):
   ship a tenant-supplied-address validation/consistency check (category 10)
   usable by `insighthunter-bizforma` filings and tenant profile data. No
   mail handling, no vendor contracts required.
2. **Phase B — Single-state, single-vendor pilot**: select one CMRA/virtual-
   mailbox partner in one state, complete legal/compliance review (Form 1583
   process, data segregation, support runbook), and launch mailbox + scanning
   only (categories 2–3) behind a "request access" feature gate to a small
   pilot cohort.
3. **Phase C — Forwarding and registered-agent**: only after Phase B
   operating data shows acceptable support load and no unresolved compliance
   issues; add mail/parcel forwarding (categories 4–5) and, separately,
   registered-agent coordination (category 6) with its own per-state legal
   sign-off.
4. **Phase D — Freight/local logistics**: evaluate only if tenant demand and
   partner API maturity (e.g., Uber Freight or equivalent) justify it;
   treat as fully independent from the mail/address track.

## 9. Go/no-go gates

Before moving from one phase to the next, all of the following must be true:

- [ ] Legal review completed and signed off for the specific jurisdiction(s)
      and service categor(ies) in scope for that phase.
- [ ] A vendor/partner contract is executed meeting all criteria in §3.
- [ ] A documented identity-verification process is in place and auditable.
- [ ] Data segregation and access controls for physical-address/mail content
      are implemented and reviewed (separate from communications metadata).
- [ ] A support/escalation runbook exists for lost/delayed/misdelivered
      mail, parcels, or missed service-of-process.
- [ ] Billing line items and fulfillment-state tracking are implemented and
      reconciled against vendor invoices for at least one billing cycle in a
      pilot before general availability.
- [ ] Marketing/product copy has been reviewed so Insight Hunter does not
      advertise availability beyond what is actually operational in that
      jurisdiction.

If any gate is unmet, the phase does not launch, including to a single pilot
tenant.

## 10. Recommended first practical offer

**Address verification only (Phase A, category 10).** It requires no vendor
mail-handling contract, no identity/KYC process, and no new data-segregation
infrastructure beyond normal tenant-profile data handling, while still
delivering tangible value (reducing filing rejections in
`insighthunter-bizforma` and improving tenant profile data quality). All
mail-handling, forwarding, registered-agent, and freight categories should
remain **explicitly deferred** until a specific vendor/partner and
jurisdiction pass every gate in §9.

This matches the master prompt's default recommendation: launch PBX,
messaging, AI receptionist, and video first, and treat physical
mail/address/freight as a partner-backed future add-on after vendor due
diligence and operating procedures are approved.
