export interface ForgeosResult<T = unknown> {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  code: number;
  parsed?: T;
}

export const MOCK_FIXTURES: Record<string, () => Promise<ForgeosResult>> = {
  'health': async () => ({ ok: true, stdout: 'ok', code: 0 }),
  'list --json': async () => ({ ok: true, stdout: JSON.stringify([
    { id: 'agent-1', phase: 'running', name: 'builder', stack: 'forgeos', type: 'builder', model: 'gemini-2.5-pro' },
    { id: 'agent-2', phase: 'idle', name: 'tester', stack: 'forgeos', type: 'tester', model: 'qwen' },
    { id: 'agent-3', phase: 'failed', name: 'reviewer', stack: 'forgeos', type: 'reviewer', model: 'gemini' }
  ]), code: 0 }),
  'describe agent-1': async () => ({ ok: true, stdout: JSON.stringify({ id: 'agent-1', name: 'builder', model: 'gemini-2.5-pro', last_run: '2 min ago', schedule: 'every 5m', tools: 12 }), code: 0 }),
  'logs --follow agent-1': async () => ({ ok: true, stdout: JSON.stringify([
    { time: '10:00:00', kind: 'started', msg: 'run started' },
    { time: '10:00:01', kind: 'tool', msg: 'tool.call shell__exec' },
    { time: '10:00:02', kind: 'completed', msg: 'completed' },
    { time: '10:00:03', kind: 'started', msg: 'run 2' },
    { time: '10:00:04', kind: 'failed', msg: 'error: timeout' }
  ]), code: 0 }),
  'config get-contexts --json': async () => ({ ok: true, stdout: JSON.stringify([
    { name: 'cloud-run', current: true },
    { name: 'local', current: false }
  ]), code: 0 }),
};
