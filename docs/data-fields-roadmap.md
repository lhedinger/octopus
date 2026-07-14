# Data-field roadmap

Catalogue of data fields the map does not carry yet, grouped by the **lens /
perspective** they serve. Each row names the entity the field attaches to and
the surface that renders it. Companion to [scan-format.md](scan-format.md)
(what exists today).

**Surfaces legend** — every field lands on an existing render mechanism, never
a new screen:

| Surface | Meaning |
|---|---|
| badge | chip in the tile badge strip |
| dot | always-on ambient signal (reserved: health) |
| lens | map-wide tint + metric stamp |
| card | facts card section (tap the tile / edge / zone) |
| zone | grouping hull behind tiles |
| env | environment-switcher stamp |

Aspect data stays normalized: `{ status?, score?, items? }` — new aspects that
fit it are one provider entry. Fields marked ⚠ need a shape extension.

## 🔒 Security lens (new)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `vulnerabilities` (count by severity) | component | security posture | lens, card | high |
| `dataClassification` (public/internal/PII/PCI) | component, storage | where sensitive data lives | lens, card | high |
| `auth` (mTLS/api-key/none) | edge | security of each hop | lens (edge colour), card | high |
| `compliance` tags (GDPR, PCI-DSS, SOC2) | component | audit scope | card | low |

## ❤️ Health / run-it lens (extend existing)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `slo` (target %, error budget left) ⚠ | component | run-it accountability | card (health section) | high |
| `oncall` (rota, current person) | component | who to page | card (owner section) | high |
| `incidents` (active count, last incident) | component | operational memory | badge count, card | med |
| `alerts` (active count) | component | live noise level | dot intensity, card | med |
| `latency` (p50/p99) ⚠ | edge | runtime behaviour | lens (edge colour), card | high |
| `errorRate` | edge | failing integrations | lens (edge colour), card | high |
| `golden` (on the critical user path) | edge | which edges matter most | lens highlight | med |
| `backup` (policy, last run) | storage | disaster readiness | card | med |
| trigger `slo` (p99 target) | behavior block | per-entry-point budgets | card | med |

## 🧬 Lifecycle & criticality lens (new)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `lifecycle` (experimental/active/deprecated/sunset) | component | invest vs. retire | lens, card | high |
| `tier` (T0–T3 criticality) | component | blast-radius awareness | lens | high |
| `version` (current release) | component | release state without env view | card | med |
| `contractVersion` + `deprecated` flag | edge | breaking-change runway | card, drift lens | med |

## 🛠 Tech lens (new)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `tech` (language, runtime, framework) | component | stack at a glance | lens (categorical), card | high |
| `protocol` (http/grpc/amqp/sql) | edge | how they talk | card, edge style | high |
| `engine` + version (postgres 15) | storage | what it actually is | card | high |
| `apiSpec` (OpenAPI/AsyncAPI link) | component | contract source of truth | card | med |
| `publicApi` (exported surface) | module | intended coupling points | card | med |

## 🔄 Activity lens (new)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `activity` (open PRs, issues, last commit) | component | work in flight | lens, card | med |
| `churn` (commits touching it) | module | volatility hotspots | lens | med |

## 🧪 Test lens (extend existing)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| per-module `test` coverage | module | hotspot-level quality | module badges/lens | med |

## 💰 Cost lens (new)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `cost` (monthly, budget delta) ⚠ | component | FinOps view | lens, card | med |

## 🌍 Environment view (extend existing)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `deployedAt`, `deployer`, `commit` | environment | provenance of what runs | env card | high |
| `target` (cluster/region/cloud) | environment | infra topology | env stamp, card | high |
| `replicas` / autoscaling range | environment | scale posture | env card | med |
| `featureFlags` active | environment | config divergence | env card | low |
| `configDrift` flag | environment | env vs. declared state | drift lens per env | med |

## 🔀 Drift / time perspective (extend existing)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| scan metadata (`scannedAt`, scanner version, source commits) | system | honesty of the map; real drift/history | toolbar/status, drift | high |
| snapshots (scan history) | system | time scrubbing | timeline control | med |
| target architecture (planned nodes/edges) | system | current vs. intended | overlay/ghost tiles | med |

## 🧭 Zones / context perspective (extend existing)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| context-map relationships (upstream/downstream, ACL, conformist) | system | DDD context map between zones | zone-to-zone edges | high |
| team metadata (members, channel, escalation) | system | zones become tappable | zone card | med |
| glossary per context (ubiquitous language) | system | shared vocabulary | zone card | low |

## 📎 Card-only (no lens)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `links` (repo, docs, runbook, dashboard) ⚠ | component | jump to the real artifacts | card | high |
| `size` / growth | storage | capacity awareness | card | med |
| `retention` policy | storage | compliance | card | low |
| `path` (src/…) | module | anchor to the codebase | card | high |
| `loc` / size | module | weight of the subdomain | card | low |
| block `codeRef` (file/handler path) | behavior block | jump from flow to code | card | high |
| flow-edge `condition` (expression) | behavior flow | real branch semantics | edge label/card | med |
| flow-edge `frequency`/probability | behavior flow | which paths dominate | edge width | low |
| `rateLimit` / quota | edge | back-pressure contracts | card | low |

## 🗃 Data perspective (future)

| Field | Entity | Purpose | Surfaces | Prio |
|---|---|---|---|---|
| `dataFlow` direction (payload vs call) | edge | data lineage | data lens | low |

## Suggested next slices

1. **Lifecycle & tech + links** — pure card/lens work, no new mechanisms,
   high daily value.
2. **Security slice** — vulnerabilities + data classification (components and
   storage), edge auth: one new lens, huge audit value.
3. **Run-it slice** — SLO, on-call, incidents, edge latency/error rate:
   completes "you build it you run it".
4. **Scan metadata** — prerequisite for trustworthy drift and history.
