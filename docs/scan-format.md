# Octopus scan format (v1)

The scan format is the contract between **scanners** and the **map**. A scanner
(automated, or a human with an editor) describes each repo/service in a YAML
document; Octopus assembles them into an explorable multi-layer map. Import the
files via **⋯ → Import…** (multi-select works), or try it with
[`examples/acme-shop/`](../examples/acme-shop).

Design goals:

- **Stable identity.** `repo:` is the durable id. Node ids are derived from it
  deterministically, so re-importing a scan **updates** the map instead of
  duplicating it.
- **Facts vs. curation.** Everything a scan produces is marked
  `meta.source: 'scan'`. On re-import, scanned facts are replaced (services
  disappear when removed, dependencies update), while *curation* survives:
  positions you arranged, plus any nodes/edges you added by hand.
- **Partial scans render.** A dependency on a repo that wasn't scanned becomes
  an *external system* stub instead of an error.

## Repo document

One YAML document per repo/service. A file may hold several documents
separated by `---`.

```yaml
octopus: 1              # format version (required)
repo: payments          # stable id (required, unique across the system)
name: Payments          # display name       (default: repo)
kind: microservice      # service | microservice | apiGateway | client
                        #   | queue | externalSystem   (default: microservice)
description: Charges cards and settles invoices
context: billing        # bounded context this repo belongs to (zone grouping)
team: payments-squad    # owning team — team zones + ownership badge/lens

storage:                # attached storage (rendered attached to the service)
  - kind: database      # database | cache | datastore
    name: payments-db   # (default: the kind's label)

dependencies:           # outgoing edges on the system map
  - repo: accounts      # target repo id (stub created if not scanned)
    kind: sync          # sync | async | data   (default: sync)
    label: charge lookup
    contract: [GET /accounts/:id]   # shown when the edge is tapped
    traffic: 42                     # req/s — edge width under the health lens

modules:                # the repo's grouped subdomains — its interior canvas
  - name: Charging
    description: Card charges and idempotency
    dependencies:                       # arrows between sibling modules
      - { module: Invoicing, label: settles }   # or just the name: [Invoicing]
    behavior:           # optional runtime flow, one drill-down inside the module
      blocks:
        - { name: POST /charge, kind: trigger }   # trigger | step | decision
        - { name: Charged?,     kind: decision }  #   | rule | event | outcome
        - { name: Done,         kind: outcome }   # (default: step)
      flow:
        - [POST /charge, Charged?]                # short form: [from, to]
        - { from: Charged?, to: Done, label: yes } # labelled branch
  - name: Invoicing

build:                  # tile badge + Build lens
  status: passing       # passing | failing | unknown
  items: [lint, unit tests, docker image]
test:                   # tile badge + Test lens
  coverage: 87          # percent, 0–100 (alias for score)
  items: [unit, contract]
deploy: [staging, production]   # tile badge + Deploy lens (list = environments)

health: degraded        # healthy | degraded | down — always-on tile dot + lens
                        # (or { status, uptime: 99.9 })
environments:           # per-env deployment — drives the environment switcher
  staging: { version: 1.2.0 }
  production: { version: 1.1.9, status: degraded }

aspects:                # generic lifecycle aspects — same normalized shape:
  security:             #   { status?, score? (0–100), items? }
    status: audited     # unknown keys are stored on the node and start
    items: [SAST, secrets scan]   # rendering once a provider is registered
```

`build` / `test` / `deploy` appear as **badges on the component tile** (tap one
for the details card) and drive the **map lenses** — the toggles on the right
edge that tint every codebase tile by build status, test coverage, or
environment count. A plain string list is accepted as shorthand: items for
build/test, environments for deploy.

## System document

Optionally names the whole map:

```yaml
octopus: 1
system: ACME Shop
```

## Layout

Scanned maps are laid out automatically: components are placed in columns by
dependency depth (callers left, callees right) and grouped by bounded context
within a column. Once imported, arrange freely — your positions are curation
and survive re-imports.

## Bounded contexts

`context:` is stored on each node (`meta.context`) and drives layout grouping.
Visual context zones on the map are planned; the data is already captured so
scans won't need to change.
