import { useState, useRef, useEffect } from "react";
import { execPodShell } from "../../lib/podShell";
import { ShellHistoryEntry } from "../../lib/types";

// A terminal-like REPL for running commands in the agent's pod (TODO #16).
// Non-interactive: one POST per command.
export function PodShell({ agentId }: { agentId: string }) {
  const [history, setHistory] = useState<ShellHistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [cwd, setCwd] = useState<string>("~");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new history entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleRun = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isExecuting) return;

    const cmd = input.trim();
    setInput("");
    setIsExecuting(true);

    try {
      const res = await execPodShell(agentId, { cmd, cwd: cwd !== "~" ? cwd : undefined });
      const entry: ShellHistoryEntry = {
        ts: new Date().toISOString(),
        cmd,
        cwd: res.cwd,
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.code,
      };
      setHistory((prev) => [...prev, entry]);
      if (res.ok && res.cwd) {
        setCwd(res.cwd);
      }
    } catch (err: any) {
      const entry: ShellHistoryEntry = {
        ts: new Date().toISOString(),
        cmd,
        stdout: "",
        stderr: err.message || "Failed to execute command",
        code: 1,
      };
      setHistory((prev) => [...prev, entry]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg font-mono text-[11px] leading-relaxed">
      {/* Welcome / Info message */}
      <div className="text-dim mb-4 px-1">
        <div># forgeos-pod-shell v1.0</div>
        <div># non-interactive mode (one command per POST)</div>
        <div># agent: {agentId}</div>
      </div>

      {/* History log */}
      <div ref={scrollRef} className="flex-1 overflow-auto space-y-4 px-1 mb-4">
        {history.map((entry, i) => (
          <div key={i} className="group">
            <div className="flex gap-2 text-dim items-start">
              <span className="text-ok shrink-0">➜</span>
              <span className="text-cyan shrink-0">{entry.cwd || "~"}</span>
              <span className="text-bright font-bold break-all">{entry.cmd}</span>
              <span className="ml-auto text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
            </div>
            {entry.stdout && (
              <pre className="mt-1 text-text whitespace-pre-wrap break-all pl-6">
                {entry.stdout}
              </pre>
            )}
            {entry.stderr && (
              <pre className="mt-1 text-danger whitespace-pre-wrap break-all pl-6">
                {entry.stderr}
              </pre>
            )}
            {entry.code !== 0 && !entry.stderr && (
              <div className="mt-1 text-danger pl-6 opacity-80">
                exit code: {entry.code}
              </div>
            )}
          </div>
        ))}
        {isExecuting && (
          <div className="flex gap-2 animate-pulse px-1">
            <span className="text-ok">➜</span>
            <span className="text-dim">running...</span>
          </div>
        )}
      </div>

      {/* Input line */}
      <form onSubmit={handleRun} className="flex gap-2 items-center border-t border-border pt-3 shrink-0">
        <span className="text-ok shrink-0 pl-1">➜</span>
        <span className="text-cyan shrink-0">{cwd}</span>
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isExecuting}
          placeholder="Type a command..."
          className="flex-1 bg-transparent outline-none text-bright placeholder:text-dim/50"
        />
      </form>
    </div>
  );
}
