/**
 * Loads base material configs and slicer-specific override files
 * Format-aware loading for INI and JSON files
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- parsed JSON/INI payloads */

import fs from "fs/promises";
import { Dirent } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ini from "ini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/, so go up two levels to reach project root
const rootDir = path.resolve(__dirname, "../..");

/** Machine registry filename under `config/` (global vendor + printer list). */
export const MACHINE_REGISTRY_BASENAME = "printers.json";

/** Slicer definitions (ids, formats, templates): `config/slicers.json`. */
export const SLICERS_CONFIG_BASENAME = "slicers.json";

/** Absolute path to the global machine registry (`config/printers.json`). */
export function getMachineRegistryPath(): string {
  return path.join(rootDir, "config", MACHINE_REGISTRY_BASENAME);
}

/** Absolute path to `config/slicers.json`. */
export function getSlicersConfigPath(): string {
  return path.join(rootDir, "config", SLICERS_CONFIG_BASENAME);
}

export type SlicerFormat = "ini" | "json";

/** One row in `config/slicers.json`. */
export interface SlicerDefinition {
  id: string;
  label: string;
  format: SlicerFormat;
  baseFilename: string;
  /** Path relative to repo root, e.g. `templates/prusaslicer.ini.template`. */
  template: string;
}

export interface SlicersConfigData {
  description?: string;
  slicers: SlicerDefinition[];
}

/**
 * Load and parse `config/slicers.json` (required for builds and validation).
 */
export async function loadSlicersConfig(): Promise<SlicersConfigData> {
  const configPath = getSlicersConfigPath();
  let content: string;
  try {
    content = await fs.readFile(configPath, "utf-8");
  } catch (e: any) {
    if (e?.code === "ENOENT") {
      throw new Error(`Missing ${path.relative(rootDir, configPath)}`, { cause: e });
    }
    throw e;
  }
  const data = JSON.parse(content) as SlicersConfigData;
  if (!Array.isArray(data.slicers) || data.slicers.length === 0) {
    throw new Error(`config/${SLICERS_CONFIG_BASENAME} must contain a non-empty "slicers" array`);
  }
  return data;
}

/** Lookup a slicer definition by id; returns undefined if unknown. */
export async function getSlicerDefinition(slicerId: string): Promise<SlicerDefinition | undefined> {
  const { slicers } = await loadSlicersConfig();
  return slicers.find((s) => s.id === slicerId);
}

/** Printer row nested under a vendor in `config/printers.json`. */
export interface MachineRegistryPrinterRow {
  id: string;
  name: string;
  slicers: string[];
  nozzles: string[];
}

/** Vendor row in `config/printers.json` → `vendors`. */
export interface MachineRegistryVendor {
  id: string;
  name: string;
  url: string;
  printers: MachineRegistryPrinterRow[];
}

/** Parsed `config/printers.json` (machine registry). */
export interface MachineRegistryData {
  description?: string;
  vendors: MachineRegistryVendor[];
}

/** Flattened printer with `vendor_id` for build/validation logic. */
export interface MachineRegistryPrinter extends MachineRegistryPrinterRow {
  vendor_id: string;
}

/**
 * All printers in registry order, each with `vendor_id` from its parent vendor.
 */
export function listRegistryPrinters(data: MachineRegistryData): MachineRegistryPrinter[] {
  const out: MachineRegistryPrinter[] = [];
  for (const v of data.vendors ?? []) {
    for (const p of v.printers ?? []) {
      out.push({ ...p, vendor_id: v.id });
    }
  }
  return out;
}

/**
 * Find a printer by `id` in a parsed machine registry.
 */
export function findRegistryPrinter(
  data: MachineRegistryData,
  printerId: string
): MachineRegistryPrinter | undefined {
  for (const v of data.vendors ?? []) {
    const row = v.printers?.find((p) => p.id === printerId);
    if (row) {
      return { ...row, vendor_id: v.id };
    }
  }
  return undefined;
}

// Slicer type is now a string - dynamically discovered from directory structure
type INIConfig = Record<string, Record<string, any>>;
type JSONConfig = Record<string, any>;

/**
 * Load a JSON file
 */
async function loadJSON(filePath: string): Promise<JSONConfig | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error: any) {
    // File doesn't exist or can't be read (permission issues, etc.)
    if (error.code === "ENOENT" || error.code === "EPERM") {
      return null;
    }
    throw new Error(`Failed to load JSON file ${filePath}: ${error.message}`, { cause: error });
  }
}

/**
 * Load an INI file
 */
async function loadINI(filePath: string): Promise<INIConfig | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return ini.parse(content);
  } catch (error: any) {
    // File doesn't exist or can't be read (permission issues, etc.)
    if (error.code === "ENOENT" || error.code === "EPERM") {
      return null;
    }
    throw new Error(`Failed to load INI file ${filePath}: ${error.message}`, { cause: error });
  }
}

