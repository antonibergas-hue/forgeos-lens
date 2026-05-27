# ForgeOS Lens — UI spec (v2: Mission Control style)

This is the contract the agents work against. The previous v1 spec
(OpenLens-style sidebar) shipped — see PR #1 / commit `473b5d4`. This v2
spec **replaces** it with the **Mission Control** visual style and a new
data model: the UI executes `forgeos` CLI commands directly via the Tauri
shell-out plumbing, with **contexts** managed from inside the UI itself.

## North star

GitHub-issue-tracker-meets-htop. Dense, monospace, dark, every pixel
informative. No marketing chrome.

## Visual tokens (Tailwind extends — see Mission Control's tailwind.config.js for the source of truth)

```js
colors: {
  bg: "#0d1117", surface: "#161b22", border: "#30363d",
  text: "#c9d1d9", dim: "#8b949e", bright: "#f0f6fc",
  ok: "#3fb950", danger: "#f85149", warn: "#d29922", info: "#58a6ff",
  orange: "#db6d28", purple: "#bc8cff", cyan: "#39d353", pink: "#f778ba",
}
fontFamily.mono: ["SF Mono", "Cascadia Code", "Fira Code", "monospace"]
borderRadius: { lg: "6px", md: "4px", sm: "3px" }
body: 12px base, monospace, bg-bg text-text, overflow-hidden
```

shadcn primitives, dark-theme-only. No light mode.

## App layout

One window. Three regions stacked vertically:

