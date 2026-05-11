/**
 * Bambu Slicer JSON config generator
 * Generates one JSON file per printer (even if settings are identical)
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- merged Bambu JSON blobs */

import fs from "fs/promises";
import path from "path";
import { deepMerge } from "../merge.js";
import {
  loadBaseConfig,
  loadAllOverrides,
  AllOverrides,
  getMachineRegistryPath,
  listRegistryPrinters,
  type MachineRegistryData,
} from "../loaders.js";

export interface GenerateOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ConfigData {
  material: string;
  /** Short printer id (matches config/printers.json and materials/.../printers.json). */
  printer: string;
  nozzle: string;
  /** Bambu Studio compatible_printers string, e.g. "Bambu Lab X1 0.4 nozzle". */
  printerString: string;
  config: Record<string, any>;
  filename: string;
}

/**
 * Apply printer-specific overrides to config
 */
function applyPrinterOverrides(
  config: Record<string, any>,
  overrides: AllOverrides,
  printerId: string
): Record<string, any> {
  if (!overrides?.printers?.[printerId]) {
    return config;
  }

  return deepMerge(config, overrides.printers[printerId]);
}

/**
 * Apply nozzle-specific overrides to config
 */
function applyNozzleOverrides(
  config: Record<string, any>,
  overrides: AllOverrides,
  nozzle: string
): Record<string, any> {
  if (!overrides?.nozzles?.[nozzle]) {
    return config;
  }

  return deepMerge(config, overrides.nozzles[nozzle]);
}

/**
 * Apply combination-specific overrides to config
 */
function applyCombinationOverrides(
  config: Record<string, any>,
  overrides: AllOverrides
): Record<string, any> {
  if (!overrides?.combination) {
    return config;
  }

  return deepMerge(config, overrides.combination);
}

/**
 * Generate a single config file for a material, printer id, and nozzle size
 */
export async function generateConfig(
  material: string,
  slicer: string,
  printerId: string,
  compatiblePrinterString: string,
  nozzleSize: string,
  version: string,
  options: GenerateOptions = {}
): Promise<Record<string, any>> {
  const { verbose = false } = options;

  // Load base config
  const { config: baseConfig } = await loadBaseConfig(material, slicer);
  if (!baseConfig) {
    throw new Error(`Base config not found for material: ${material}`);
  }

  const nozzleMm = `${nozzleSize}mm`;

  // Load all overrides (registry meta stripped in loadAllOverrides)
  const overrides = await loadAllOverrides(material, slicer, printerId, nozzleMm);

  // Start with base config (deep clone)
  let config = JSON.parse(JSON.stringify(baseConfig)) as Record<string, any>;

  // Apply overrides in order of specificity
  config = applyPrinterOverrides(config, overrides, printerId);
  config = applyNozzleOverrides(config, overrides, nozzleMm);
  config = applyCombinationOverrides(config, overrides);

  // Update compatible_printers to only include this printer
  config.compatible_printers = [compatiblePrinterString];

  // Update version if present
  if (config.version) {
    config.version = version;
  }

  if (verbose) {
    console.log(`Generated config for ${material} - ${printerId} (${version})`);
  }

  return config;
}

/**
 * Generate all config files for a material
 */
export async function generateAllConfigs(
  material: string,
  slicer: string,
  version: string,
  options: GenerateOptions = {}
): Promise<ConfigData[]> {
  const { verbose = false } = options;

  const { config: baseConfig } = await loadBaseConfig(material, slicer);
  if (!baseConfig) {
    if (verbose) {
      console.log(`No base config found for material: ${material}, skipping`);
    }
    return [];
  }

  const printersConfigPath = getMachineRegistryPath();
  const printersConfig = JSON.parse(
    await fs.readFile(printersConfigPath, "utf-8")
  ) as MachineRegistryData;

  const results: ConfigData[] = [];

  for (const printerRow of listRegistryPrinters(printersConfig)) {
    const printerId = printerRow.id;
    if (!printerRow.slicers.includes(slicer)) {
      continue;
    }

    const printerName = printerRow.name;
    if (typeof printerName !== "string" || !printerName.trim()) {
      throw new Error(
        `Missing name for printer "${printerId}" in config/printers.json (required for Bambu Studio compatible_printers)`
      );
    }

    for (const nozzle of printerRow.nozzles) {
      const nozzleSize = nozzle.replace("mm", "");
      const compatibleString = `${printerName} ${nozzleSize} nozzle`;

      try {
        const config = await generateConfig(
          material,
          slicer,
          printerId,
          compatibleString,
          nozzleSize,
          version,
          options
        );

        results.push({
          material,
          printer: printerId,
          nozzle: nozzleSize,
          printerString: compatibleString,
          config,
          filename: `addnorth_${material}_${printerId}_${nozzleSize}mm_${version}.json`,
        });
      } catch (error: any) {
        if (verbose) {
          console.error(`Error generating config for ${material} - ${printerId}:`, error.message);
        }
        throw error;
      }
    }
  }

  return results;
}

/**
 * Save generated config to file
 */
export async function saveConfig(
  configData: ConfigData,
  outputDir: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { dryRun = false } = options;
  const outputPath = path.join(outputDir, configData.filename);

  if (dryRun) {
    console.log(`[DRY RUN] Would save: ${outputPath}`);
    return outputPath;
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(configData.config, null, 4), "utf-8");

  return outputPath;
}
