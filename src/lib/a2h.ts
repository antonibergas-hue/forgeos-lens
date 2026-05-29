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

  // Read ~/.forgeos/config.yaml via Tauri shell (browser-safe)
  try {
    const cmd = Command.create("cat", ["~/.forgeos/config.yaml"]);
    const output = await cmd.execute();

    const tokenMatch = output.stdout.match(/token:\s*["']?([^"'\s]+)/);
    const baseMatch = output.stdout.match(/base_url:\s*["']?([^"'\s]+)/);

    configCache = {
      token: tokenMatch?.[1] || "",
      baseUrl: baseMatch?.[1] || "http://localhost:8080",
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
