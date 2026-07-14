# Data-field roadmap

Catalogue of data fields the map does not carry yet, mapped to the entity they
attach to and the surface that should render them. Companion to
[scan-format.md](scan-format.md) (what exists today).

**Surfaces legend** — every field lands on one of the existing render
mechanisms, never a new screen:

| Surface | Meaning |
|---|---|
| badge | chip in the tile badge strip |
| dot | always-on ambient signal (reserved: health) |
| lens | map-wide tint + metric stamp |
| card | facts card section (tap the tile / edge) |
| zone | grouping hull behind tiles |
| env | environment-switcher stamp |
| drill | spatial level (structure only) |

Aspect data stays normalized: `{ status?, score?, items? }` — new aspects
that fit it are one provider entry. Fields marked ⚠ need a shape extension.

## Component (repo / service)

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| `links` (repo, docs, runbook, dashboard) ⚠ | jump to the real artifacts | card | high |
| `tech` (language, runtime, framework) | stack at a glance | card, lens (categorical) | high |
| `lifecycle` (experimental/active/deprecated/sunset) | what to invest in vs. retire | lens, card | high |
| `tier` / criticality (T0–T3) | blast-radius awareness | lens | high |
| `version` (current release) | release state without env view | card | med |
| `slo` (target %, error budget left) ⚠ | run-it accountability | card (health section) | high |
| `oncall` (rota name, current person) | who to page | card (owner section) | high |
| `incidents` (active count, last incident date) | operational memory | badge count, card | med |
| `alerts` (active count) | live noise level | dot intensity, card | med |
| `vulnerabilities` (count by severity) | security posture | lens (security aspect), card | high |
| `dataClassification` (public/internal/PII/PCI) | compliance surface | lens, card | high |
| `compliance` tags (GDPR, PCI-DSS, SOC2) | audit scope | card | low |
| `sbom` summary (deps total / outdated / vulnerable) | supply-chain health | lens, card | med |
| `cost` (monthly, budget delta) ⚠ | FinOps view | lens, card | med |
| `activity` (open PRs, issues, last commit) | work in flight | card, lens | med |
| `scorecard` (platform maturity grade) | golden-path adoption | lens (fits `score`) | low |
| `apiSpec` (OpenAPI/AsyncAPI link) | contract source of truth | card | med |

## Dependency edge

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| `protocol` (http/grpc/amqp/sql) | how they talk | card, edge style | high |
| `auth` (mTLS/api-key/none) | security of the hop | card, security lens on edges | high |
| `latency` (p50/p99) ⚠ | runtime behaviour | card; health lens could colour edges | high |
| `errorRate` | failing integrations | health lens (edge colour), card | high |
| `contractVersion` + `deprecated` flag | breaking-change runway | card, drift lens | med |
| `golden` (on the critical user path) | which edges matter most | lens highlight | med |
| `rateLimit` / quota | back-pressure contracts | card | low |
| `dataFlow` direction (payload vs call) | data-lineage perspective | future data lens | low |

## Storage

Storage tiles currently carry no facts at all.

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| `engine` + version (postgres 15) | what it actually is | card | high |
| `dataClassification` (PII/PCI) | where sensitive data lives | security lens, card | high |
| `size` / growth | capacity awareness | card | med |
| `backup` (policy, last run) | disaster readiness | card, health-style dot | med |
| `retention` policy | compliance | card | low |
| `owner` (if different from host team) | data ownership | ownership lens | low |

## Module (second layer)

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| `path` (src/…) | anchor to the codebase | card | high |
| per-module `test` coverage | hotspot-level quality | module badges/lens (extend BADGE_KINDS) | med |
| `churn` (commits touching it) | volatility hotspots | lens | med |
| `loc` / size | weight of the subdomain | card, tile size later | low |
| `publicApi` (exported surface) | intended coupling points | card | med |

## Behavior (third layer)

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| block `codeRef` (file/handler path) | jump from flow to code | card | high |
| flow-edge `condition` (expression) | real branch semantics | edge label/card | med |
| flow-edge `frequency`/probability | which paths dominate | edge width | low |
| trigger `slo` (p99 target) | per-entry-point budgets | card | med |

## Environment (env view)

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| `deployedAt`, `deployer`, `commit` | provenance of what runs | env card | high |
| `target` (cluster/region/cloud) | infra topology | env stamp, card | high |
| `replicas` / autoscaling range | scale posture | env card | med |
| `featureFlags` active | config divergence | env card | low |
| `configDrift` flag | env vs. declared state | drift lens per env | med |

## System / project level

| Field | Purpose | Surfaces | Prio |
|---|---|---|---|
| scan metadata (`scannedAt`, scanner version, source commits) | honesty of the map; enables real drift/history | toolbar/status, drift | high |
| context-map relationships (upstream/downstream, ACL, conformist) | DDD context map between zones | zone-to-zone edges | high |
| team metadata (members, channel, escalation) | zones become tappable | zone card | med |
| glossary per context (ubiquitous language) | shared vocabulary | zone card | low |
| target architecture (planned nodes/edges) | current vs. intended | overlay/ghost tiles | med |
| snapshots (scan history) | time scrubbing | timeline control | med |

## Suggested next slices

1. **Links + tech + lifecycle + tier** on components — pure card/lens work, no
   new mechanisms, high daily value.
2. **Security slice** — `vulnerabilities` + `dataClassification` on components
   and storage, `auth` on edges: one new lens, huge audit value.
3. **Run-it slice** — `slo`, `oncall`, `incidents`, edge `latency`/`errorRate`:
   completes "you build it you run it".
4. **Scan metadata** — prerequisite for trustworthy drift and history.
