#!/usr/bin/env node
/**
 * Scaffold a new material: for each row in config/slicers.json, create
 * materials/<slug>/<slicerId>/ with base file from template and empty overrides.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- scaffold error context */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { loadSlicersConfig } from "../build/loaders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Compiled to dist/scripts/ — repo root is two levels up
const rootDir = path.resolve(__dirname, "../..");

function printHelp(): void {
  console.log(`
Create a new material folder: one subdirectory per slicer in config/slicers.json,
each with a base file from that row's template and empty override files.

Usage:
  npm run add-material
  npm run add-material -- --material <slug>

Options:
  --material, -m   Material folder name (lowercase, e.g. petg). If omitted,
                    you will be prompted when running in a terminal.
  --help, -h       Show this message

Examples:
  npm run add-material -- --material petg
`);
}

function parseArgs(): { help: boolean; material: string | undefined } {
  const args = process.argv.slice(2);
  let help = false;
  let material: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") {
      help = true;
    } else if (a === "--material" || a === "-m") {
      const next = args[++i];
      if (!next || next.startsWith("-")) {
        console.error(`Missing value for ${a}`);
        printHelp();
        process.exit(1);
      }
      material = next;
    } else {
      console.error(`Unknown option: ${a}`);
      printHelp();
      process.exit(1);
    }
  }

  return { help, material };
}

/** Normalized directory name: lowercase, hyphens, no leading/trailing fluff. */
function normalizeMaterialSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidMaterialSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(slug);
}

/** Uppercase label for filament preset names (pla → PLA, petg → PETG). */
function materialLabelFromSlug(slug: string): string {
  return slug.toUpperCase();
}

function applyTemplate(template: string, slug: string): string {
  const label = materialLabelFromSlug(slug);
  return template.replaceAll("{MATERIAL}", label).replaceAll("{MATERIAL_TYPE}", label);
}

async function readTemplate(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

const EMPTY_PRINTERS_JSON = JSON.stringify({ printers: {} }, null, 2) + "\n";

const EMPTY_NOZZLES_JSON = "{}\n";

/** Valid empty override files + combinations/ (.gitkeep so git tracks the dir). */
async function writeSlicerOverrides(slicerDir: string): Promise<void> {
  await fs.mkdir(path.join(slicerDir, "combinations"), { recursive: true });
  await fs.writeFile(path.join(slicerDir, "printers.json"), EMPTY_PRINTERS_JSON, "utf-8");
  await fs.writeFile(path.join(slicerDir, "nozzles.json"), EMPTY_NOZZLES_JSON, "utf-8");
  await fs.writeFile(path.join(slicerDir, "combinations", ".gitkeep"), "", "utf-8");
}

async function promptSlug(): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const line = await rl.question("Material name (short, lowercase, e.g. petg or tpu-95a): ");
    return line;
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const { help, material: materialArg } = parseArgs();
  if (help) {
    printHelp();
    process.exit(0);
  }

  let raw = materialArg;
  if (!raw) {
    if (!input.isTTY) {
      console.error(
        "No terminal for prompts. Pass a name: npm run add-material -- --material <slug>"
      );
      process.exit(1);
    }
    raw = await promptSlug();
  }

  const slug = normalizeMaterialSlug(raw);
  if (!slug) {
    console.error("Material name is empty.");
    process.exit(1);
  }
  if (!isValidMaterialSlug(slug)) {
    console.error(
      `Invalid material name "${slug}". Use lowercase letters, digits, and hyphens (e.g. petg, abs-cf).`
    );
    process.exit(1);
  }

  const materialRoot = path.join(rootDir, "materials", slug);
  try {
    await fs.access(materialRoot);
    console.error(`Already exists: ${materialRoot}\nRemove it or pick another name.`);
    process.exit(1);
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      throw e;
    }
  }

  const { slicers } = await loadSlicersConfig();

  for (const def of slicers) {
    const tmplPath = path.isAbsolute(def.template)
      ? def.template
      : path.join(rootDir, def.template);
    const tmplRaw = await readTemplate(tmplPath);
    const content = applyTemplate(tmplRaw, slug);

    if (def.format === "json") {
      try {
        JSON.parse(content);
      } catch (e: any) {
        throw new Error(`Scaffolded JSON for slicer "${def.id}" is invalid: ${e.message}`, {
          cause: e,
        });
      }
    }

    const slicerDir = path.join(materialRoot, def.id);
    await fs.mkdir(slicerDir, { recursive: true });
    await fs.writeFile(path.join(slicerDir, def.baseFilename), content, "utf-8");
    await writeSlicerOverrides(slicerDir);
  }

  console.log(`Created material "${slug}" at materials/${slug}/`);
  for (const def of slicers) {
    console.log(`  - ${def.id}/${def.baseFilename}`);
    console.log(`  - ${def.id}/printers.json (empty overrides)`);
    console.log(`  - ${def.id}/nozzles.json`);
    console.log(`  - ${def.id}/combinations/.gitkeep`);
  }
  console.log(
    `Filament preset label is "${materialLabelFromSlug(slug)}" — tune temperatures and run npm run validate.`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