/**
 * Load base material config for a slicer
 * Returns both the config and the file path for format detection
 */
export async function loadBaseConfig(
  material: string,
  slicer: string
): Promise<{ config: INIConfig | JSONConfig | null; filePath: string | null }> {
  const def = await getSlicerDefinition(slicer);
  if (!def) {
    return { config: null, filePath: null };
  }

  const slicerDir = path.join(rootDir, "materials", material, slicer);
  const basePath = path.join(slicerDir, def.baseFilename);

  try {
    await fs.access(basePath);
  } catch {
    return { config: null, filePath: null };
  }

  if (def.format === "ini") {
    const config = await loadINI(basePath);
    return { config, filePath: basePath };
  }
  if (def.format === "json") {
    const config = await loadJSON(basePath);
    return { config, filePath: basePath };
  }
  return { config: null, filePath: null };
}

/**
 * Load printer overrides for a material and slicer
 */
export async function loadPrinterOverrides(
  material: string,
  slicer: string
): Promise<JSONConfig | null> {
  const overridePath = path.join(rootDir, "materials", material, slicer, "printers.json");
  return await loadJSON(overridePath);
}

/**
 * Load nozzle overrides for a material and slicer
 */
export async function loadNozzleOverrides(
  material: string,
  slicer: string
): Promise<JSONConfig | null> {
  const overridePath = path.join(rootDir, "materials", material, slicer, "nozzles.json");
  return await loadJSON(overridePath);
}

/**
 * Load combination-specific overrides
 */
export async function loadCombinationOverrides(
  material: string,
  slicer: string,
  printer: string,
  nozzle: string
): Promise<JSONConfig | null> {
  const overridePath = path.join(
    rootDir,
    "materials",
    material,
    slicer,
    "combinations",
    `${printer}-${nozzle}.json`
  );
  return await loadJSON(overridePath);
}

export interface AllOverrides {
  printers: JSONConfig | null;
  nozzles: JSONConfig | null;
  combination: JSONConfig | null;
}

/** Keys copied from config; must not be merged from material overrides into slicer configs. */
const PRINTER_REGISTRY_META = new Set(["id", "name", "vendor", "vendor_id", "slicers", "nozzles"]);

/**
 * Strip registry-only fields so they are not merged into generated slicer configs.
 */
export function stripPrinterRegistryMeta(raw: JSONConfig | null): JSONConfig | null {
  if (!raw || !raw.printers || typeof raw.printers !== "object") {
    return raw;
  }
  const printers: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(raw.printers)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      printers[id] = entry;
      continue;
    }
    const clone = { ...(entry as Record<string, unknown>) };
    for (const k of PRINTER_REGISTRY_META) {
      delete clone[k];
    }
    printers[id] = clone;
  }
  return { ...raw, printers };
}

/**
 * Load all overrides for a material, slicer, printer, and nozzle combination
 */
export async function loadAllOverrides(
  material: string,
  slicer: string,
  printer: string,
  nozzle: string
): Promise<AllOverrides> {
  const [printerOverrides, nozzleOverrides, combinationOverrides] = await Promise.all([
    loadPrinterOverrides(material, slicer),
    loadNozzleOverrides(material, slicer),
    loadCombinationOverrides(material, slicer, printer, nozzle),
  ]);

  return {
    printers: stripPrinterRegistryMeta(printerOverrides),
    nozzles: nozzleOverrides,
    combination: combinationOverrides,
  };
}

/**
 * Get all materials in the materials directory
 */
export async function getAllMaterials(): Promise<string[]> {
  const materialsDir = path.join(rootDir, "materials");
  try {
    const entries = await fs.readdir(materialsDir, { withFileTypes: true });
    return entries
      .filter((entry: Dirent) => entry.isDirectory())
      .map((entry: Dirent) => entry.name);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Get slicer ids for a material: directories under `materials/<material>/` that
 * match a configured id in `config/slicers.json`, in config order.
 */
export async function getSlicersForMaterial(material: string): Promise<string[]> {
  const { slicers: defs } = await loadSlicersConfig();
  const configuredOrder = defs.map((d) => d.id);

  const materialDir = path.join(rootDir, "materials", material);
  let onDisk: Set<string>;
  try {
    const entries = await fs.readdir(materialDir, { withFileTypes: true });
    onDisk = new Set(entries.filter((e: Dirent) => e.isDirectory()).map((e: Dirent) => e.name));
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return configuredOrder.filter((id) => onDisk.has(id));
}

/**
 * All configured slicer ids (`config/slicers.json` order).
 */
export async function getAllSlicers(): Promise<string[]> {
  const { slicers } = await loadSlicersConfig();
  return slicers.map((s) => s.id);
}
