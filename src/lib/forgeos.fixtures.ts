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

  // describe <id> — returns AgentDetail shape
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

  'describe agent-2': async () => ({
    ok: true,
    stdout: JSON.stringify({
      agent_id: 'agent-2',
      name: 'tester',
      description: 'Runs tests and quality checks',
      execution_type: 'tester',
      status: 'idle',
      schedule: 'every 10m',
      llm_config: { chat_model: 'claude-3.5-sonnet', provider: 'anthropic' },
      tools: ['shell__exec', 'fs__write'],
      department: 'qa',
      ownership: 'forgeos-team',
      metadata: { last_run: '15 min ago' },
      created_at: '2025-01-02T00:00:00Z',
    }),
    code: 0,
  }),

  'describe agent-3': async () => ({
    ok: true,
    stdout: JSON.stringify({
      agent_id: 'agent-3',
      name: 'reviewer',
      description: 'Code review and PR approval',
      execution_type: 'reviewer',
      status: 'failed',
      schedule: 'once',
      llm_config: { chat_model: 'gpt-4o', provider: 'openai' },
      tools: ['shell__exec'],
      department: 'engineering',
      ownership: 'forgeos-team',
      metadata: { last_run: '1 hour ago' },
      created_at: '2025-01-03T00:00:00Z',
    }),
    code: 0,
  }),

  // runs <id> --json
  'runs agent-1 --json': async () => ({
    ok: true,
    stdout: JSON.stringify([
      { run_id: 'run-1', agent_id: 'agent-1', status: 'completed', started_at: '2025-06-02T10:00:00Z', duration_ms: 12000, prompt_tokens: 1200, completion_tokens: 450 },
      { run_id: 'run-2', agent_id: 'agent-1', status: 'failed', started_at: '2025-06-02T10:15:00Z', duration_ms: 4500, error: 'Command failed: pnpm build' },
      { run_id: 'run-3', agent_id: 'agent-1', status: 'completed', started_at: '2025-06-02T10:30:00Z', duration_ms: 8900, prompt_tokens: 1050, completion_tokens: 380 },
    ]),
    code: 0,
  }),

  'runs agent-2 --json': async () => ({
    ok: true,
    stdout: JSON.stringify([
      { run_id: 'run-4', agent_id: 'agent-2', status: 'completed', started_at: '2025-06-02T09:00:00Z', duration_ms: 5600, prompt_tokens: 500, completion_tokens: 120 },
    ]),
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

  // approvals list --json
  'approvals list --json': async () => ({
    ok: true,
    stdout: JSON.stringify([
      {
        id: 'req-1',
        agent_id: 'agent-1',
        agent_name: 'builder',
        question: 'Allow deployment to production? 2 files changed.',
        request_type: 'approval',
        risk: 'high',
        status: 'pending',
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 'req-2',
        agent_id: 'agent-3',
        agent_name: 'reviewer',
        question: 'What is the deployment priority for this fix?',
        request_type: 'choice',
        options: ['critical', 'standard', 'low'],
        risk: 'medium',
        status: 'pending',
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: 'req-3',
        agent_id: 'agent-1',
        agent_name: 'builder',
        question: 'Confirm: install dependencies via pnpm?',
        request_type: 'confirm',
        risk: 'low',
        status: 'pending',
        created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
    ]),
    code: 0,
  }),

  'approvals approve req-1': async () => ({ ok: true, stdout: 'Approved req-1', code: 0 }),
  'approvals reject req-1': async () => ({ ok: true, stdout: 'Rejected req-1', code: 0 }),
  'answer req-2 --text critical': async () => ({ ok: true, stdout: 'Answered req-2', code: 0 }),

  // mcp list --json
  'mcp list --json': async () => ({
    ok: true,
    stdout: JSON.stringify([
      {
        name: 'google-workspace',
        url: 'https://mcp.google.com/v1',
        status: 'connected',
        protocol: 'sse',
        latency_ms: 120,
        last_heartbeat: new Date(Date.now() - 1000 * 45).toISOString(),
        tools: [
          { name: 'send_email', description: 'Sends an email via Gmail' },
          { name: 'list_calendar_events', description: 'Lists calendar events' },
          { name: 'create_doc', description: 'Creates a new Google Doc' }
        ]
      },
      {
        name: 'atlassian',
        url: 'https://mcp.atlassian.net',
        status: 'connected',
        protocol: 'sse',
        latency_ms: 240,
        last_heartbeat: new Date(Date.now() - 1000 * 12).toISOString(),
        tools: [
          { name: 'create_jira_issue', description: 'Creates a Jira issue' },
          { name: 'search_confluence', description: 'Searches Confluence pages' }
        ]
      },
      {
        name: 'slack',
        url: 'https://mcp.slack.com',
        status: 'configured',
        protocol: 'stdio',
        tools: [
          { name: 'post_message', description: 'Posts a message to a channel' },
          { name: 'list_channels', description: 'Lists public channels' }
        ]
      },
      {
        name: 'postgres',
        url: 'localhost:5432',
        status: 'error',
        protocol: 'stdio',
        error: 'Connection timeout',
        tools: []
      }
    ]),
    code: 0,
  })
};
