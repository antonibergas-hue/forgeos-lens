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
- [x] **#13 — Playwright smoke harness:** Catch the recurring "UI is
      broken when I pull" pain by smoke-testing every tab in headless
      Chromium against a mocked CLI.

      a) Make `runForgeos<T>` browser-safe. In `src/lib/forgeos.ts`,
         at the top of `runForgeos`, check
         `typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__`
         and dispatch to a fixture map by `args[0]`. Real Tauri runs
         unchanged.

      b) Add `src/lib/forgeos.fixtures.ts` exporting
         `MOCK_FIXTURES: Record<string, () => Promise<ForgeosResult<unknown>>>`
         keyed on the first CLI arg. Cover at minimum: `health`,
         `list --json` (3 fake agents — one of each lifecycle type so
         FleetBar shows non-zero counts), `describe <id>`,
         `logs --follow <id>` (5 events then stop), and
         `config get-contexts --json` (two contexts).

      c) Install Playwright (`pnpm add -D @playwright/test`), add
         `playwright.config.ts` with
         `webServer: { command: "pnpm dev", url: "http://localhost:5173",
         reuseExistingServer: !process.env.CI, timeout: 60_000 }`,
         single `chromium` project, `testDir: "tests"`. Add
         `"test:e2e": "playwright test"` to `package.json` scripts.

      d) Write `tests/smoke.spec.ts` with five tests:
         - **boots** — page loads, top bar contains `forgeos:`, health
           dot has the `ok` colour.
         - **tabs render** — for each of Fleet / Governance / Logs /
           Topology / MCP / Manifest, click the tab and assert the
           expected landmark is visible.
         - **fleet row → sheet** — click the first agent row, assert
           `<AgentDetailSheet>` opens with the agent name.
         - **context switch** — open the context dropdown, pick the
           second context, assert the Fleet table re-renders.
         - **logs unmount safety** — open Logs → Manifest → Logs.
           Listen for `pageerror` and `console.error`. Assert zero
           errors. This is the regression guard for the long-running
           child-process cleanup rule.

      e) Add to the **Hard rules for the building agents** section
         below: `pnpm test:e2e must pass before opening a PR`.

      Out of scope: wiring the `forgeos-lens-tester` agent on the
      forgeos side to invoke `pnpm test:e2e` — separate platform PR.

- [ ] **#14 — A2H chat panel in the Fleet detail sheet:** Surface the
      A2H protocol the platform already speaks (`/api/a2h/v1/chats/*`)
      so a human can have a conversation with any running agent from
      inside the Lens.

      a) Extend `AgentDetailSheet` with a new "Chat" tab alongside
         Overview / Recent runs / Tools / Manifest / Raw JSON.

      b) On tab activation, POST `forgeos chat <agent_id> --topic
         "Lens chat"` via the existing Tauri shell-out plumbing — but
         since `forgeos chat` is interactive, **the CLI is not the
         right interface here**. Instead call the platform HTTP
         endpoints directly with the bearer token from
         `~/.forgeos/config.yaml`:
         - `POST  /api/a2h/v1/chats` to open the session
         - `POST  /api/a2h/v1/chats/{id}/messages` to send a human msg
         - `GET   /api/a2h/v1/chats/{id}/messages?since=<ts>` to poll
           (1s interval — long-poll later, not now)
         - `POST  /api/a2h/v1/chats/{id}/close` on tab close
         Wrap them in a small `src/lib/a2h.ts` so the chat component
         doesn't know about HTTP details.

      c) Render the conversation as a single column: human messages
         right-aligned, agent messages left-aligned, monospace, with
         a thin top border between turns. Use the Mission Control
         palette tokens (no new colours).

      d) Input bar at the bottom: textarea + Send button + cmd+enter
         submit. Disable while the agent's last reply is pending.

      e) Show an inline "thinking…" placeholder while the agent is
         working (poll the session for new agent messages).

      Out of scope (Phase 2): tool-call rendering inline, attachment
      uploads, streaming token-by-token, multi-agent broadcast.

- [ ] **#15 — Tool-call detail expansion in the Logs tab:** The
      platform now records `cwd`, `cmd`, `returncode`, `stdout_tail`,
      `stderr_tail`, and `files_changed` on every dev-tool audit row
      (the forgeos-side change shipped with the qwen-code rollout).
      Surface them in the Logs tab so the operator can debug a stuck
      agent run without leaving the Lens.

      a) When a `tool.call` event is rendered, render a chevron on the
         right. Click expands inline with a 6-line block: `cwd`, `cmd`
         (or summarized args for non-shell tools), `returncode` (with a
         red badge if non-zero), `pr_url` (if present, as a link),
         and the first ~30 lines of `stdout_tail` and `stderr_tail` in
         a `<pre>` with horizontal scroll.

      b) Keyboard: ↑/↓ moves the expanded row; `space` toggles expand.

      c) Don't expand by default — only on click — so the dense htop
         vibe survives.

- [ ] **#16 — Pod-shell pane (live agent introspection):** Add a
      "Shell" tab to the Fleet detail sheet that lets the operator
      run commands inside the running agent's per-invocation workdir.

      Depends on a forgeos-side platform change that exposes a new
      tool wrapper `pod__exec(agent_id, cmd)` (or equivalent
      `/api/platform/agents/{id}/shell` endpoint) — open a side PR
      describing the contract you need; do **not** ship this UI
      without that endpoint, just open the gap PR and stop.

      Once the endpoint exists:
      a) Tab "Shell" renders a terminal-like pane (xterm.js).
      b) Input runs `pod__exec` against the selected agent's most
         recent invocation_id (or the current one if running).
      c) Stream stdout/stderr back into the pane.

- [ ] **#17 — Loading skeletons + error boundaries everywhere:**
      Eliminate the "blank tab then a wall of data" flicker and the
      "white screen of death" when a tab crashes.

      a) Add a `<TabErrorBoundary>` in `src/components/core/` that
         catches render errors per tab and shows a dense one-liner
         "tab `<name>` crashed: <message> — [retry]". Wrap every tab
         entry in `App.tsx`.

      b) Add a `<Skeleton>` primitive (animate-pulse div with the
         `surface` colour) and use it during the first paint of:
         FleetTab (table rows skeleton, ~6 rows),
         GovernanceTab (3 stub rows),
         LogsTab (header only — log lines stream in),
         TopologyTab (graph placeholder rect),
         ManifestTab (Monaco's built-in loading is fine, leave it).

      c) Toast the error from `useForgeos` once, not on every refetch
         — debounce by 2s to stop the cascade when CLI is briefly
         unreachable.

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
- `pnpm test:e2e` must pass before opening a PR (once #13 ships).
