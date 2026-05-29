#!/usr/bin/env node
// scripts/verify-plugin-wiring.mjs
//
// For each `import … from '@tauri-apps/plugin-<X>'` in src/**, assert the
// four corners of Tauri-2 plugin wiring:
//
//   1. @tauri-apps/plugin-<X> is in package.json dependencies/devDependencies.
//   2. tauri-plugin-<X> is in src-tauri/Cargo.toml [dependencies].
//   3. src-tauri/src/{main,lib}.rs registers it (`tauri_plugin_<x>::init()`).
//   4. Some file under src-tauri/capabilities/*.json grants a permission
//      starting with "<X>:" (the plugin's scoped permissions namespace).
//
// Also lints the bug-shapes we hit in feat/lens-mc-shell:
//
//   - v1 import paths (`@tauri-apps/api/{shell,fs,dialog,…}` are gone in v2).
//   - `new Command(` — the v2 ctor is private; must be `Command.create(`.
//   - `external` arrays in vite.config.* listing `@tauri-apps/*` (the build
//     "passes" but the import resolves nowhere at runtime).
//   - Tailwind v4 mis-configurations (v3 directives, v3 PostCSS plugin name,
//     missing CSS import from main.tsx).

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const TAURI = join(ROOT, "src-tauri");
const failures = [];
const fail = (msg) => failures.push(msg);

function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

function lineOf(text, idx) {
  return text.slice(0, idx).split("\n").length;
}

// ─── Collect frontend imports ────────────────────────────────────────────
const tsFiles = walk(SRC, [".ts", ".tsx"]);

// v2 plugin imports
const pluginImports = new Map(); // plugin -> [{file, line}]
const V2_IMPORT = /from\s+['"]@tauri-apps\/plugin-([a-z0-9-]+)(?:\/[^'"]+)?['"]/g;
for (const f of tsFiles) {
  const text = readFileSync(f, "utf8");
  V2_IMPORT.lastIndex = 0;
  let m;
  while ((m = V2_IMPORT.exec(text))) {
    const name = m[1];
    if (!pluginImports.has(name)) pluginImports.set(name, []);
    pluginImports.get(name).push({
      file: relative(ROOT, f),
      line: lineOf(text, m.index),
    });
  }
}

// v1 paths — banned in Tauri 2
const V1_IMPORT =
  /from\s+['"]@tauri-apps\/api\/(shell|fs|dialog|notification|os|process|http|globalShortcut|clipboard|window)['"]/g;
for (const f of tsFiles) {
  const text = readFileSync(f, "utf8");
  V1_IMPORT.lastIndex = 0;
  let m;
  while ((m = V1_IMPORT.exec(text))) {
    fail(
      `${relative(ROOT, f)}:${lineOf(text, m.index)} — Tauri v1 import path ` +
        `'@tauri-apps/api/${m[1]}' — that module moved to ` +
        `'@tauri-apps/plugin-${m[1]}' in v2.`,
    );
  }
}

// `new Command(` — private ctor in plugin-shell v2
for (const f of tsFiles) {
  const text = readFileSync(f, "utf8");
  const re = /\bnew\s+Command\s*\(/g;
  let m;
  while ((m = re.exec(text))) {
    fail(
      `${relative(ROOT, f)}:${lineOf(text, m.index)} — 'new Command(' is ` +
        "private in @tauri-apps/plugin-shell v2; use Command.create(...).",
    );
  }
}

// ─── Read package.json + Cargo.toml + main.rs + capabilities ─────────────
let pkg = {};
try {
  pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
} catch {
  fail("package.json missing or unparseable.");
}
const allDeps = {
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
};

const cargoToml = existsSync(join(TAURI, "Cargo.toml"))
  ? readFileSync(join(TAURI, "Cargo.toml"), "utf8")
  : "";
const mainRs = ["src/main.rs", "src/lib.rs"]
  .map((p) => join(TAURI, p))
  .filter(existsSync)
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

const capDir = join(TAURI, "capabilities");
const capJson = walk(capDir, [".json"])
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");

// ─── Plugin-wiring assertions ────────────────────────────────────────────
for (const [plugin, sites] of pluginImports) {
  const npmName = `@tauri-apps/plugin-${plugin}`;
  const crateName = `tauri-plugin-${plugin}`;
  const initCall = new RegExp(`tauri_plugin_${plugin.replace(/-/g, "_")}::init\\s*\\(`);
  const permNs = new RegExp(`["']${plugin}:`);

  const where = sites
    .map((s) => `${s.file}:${s.line}`)
    .join(", ");

  if (!allDeps[npmName]) {
    fail(`plugin '${plugin}' (imported at ${where}) — missing '${npmName}' in package.json.`);
  }
  if (!new RegExp(`\\b${crateName}\\s*=`).test(cargoToml)) {
    fail(
      `plugin '${plugin}' (imported at ${where}) — missing '${crateName}' in src-tauri/Cargo.toml.`,
    );
  }
  if (!initCall.test(mainRs)) {
    fail(
      `plugin '${plugin}' (imported at ${where}) — not registered in ` +
        `src-tauri/src/main.rs (expected '.plugin(tauri_plugin_${plugin.replace(/-/g, "_")}::init())').`,
    );
  }
  if (!permNs.test(capJson)) {
    fail(
      `plugin '${plugin}' (imported at ${where}) — no capability grants a ` +
        `'${plugin}:*' permission under src-tauri/capabilities/.`,
    );
  }
}

// ─── Vite external-list lint ─────────────────────────────────────────────
for (const cfg of ["vite.config.ts", "vite.config.js", "vite.config.mjs"]) {
  const p = join(ROOT, cfg);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  // Capture either `rolldownOptions: { ... external: [...] }` or `rollupOptions: { ... external: [...] }`.
  const re = /external\s*:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(text))) {
    if (/@tauri-apps\//.test(m[1])) {
      fail(
        `${cfg}:${lineOf(text, m.index)} — 'external' lists a '@tauri-apps/*' ` +
          "module. That hides missing-dep errors at build time; install the " +
          "plugin and remove the external entry instead.",
      );
    }
  }
}

