#!/usr/bin/env node
/**
 * Push KEY=VALUE pairs from a .env file to Vercel (production by default).
 * Usage: node scripts/vercel-env-push.mjs [.env.production] [environment]
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [file = ".env.production", environment = "production"] = process.argv.slice(2);

function parseEnv(content) {
  const vars = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && value !== "") vars.push({ key, value });
  }
  return vars;
}

let content;
try {
  content = readFileSync(file, "utf8");
} catch {
  console.error(`Missing env file: ${file}`);
  process.exit(1);
}

const vars = parseEnv(content);
if (vars.length === 0) {
  console.error(`No variables found in ${file}`);
  process.exit(1);
}

console.log(`Uploading ${vars.length} variable(s) from ${file} to Vercel (${environment})…`);

let failed = 0;
for (const { key, value } of vars) {
  const result = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      key,
      environment,
      "--value",
      value,
      "--force",
      "--yes",
      "--sensitive",
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    console.error(`Failed to set ${key}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`${failed} variable(s) failed to upload`);
  process.exit(1);
}

console.log("Environment variables synced.");
