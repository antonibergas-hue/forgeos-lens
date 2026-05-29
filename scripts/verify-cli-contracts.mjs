#!/usr/bin/env node
// scripts/verify-cli-contracts.mjs
//
// Greps src/**/*.{ts,tsx} for `runForgeos([...])` and
// `Command.create('forgeos', [...])` calls, extracts (subcommand, flags),
// and validates every flag against `forgeos help <subcmd...>`.
//
// Exits non-zero (printing file:line + the unknown flag) if any UI call
// references a flag the CLI does not expose. Skips calls whose args array
// is not entirely string literals (dynamic ids, template-built args, etc.)
// — those are the agent's responsibility, not ours.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const FORGEOS = process.env.FORGEOS_BIN || "forgeos";

if (!existsSync(SRC)) {
  console.error(`verify-cli-contracts: src/ not found at ${SRC}`);
  process.exit(2);
}

// Bail gracefully when the CLI isn't installed on this host — fail loud
// rather than silent so CI doesn't pretend to verify when it can't.
try {
  execFileSync(FORGEOS, ["--help"], { stdio: "ignore" });
} catch {
  console.error(
    `verify-cli-contracts: '${FORGEOS}' not on PATH — install the forgeos CLI ` +
      "or set FORGEOS_BIN to point at it.",
  );
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// Matches `runForgeos<...>([ ... ])` and `Command.create('forgeos', [ ... ])`.
// The array literal must be on one line; multi-line array literals are rare
// in this codebase and worth flagging by hand if they appear.
const PATTERNS = [
  // runForgeos<T>(["x","--flag"])
  /runForgeos(?:<[^>]+>)?\s*\(\s*\[([^\]]+)\]/g,
  // useForgeos<T>({ ... args: ["x","--flag"] ... }) — the hook that wraps it
  /useForgeos(?:<[^>]+>)?\s*\(\s*\{[\s\S]*?args\s*:\s*\[([^\]]+)\][\s\S]*?\}\s*\)/g,
  // Command.create('forgeos', ["x","--flag"]) — scoped shell-plugin call
  /Command\.create\s*\(\s*['"]forgeos['"]\s*,\s*\[([^\]]+)\]/g,
];

function parseArgsLiteral(src) {
  // Parse a single-line array body like:  "list", "--json"   or   'config', 'get-contexts', '--json'
  // Returns null if any element isn't a string literal.
  const parts = src.split(",").map((p) => p.trim());
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    const m = p.match(/^['"`](.+)['"`]$/);
    if (!m) return null; // dynamic — skip
    out.push(m[1]);
  }
  return out;
}

function lineOf(text, idx) {
  return text.slice(0, idx).split("\n").length;
}

const calls = [];
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const pat of PATTERNS) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(text))) {
      const args = parseArgsLiteral(m[1]);
      if (!args || args.length === 0) continue;
      const subcmd = [];
      const flags = [];
      for (const a of args) {
        if (a.startsWith("-")) flags.push(a.split("=")[0]); // strip --x=y
        else if (flags.length === 0) subcmd.push(a);
        // positional after a flag is treated as a flag value — ignore
      }
      if (subcmd.length === 0) continue;
      calls.push({
        file: relative(ROOT, file),
        line: lineOf(text, m.index),
        subcmd,
        flags,
      });
    }
  }
}

// Cache `forgeos help <subcmd...>` per unique subcommand chain.
const helpCache = new Map();
function helpFor(subcmd) {
  const key = subcmd.join(" ");
  if (helpCache.has(key)) return helpCache.get(key);
  let out = "";
  try {
    out = execFileSync(FORGEOS, ["help", ...subcmd], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    out = "__NO_SUCH_SUBCOMMAND__";
  }
  helpCache.set(key, out);
  return out;
}

let failures = 0;
for (const c of calls) {
  const help = helpFor(c.subcmd);
  if (help === "__NO_SUCH_SUBCOMMAND__") {
    console.error(
      `${c.file}:${c.line} — unknown subcommand 'forgeos ${c.subcmd.join(" ")}'`,
    );
    failures++;
    continue;
  }
  for (const f of c.flags) {
    // Match "-f," or "--flag" as a token in the help text. Help columns wrap
    // so we use a word-boundary match rather than line-anchored.
    const re = new RegExp(`(^|[\\s,])${f.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`);
    if (!re.test(help)) {
      console.error(
        `${c.file}:${c.line} — flag '${f}' not accepted by ` +
          `'forgeos ${c.subcmd.join(" ")}'`,
      );
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\nverify-cli-contracts: ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  `verify-cli-contracts: ${calls.length} call site(s) validated against ${helpCache.size} subcommand(s).`,
);
