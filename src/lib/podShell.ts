/**
 * Pod-Shell API client (TODO #16).
 * Calls the platform shell endpoint directly — one command per POST.
 * Token is read from ~/.forgeos/config.yaml via Tauri shell (not Node.js fs).
 */

import { Command } from "@tauri-apps/plugin-shell";
import { PodShellRequest, PodShellResponse } from "./types";

interface ShellConfig {
  token: string;
  baseUrl: string;
}

// Cache for config — loaded once, not on every request
let configCache: ShellConfig | null = null;

async function loadConfig(): Promise<ShellConfig> {
  if (configCache) return configCache;

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
    configCache = { token: "", baseUrl: "http://localhost:8080" };
    return configCache;
  }
}

/**
 * Execute a single command inside an agent's pod / workdir.
 * The platform endpoint runs ONE allowlisted command (non-interactive, one command per call).
 */
export async function execPodShell(
  agentId: string,
  req: PodShellRequest
): Promise<PodShellResponse> {
  const { baseUrl } = await loadConfig();
  const url = `${baseUrl}/api/platform/agents/${encodeURIComponent(agentId)}/shell`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${configCache?.token || ""}`,
      },
      body: JSON.stringify(req),
    });
  } catch {
    // Network-level failure (endpoint unreachable / CORS / DNS). The pod-shell
    // needs a platform that exposes POST /api/platform/agents/<id>/shell;
    // forgeos v0.1.0 deployments don't ship it.
    throw new Error(
      `Pod shell endpoint unreachable at ${url} — this requires platform shell support (POST /api/platform/agents/<id>/shell), which isn't available in this forgeos deployment.`
    );
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new Error(
        `Pod shell endpoint not found (404) — this forgeos deployment doesn't expose POST /api/platform/agents/<id>/shell.`
      );
    }
    throw new Error(`podShell failed: ${res.status} ${errBody}`);
  }

  return res.json();
}
