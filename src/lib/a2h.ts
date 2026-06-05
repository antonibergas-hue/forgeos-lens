/**
 * A2H (Agent-to-Human) chat API client.
 * Calls platform HTTP endpoints directly.
 * Token is read from ~/.forgeos/config.yaml via Tauri shell (not Node.js fs).
 */

import { Command } from "@tauri-apps/plugin-shell";

interface A2HConfig {
  token: string;
  baseUrl: string;
}

interface A2HMessage {
  role: "human" | "agent";
  content: string;
  timestamp: number;
}

interface A2HChatSession {
  id: string;
  agentId: string;
  topic: string;
}

// Cache for config — loaded once, not on every request
let configCache: A2HConfig | null = null;

async function loadConfig(): Promise<A2HConfig> {
  if (configCache) return configCache;

  // Read ~/.forgeos/config.yaml via Tauri shell (browser-safe). The file is
  // multi-context: resolve the ACTIVE context's `server` + `token`, not a
  // bare `base_url:` (which doesn't exist) or the first `token:` in the file.
  try {
    // Use the allowlisted `forgeos` CLI (not `cat`, which the Tauri shell
    // scope forbids and wouldn't expand `~`). `config view` prints the full
    // config.yaml incl. current_context + per-context server/token.
    const cmd = Command.create("forgeos", ["config", "view"]);
    const output = await cmd.execute();
    const text = output.stdout;

    const ctxName = text.match(/^current_context:\s*["']?([^"'\s]+)/m)?.[1];
    let server = "";
    let token = "";
    if (ctxName) {
      let inCtx = false;
      for (const line of text.split("\n")) {
        const head = line.match(/^\s{2}(\S+):\s*$/); // "  <ctxname>:"
        if (head) {
          inCtx = head[1] === ctxName;
          continue;
        }
        if (inCtx) {
          const s = line.match(/^\s{3,}server:\s*["']?([^"'\s]+)/);
          if (s) server = s[1];
          const t = line.match(/^\s{3,}token:\s*["']?([^"'\s]+)/);
          if (t) token = t[1];
        }
      }
    }
    // Fall back to any server:/base_url: if the context block wasn't found.
    if (!server) server = text.match(/(?:server|base_url):\s*["']?([^"'\s]+)/)?.[1] || "";

    configCache = {
      token: token || text.match(/token:\s*["']?([^"'\s]+)/)?.[1] || "",
      baseUrl: server || "http://localhost:8080",
    };
    return configCache;
  } catch {
    // Fallback — token may not be available in test/browser contexts
    configCache = { token: "", baseUrl: "http://localhost:8080" };
    return configCache;
  }
}

function headers(): Record<string, string> {
  // Token is cached from loadConfig, called once per session
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${configCache?.token || ""}`,
  };
}

export async function createChat(
  agentId: string,
  topic: string
): Promise<A2HChatSession> {
  const { baseUrl } = await loadConfig();
  const res = await fetch(`${baseUrl}/api/a2h/v1/chats`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ agent_id: agentId, topic }),
  });
  if (!res.ok) throw new Error(`createChat failed: ${res.status}`);
  return res.json();
}

export async function sendMessage(
  chatId: string,
  text: string
): Promise<void> {
  const { baseUrl } = await loadConfig();
  const res = await fetch(`${baseUrl}/api/a2h/v1/chats/${chatId}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ role: "human", content: text }),
  });
  if (!res.ok) throw new Error(`sendMessage failed: ${res.status}`);
}

export async function pollMessages(
  chatId: string,
  since: number
): Promise<A2HMessage[]> {
  const { baseUrl } = await loadConfig();
  const res = await fetch(
    `${baseUrl}/api/a2h/v1/chats/${chatId}/messages?since=${since}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`pollMessages failed: ${res.status}`);
  return res.json();
}

export async function closeChat(chatId: string): Promise<void> {
  const { baseUrl } = await loadConfig();
  const res = await fetch(`${baseUrl}/api/a2h/v1/chats/${chatId}/close`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`closeChat failed: ${res.status}`);
}
