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
context: billing        # bounded context this repo belongs to

storage:                # attached storage (rendered attached to the service)
  - kind: database      # database | cache | datastore
    name: payments-db   # (default: the kind's label)

dependencies:           # outgoing edges on the system map
  - repo: accounts      # target repo id (stub created if not scanned)
    kind: sync          # sync | async | data   (default: sync)
    label: charge lookup

behavior:               # the service's runtime flow (Behavior facet interior)
  blocks:
    - { name: POST /charge, kind: trigger }   # trigger | step | decision
    - { name: Charged?,     kind: decision }  #   | rule | event | outcome
    - { name: Done,         kind: outcome }   # (default: step)
  flow:
    - [POST /charge, Charged?]                # short form: [from, to]
    - { from: Charged?, to: Done, label: yes } # labelled branch

build:  [lint, unit tests, docker image]   # shown on the Build facet
test:   [unit, contract]                   # shown on the Test facet
deploy: [staging, production]              # shown on the Deploy facet
```

`build` / `test` / `deploy` are plain summaries for now — they appear as the
facet's description when you drill in. They'll become structured vocabularies
(stages, suites, environments) in a later format version.

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
