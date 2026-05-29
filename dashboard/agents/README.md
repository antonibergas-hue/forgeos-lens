# Revised agent system prompts (draft)

These four files are **drafts** of revised `system_prompt` text for the
four agents that build, test, review, and ship `forgeos-lens`. They
replace the platform's macro-tool surface (`shell__exec`,
`git__commit_push`, `gh__open_pr`, `fs__write_file`, `code__qwen_code_run`)
with a single `bash` tool against the pod's real shell, and they fold
runtime verification into the tester so the merge gate is "the app
actually boots and behaves," not just "the code compiles."

The shape of the change is the same as Claude Code's tool model: one
`bash` (persistent-cwd, pipes/redirects/heredocs/background jobs
allowed) plus the existing coordination primitives (`agent__call`,
`human__ask`, `memory__*`).

| File | Target agent | ID |
|---|---|---|
| `orchestrator.system_prompt.md` | forgeos-lens-orchestrator | (existing) |
| `builder.system_prompt.md`      | forgeos-lens-builder      | `4d45fb8f-baa` |
| `tester.system_prompt.md`       | forgeos-lens-tester       | `53856256-253` |
| `reviewer.system_prompt.md`     | forgeos-lens-pr-reviewer  | `c62a1e37-542` |

## Applying

These changes require both a **platform** update (the new `bash` tool
and the pod-image additions for the tester) and an **agent manifest**
update (the new system prompts). Order:

1. Land `bash(command, cwd?, timeout?, env?, background?)` on the
   platform. Persistent working directory per invocation; pipes,
   heredocs, redirects, `&&`/`||`, background jobs all allowed; egress
   allowlist enforced at the pod (not in-process).
2. Update the tester pod image with `xvfb-run`, `tauri-driver`,
   `WebKitWebDriver`, headed Chromium, and the `forgeos` CLI.
3. Update each agent's `system_prompt` from the corresponding file
   here. Keep the agent IDs / names; change only the prompt.
4. Run an end-to-end drill: open a deliberately broken PR (one bug per
   validator) and confirm the tester catches it and the orchestrator
   refuses to merge.

Drafts only — do not deploy without a human review pass.
