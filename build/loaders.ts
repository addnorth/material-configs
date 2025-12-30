/**
 * Loads base material configs and slicer-specific override files
 * Format-aware loading for INI and JSON files
 */

import fs from "fs/promises";
import { Dirent } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ini from "ini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/, so go up two levels to reach project root
const rootDir = path.resolve(__dirname, "../..");

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
    throw new Error(`Failed to load JSON file ${filePath}: ${error.message}`);
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
    throw new Error(`Failed to load INI file ${filePath}: ${error.message}`);
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
  const materialDir = path.join(rootDir, "materials", material);
  const slicerDir = path.join(materialDir, slicer);

  // Try to detect format by checking for base.ini or base.json
  const iniPath = path.join(slicerDir, "base.ini");
  const jsonPath = path.join(slicerDir, "base.json");
  
  try {
    // Check for INI file first
    await fs.access(iniPath);
    const config = await loadINI(iniPath);
    return { config, filePath: iniPath };
  } catch {
    // If INI doesn't exist, try JSON
    try {
      await fs.access(jsonPath);
      const config = await loadJSON(jsonPath);
      return { config, filePath: jsonPath };
    } catch {
      return { config: null, filePath: null };
    }
  }
}

/**
 * Load printer overrides for a material and slicer
 */
export async function loadPrinterOverrides(
  material: string,
  slicer: string
): Promise<JSONConfig | null> {
  const overridePath = path.join(
    rootDir,
    "materials",
    material,
    slicer,
    "printers.json"
  );
  return await loadJSON(overridePath);
}

/**
 * Load nozzle overrides for a material and slicer
 */
export async function loadNozzleOverrides(
  material: string,
  slicer: string
): Promise<JSONConfig | null> {
  const overridePath = path.join(
    rootDir,
    "materials",
    material,
    slicer,
    "nozzles.json"
  );
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

/**
 * Load all overrides for a material, slicer, printer, and nozzle combination
 */
export async function loadAllOverrides(
  material: string,
  slicer: string,
  printer: string,
  nozzle: string
): Promise<AllOverrides> {
  const [printerOverrides, nozzleOverrides, combinationOverrides] =
    await Promise.all([
      loadPrinterOverrides(material, slicer),
      loadNozzleOverrides(material, slicer),
      loadCombinationOverrides(material, slicer, printer, nozzle),
    ]);

  return {
    printers: printerOverrides,
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
 * Get all slicers for a material by reading directories
 */
export async function getSlicersForMaterial(material: string): Promise<string[]> {
  const materialDir = path.join(rootDir, "materials", material);
  try {
    const entries = await fs.readdir(materialDir, { withFileTypes: true });
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
 * Get all slicers across all materials
 */
export async function getAllSlicers(): Promise<string[]> {
  const materials = await getAllMaterials();
  const slicerSet = new Set<string>();
  
  for (const material of materials) {
    const slicers = await getSlicersForMaterial(material);
    for (const slicer of slicers) {
      slicerSet.add(slicer);
    }
  }
  
  return Array.from(slicerSet);
}
