# ChemLabX — Architecture Diagrams

Mermaid sources for CHEMLABX_ARCHITECTURE.md §24. Render these with any Mermaid-compatible tool (mermaid-cli, GitHub/Markdown preview, mermaid.live).

| File | Diagram |
|---|---|
| 01-high-level-system.mmd | High-level system architecture (clients, app/domain layer, site server, cloud, sync) |
| 02-school-offline.mmd | School LAN offline deployment (no Internet) |
| 03-cloud-online.mmd | Online cloud architecture |
| 04-sync-architecture.mmd | Sync engine: journal, cursors, dedupe, conflict policy |
| 05-domain-architecture.mmd | Bounded domains and dependencies |
| 06-multi-tenant.mmd | Tenant isolation between organizations |
| 07-rbac-model.mmd | Roles, permissions, scopes, PDP, enforcement points |
| 08-chemistry-safety-boundary.mmd | Chemistry / Safety boundary (pure engines, no UI dependency) |
| 09-experiment-execution.mmd | Experiment execution flow sequence (safety gating) |
| 10-update-versioning.mmd | Update and versioning flow (online and offline) |

Controller document: `CHEMLABX_ARCHITECTURE.md` (root).