```
┌─────────────────────────────────────────────────────────────────────┐
│ TOP BAR    forgeos:cloud-run · v0.1.0 · ok           [context ▼]    │  24px
├─────────────────────────────────────────────────────────────────────┤
│ TABS    Fleet   Governance   Logs   Topology   MCP   Manifest       │  32px
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  active tab content                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The top-right context dropdown lists every entry in `~/.forgeos/config.yaml`
contexts and switching it writes `current_context: <name>` back to that
file (via Tauri's fs plugin). The bottom bar shows latency to the active
context's API.

## Tabs (mirror Mission Control's tab set as closely as possible)

### Fleet
- A `Table` (shadcn) with rows for each deployed agent.
- Columns: `PHASE` (colored badge), `NAME` (truncated to 24c), `STACK`
  badge, `TYPE`, `MODEL`, `LAST_RUN_AGO`, `TOKENS_24H`, actions.
- Above the table: a `FleetBar` strip with running/idle/failed counts as
  fat colored pills. Mirror Mission Control's `<FleetBar />`.
- Row click → opens a right-side detail sheet (`<AgentDetailSheet />`)
  with tabs: Overview · Recent runs · Tools · Manifest · Raw JSON.
- Top-right of the table: `[+ Upload manifest]` button → file picker →
  shells out `forgeos deploy <path>`.

### Governance
- Two panels side by side: `PENDING APPROVALS` and `RECENT AUDIT EVENTS`.
- Approvals: list of A2H requests with the question, agent, age, and
  `[Approve]` / `[Reject]` / `[Reply…]` buttons. The reply opens a small
  inline `<Textarea>` and shells out `forgeos answer <id> --text "…"`.
- Audit: virtualized list, most-recent first, color by severity, filterable
  by `action` / `resource_type` / `agent_id`.

### Logs (new — required by the spec change)
- An `<AgentSelector>` at the top — searchable combobox of all deployed
  agents.
- Below it, a streaming log view that shells out
  `forgeos logs <agent_id> --follow --json` and renders each event as a
  monospace line, colored by `kind` (cyan started / green completed /
  red failed / yellow tool / dim other).
- Auto-scrolls when at the bottom; pauses scroll when the user scrolls up.
- Top-right buttons: `[Clear]` `[Copy]` `[Pause]`.
- Optional filter chips: `runs only` · `tool calls only` · `errors only`.

### Topology
- Static for v1: read the agents list and draw a force-directed graph
  where edges are `agent__call` relationships extracted from manifest
  `metadata` (orchestrator → builder, builder → tester, etc.). Use
  `react-force-graph-2d` or similar small lib.
- Nodes colored by phase (idle/running/failed). Edge animation on a
  pulse when a fresh `tool.call agent__call` audit event for that edge
  arrives.

### MCP
- For v1, just a static list of MCP servers configured on the platform
  with their connection status. Reads `GET /api/mcp/servers`.

### Manifest
- A YAML editor (use Monaco) initialized from the selected agent's
  `to_dict()`, with a `[Reapply]` button that shells out
  `forgeos deploy <tmpfile>` after writing the buffer.

## Data sources (CLI shellout contract)

Every view goes through the Tauri `Command` API to invoke the **already-installed**
`forgeos` binary (3.5MB native Rust, comes with the app or is found on
$PATH). The shell-out wrapper lives at `src/lib/forgeos.ts` and exposes a
single function `runForgeos<T>(args: string[]): Promise<T>` that:

1. Spawns `forgeos --context <current> <args>`.
2. Captures stdout (JSON if applicable) and stderr.
3. Returns `{ok, stdout, stderr, code, parsed?: T}` where `parsed` is
   `JSON.parse(stdout)` when stdout starts with `{` or `[`.

Mapping:

| View | Command |
| --- | --- |
| Fleet list | `forgeos list --json` (new flag — agents emit JSON when present) |
| Agent detail | `forgeos describe <id>` (new verb) |
| Recent runs | `forgeos runs <id> --limit 20 --json` (new verb) |
| Logs streaming | `forgeos logs <id> --follow --json` |
| Approvals list | `forgeos approvals list --json` (already exists, drop --short footer) |
| Approve / reject | `forgeos approvals approve <id>` |
| Freeform answer | `forgeos answer <id> --text "..."` |
| Deploy / undeploy | `forgeos deploy <yaml>` / `forgeos undeploy <id>` |
| Context list | `forgeos config get-contexts --json` (new flag) |
| Context switch | `forgeos config use-context <name>` |
| Health | `forgeos health` |

If any new flags or verbs are missing, **open a separate PR on this repo
that documents the CLI gap** so the operator can land the Rust change.
Don't fake them in the UI.

## TODOs (each is one PR via the orchestrator → builder → tester loop)

For each TODO the orchestrator should pick the smallest atomic ship that
keeps the build green. **TODO #1 is shipped (PR #1).** Drop it from the
backlog.

- [x] **#2 — Tailwind palette + global shell:** Replace the v1 sidebar
      layout with the MC top-bar + tabs + content shell. Wire the
      tailwind tokens above. Routes are tabs, not router pages.
- [x] **#3 — `runForgeos<T>` helper + connection toast:** Implement the
      shell-out wrapper. On first paint, run `forgeos health` and show
      a top-right toast (ok = green dot, error = red banner).
- [x] **#4 — Context dropdown:** Reads
      `forgeos config get-contexts --json` (add the flag if needed),
      shows them in a `<Select>`, switching shells out
      `forgeos config use-context <name>` and reloads the active query.
- [x] **#5 — Fleet tab:** FleetBar + table per spec. Click → sheet stub
      (just title + close, more later).
- [x] **#6 — Agent detail sheet — Overview tab:** Reads
      `forgeos describe <id>` (or `forgeos list --json` + filter when
      describe doesn't exist yet). Show schedule, model, tool count,
      last run timestamp.
- [x] **#7 — Logs tab with --follow streaming:** This is the user's
      whole motivation. Spawn the long-running `forgeos logs --follow`
      child process; pipe stdout line-by-line into a Zustand log store.
      Make sure the process is killed on agent switch / tab unmount /
      window close.
- [x] **#8 — Governance tab:** Approvals + audit panels. Wire approve /
      reject / answer.
- [x] **#9 — Topology tab:** Force-directed graph.
- [x] **#10 — MCP tab:** Static list.
- [x] **#11 — Manifest tab with Monaco + Reapply.**
- [x] **#12 — Polish:** keyboard shortcuts (cmd+1..9 for tabs, / for
      search), command palette (cmd+k).

## Out of scope (don't build)

- Light theme.
- Multi-window / multi-context-at-once.
- Editing agents from inside topology view.
- Writing agent code from inside the UI (that's what the builder agent
  is for).
- Mobile / responsive.

## Hard rules for the building agents

- Do not invent CLI verbs/flags. If you need one, open a side PR on this
  repo describing the gap.
- Do not bake the bearer token into the UI bundle — it stays in
  `~/.forgeos/config.yaml`, the CLI reads it on every shell-out.
- All long-running child processes (logs --follow) must register a
  cleanup handler on unmount/close.
- pnpm only (not npm/bun).
- Every PR title is `feat(<area>): <one-line>` — the orchestrator
  reads PR history to dedupe.
