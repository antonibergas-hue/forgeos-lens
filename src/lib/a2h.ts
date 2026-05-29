/**
 * A2H (Agent-to-Human) chat API client.
 * Calls platform HTTP endpoints directly using the bearer token
 * from ~/.forgeos/config.yaml.
 */

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

function loadConfig(): A2HConfig {
  const fs = require("fs");
  const path = require("path");
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const configPath = path.join(home, ".forgeos", "config.yaml");
  // Parse YAML manually (lightweight for single values)
  const raw = fs.readFileSync(configPath, "utf8");
  const tokenMatch = raw.match(/token:\s*["']?([^"'\s]+)/);
  const baseMatch = raw.match(/base_url:\s*["']?([^"'\s]+)/);
  const token = tokenMatch?.[1] || "";
  const baseUrl = baseMatch?.[1] || "http://localhost:8080";
  return { token, baseUrl };
}

function headers(): Record<string, string> {
  const { token } = loadConfig();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function createChat(
  agentId: string,
  topic: string
): Promise<A2HChatSession> {
  const { baseUrl } = loadConfig();
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
  const { baseUrl } = loadConfig();
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
  const { baseUrl } = loadConfig();
  const res = await fetch(
    `${baseUrl}/api/a2h/v1/chats/${chatId}/messages?since=${since}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`pollMessages failed: ${res.status}`);
  return res.json();
}

export async function closeChat(chatId: string): Promise<void> {
  const { baseUrl } = loadConfig();
  const res = await fetch(`${baseUrl}/api/a2h/v1/chats/${chatId}/close`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`closeChat failed: ${res.status}`);
}
