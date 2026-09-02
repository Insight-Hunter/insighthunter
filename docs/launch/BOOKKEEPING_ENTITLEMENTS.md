# Bookkeeping Entitlements and Billing Contract

## Authority
Stripe is the payment authority. The payments service verifies webhook signatures, stores an idempotent event receipt, and projects the tenant entitlement. Browser return URLs, client-side state, cookies, and query parameters cannot grant or extend access.

`Stripe event -> verified webhook -> idempotent event receipt -> entitlement projection -> server authorization`

## Feature matrix
| Feature | Startup | Standard | Pro Books |
| --- | --- | --- | --- |
| CSV import | Yes | Yes | Yes |
| AI suggestions | Limited | Yes | Yes |
| Bank/card connection | No | Yes | Yes |
| Receipt capture | No | Yes | Yes |
| Reconciliation | No | Yes | Yes |
| Financial reports | Core | Full | Full monthly package |
| Cash forecast/alerts | No | Yes | Yes |
| Accountant access | No | Yes | Yes |
| Managed bookkeeping | No | No | Yes |

Every protected server route must load the current entitlement and call `requireFeature`. Hiding a UI control is not authorization.

## Stripe event rules
| Event | Required behavior |
| --- | --- |
| `checkout.session.completed` | Link verified tenant and Stripe references, project pending entitlement, enqueue provisioning only if not ready |
| `customer.subscription.created` | Project plan, status, period end, and server-configured features |
| `customer.subscription.updated` | Atomically update projected plan/status/end date and audit prior/new values |
| `invoice.paid` | Preserve or restore permitted access when status and paid period are valid |
| `invoice.payment_failed` | Enter documented billing-remediation state without deleting records |
| `customer.subscription.deleted` | Remove paid access after paid-through period; preserve records by retention policy |

Reject invalid signatures, process raw request bodies for verification, deduplicate by Stripe event ID, and make retry behavior safe.

## State rules
`active` and `trialing` are accessible subject to current period and feature. `past_due`, `unpaid`, `canceled`, `incomplete`, and `incomplete_expired` cannot access paid-only actions unless a documented server-side grace policy explicitly permits it. Startup is a free entitlement and must not require a fabricated Stripe subscription.

## Plan changes and retention
Upgrades apply only after verified projection. Downgrades disclose disabled features and cannot silently terminate an in-progress Pro Books service month. Entitlement history is versioned. Before launch, publish retention, export, and deletion policies. Until approved, canceled accounts are read-only for permitted export and deletion requests go through a verified support workflow.
