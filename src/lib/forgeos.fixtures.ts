export interface ForgeosResult<T = unknown> {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  code: number;
  parsed?: T;
}

export const MOCK_FIXTURES: Record<string, () => Promise<ForgeosResult>> = {
  'health': async () => ({ ok: true, stdout: 'ok', code: 0 }),

  // list --json — returns Agent[] shape (agent_id, status, execution_type)
  'list --json': async () => ({
    ok: true,
    stdout: JSON.stringify([
      { agent_id: 'agent-1', name: 'builder', stack: 'forgeos', execution_type: 'builder', status: 'running' },
      { agent_id: 'agent-2', name: 'tester', stack: 'forgeos', execution_type: 'tester', status: 'idle' },
      { agent_id: 'agent-3', name: 'reviewer', stack: 'forgeos', execution_type: 'reviewer', status: 'failed' },
    ]),
    code: 0,
  }),

  // describe <id> --json — returns AgentDetail shape
  'describe agent-1': async () => ({
    ok: true,
    stdout: JSON.stringify({
      agent_id: 'agent-1',
      name: 'builder',
      description: 'Builds and ships features',
      execution_type: 'builder',
      status: 'running',
      schedule: 'every 5m',
      llm_config: { chat_model: 'gemini-2.5-pro', provider: 'google' },
      tools: ['shell__exec', 'fs__write', 'git__commit'],
      department: 'engineering',
      ownership: 'forgeos-team',
      metadata: { last_run: '2 min ago' },
      created_at: '2025-01-01T00:00:00Z',
    }),
    code: 0,
  }),

  // logs --follow <id> --json — returns log events with tool details (used by LogsTab)
  'logs --follow agent-1 --json': async () => ({
    ok: true,
    stdout: [
      JSON.stringify({ time: '10:00:00', kind: 'started', msg: 'run started' }),
      JSON.stringify({
        time: '10:00:01',
        kind: 'tool',
        msg: 'tool.call shell__exec',
        tool: {
          cwd: '/tmp/forgeos',
          cmd: 'pnpm build',
          returncode: 0,
          stdout_tail: 'vite v6.0.0 building for production...\n✓ built in 1.2s',
          stderr_tail: '',
          pr_url: 'https://github.com/org/repo/pull/42',
          files_changed: ['dist/index.html', 'dist/assets/index.js'],
        }
      }),
      JSON.stringify({ time: '10:00:02', kind: 'completed', msg: 'completed' }),
      JSON.stringify({
        time: '10:00:03',
        kind: 'tool',
        msg: 'tool.call cargo-test',
        tool: {
          cwd: '/tmp/forgeos/src-tauri',
          cmd: 'cargo test --lib',
          returncode: 1,
          stdout_tail: 'running 42 tests\nFAILED: test_auth_layer',
          stderr_tail: 'error: process exited with code 1',
        }
      }),
      JSON.stringify({ time: '10:00:04', kind: 'failed', msg: 'error: tests failed' }),
    ].join('\n'),
    code: 0,
  }),

  // config get-contexts — plain text table (what ContextSwitcher actually calls)
  'config get-contexts': async () => ({
    ok: true,
    stdout: `CUR     NAME        AUTH    SERVER
------  ----------  ------  ------------------------------
*       cloud-run   bearer  https://api.forgeos.example
        local       bearer  https://localhost:8080
`,
    code: 0,
  }),

  // config get-contexts --json — JSON format (also covered by partial match)
  'config get-contexts --json': async () => ({
    ok: true,
    stdout: JSON.stringify([
      { name: 'cloud-run', current: true },
      { name: 'local', current: false },
    ]),
    code: 0,
  }),
};