// ─── Tailwind v4 lint ────────────────────────────────────────────────────
const twPkg = join(ROOT, "node_modules/tailwindcss/package.json");
if (existsSync(twPkg)) {
  const version = JSON.parse(readFileSync(twPkg, "utf8")).version || "";
  const major = parseInt(version.split(".")[0], 10);
  if (major >= 4) {
    // v3 directives in any CSS file under src/
    for (const f of walk(SRC, [".css"])) {
      const text = readFileSync(f, "utf8");
      const re = /^\s*@tailwind\s+(base|components|utilities)\s*;/gm;
      let m;
      while ((m = re.exec(text))) {
        fail(
          `${relative(ROOT, f)}:${lineOf(text, m.index)} — '@tailwind ${m[1]}' is ` +
            "v3-style; Tailwind v4 wants '@import \"tailwindcss\";'.",
        );
      }
    }
    // postcss.config naming `tailwindcss` directly (must be @tailwindcss/postcss in v4)
    for (const cfg of ["postcss.config.js", "postcss.config.cjs", "postcss.config.mjs"]) {
      const p = join(ROOT, cfg);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, "utf8");
      if (/['"]?tailwindcss['"]?\s*:/.test(text) || /require\(['"]tailwindcss['"]\)/.test(text)) {
        fail(
          `${cfg} — 'tailwindcss' as a PostCSS plugin is v3; in v4 use ` +
            "'@tailwindcss/postcss' (or drop PostCSS in favour of '@tailwindcss/vite').",
        );
      }
    }
    // main entry must import a CSS file (so Tailwind ships at all)
    for (const entry of ["src/main.tsx", "src/main.ts"]) {
      const p = join(ROOT, entry);
      if (!existsSync(p)) continue;
      const text = readFileSync(p, "utf8");
      if (!/import\s+['"][^'"]+\.css['"]/.test(text)) {
        fail(
          `${entry} — no CSS import found. Tailwind output is never bundled ` +
            "unless an entry imports the CSS that contains '@import \"tailwindcss\";'.",
        );
      }
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────
if (failures.length > 0) {
  for (const f of failures) console.error(`  • ${f}`);
  console.error(`\nverify-plugin-wiring: ${failures.length} failure(s).`);
  process.exit(1);
}
console.log(
  `verify-plugin-wiring: ${pluginImports.size} plugin(s), ${tsFiles.length} source file(s), all wiring checks pass.`,
);
