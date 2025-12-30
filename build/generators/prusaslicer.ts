/**
 * PrusaSlicer INI config generator
 * Generates INI files with section inheritance and wildcard patterns
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ini from "ini";
import { loadBaseConfig, loadAllOverrides, AllOverrides } from "../loaders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/generators/, so go up three levels to reach project root
const rootDir = path.resolve(__dirname, "../../..");

export interface GenerateOptions {
  dryRun?: boolean;
  verbose?: boolean;
  printer?: string;
  nozzle?: string;
}

export interface PrusaConfigData {
  material: string;
  config: Record<string, Record<string, any>>;
  filename: string;
}

/**
 * Apply printer overrides to INI config
 */
function applyPrinterOverrides(
  config: Record<string, Record<string, any>>,
  overrides: AllOverrides,
  printer: string
): Record<string, Record<string, any>> {
  if (!overrides?.printers?.[printer]) {
    return config;
  }

  const printerOverrides = overrides.printers[printer];

  // Apply overrides to relevant sections
  // Look for sections that match the printer (e.g., [print:*MK4*])
  for (const [sectionKey, sectionValue] of Object.entries(config)) {
    if (sectionKey.startsWith("print:") && sectionKey.includes(printer)) {
      // Merge overrides into this section
      Object.assign(sectionValue, printerOverrides);
    }
  }

  return config;
}

/**
 * Apply nozzle overrides to INI config
 */
function applyNozzleOverrides(
  config: Record<string, Record<string, any>>,
  overrides: AllOverrides,
  nozzle: string
): Record<string, Record<string, any>> {
  if (!overrides?.nozzles?.[nozzle]) {
    return config;
  }

  const nozzleOverrides = overrides.nozzles[nozzle];

  // Apply overrides to sections that match the nozzle (e.g., [print:*0.4nozzle*])
  const nozzlePattern = nozzle.replace("mm", "");
  for (const [sectionKey, sectionValue] of Object.entries(config)) {
    if (
      sectionKey.includes(`${nozzlePattern}nozzle`) ||
      sectionKey.includes(nozzle)
    ) {
      // Merge overrides into this section
      Object.assign(sectionValue, nozzleOverrides);
    }
  }

  return config;
}

/**
 * Apply combination-specific overrides to INI config
 */
function applyCombinationOverrides(
  config: Record<string, Record<string, any>>,
  overrides: AllOverrides,
  printer: string,
  nozzle: string
): Record<string, Record<string, any>> {
  if (!overrides?.combination) {
    return config;
  }

  const combinationOverrides = overrides.combination;
  const nozzlePattern = nozzle.replace("mm", "");

  // Find sections that match both printer and nozzle
  for (const [sectionKey, sectionValue] of Object.entries(config)) {
    if (
      sectionKey.includes(printer) &&
      (sectionKey.includes(`${nozzlePattern}nozzle`) ||
        sectionKey.includes(nozzle))
    ) {
      Object.assign(sectionValue, combinationOverrides);
    }
  }

  return config;
}

/**
 * Convert INI object back to INI string format
 */
function stringifyINI(config: Record<string, Record<string, any>>): string {
  const lines: string[] = [];

  for (const [sectionKey, sectionValue] of Object.entries(config)) {
    lines.push(`[${sectionKey}]`);

    for (const [key, value] of Object.entries(sectionValue)) {
      if (Array.isArray(value)) {
        lines.push(`${key} = ${value.join("; ")}`);
      } else {
        lines.push(`${key} = ${value}`);
      }
    }

    lines.push(""); // Empty line between sections
  }

  return lines.join("\n");
}

/**
 * Generate a config file for a material
 */
export async function generateConfig(
  material: string,
  slicer: string,
  version: string,
  options: GenerateOptions = {}
): Promise<Record<string, Record<string, any>>> {
  const { dryRun = false, verbose = false, printer, nozzle } = options;

  // Load base config
  const { config: baseConfig } = await loadBaseConfig(material, slicer);
  if (!baseConfig) {
    throw new Error(`Base config not found for material: ${material}`);
  }

  // Deep clone the config
  let config = JSON.parse(JSON.stringify(baseConfig)) as Record<
    string,
    Record<string, any>
  >;

  // Load overrides if printer and nozzle are specified
  if (printer && nozzle) {
    const overrides = await loadAllOverrides(
      material,
      slicer,
      printer,
      nozzle
    );

    // Apply overrides in order of specificity
    config = applyPrinterOverrides(config, overrides, printer);
    config = applyNozzleOverrides(config, overrides, nozzle);
    config = applyCombinationOverrides(config, overrides, printer, nozzle);
  }

  // Update version if present in vendor section
  if (config.vendor && config.vendor.config_version) {
    config.vendor.config_version = version;
  }

  if (verbose) {
    console.log(`Generated PrusaSlicer config for ${material} (${version})`);
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
): Promise<PrusaConfigData[]> {
  const { dryRun = false, verbose = false } = options;

  const { config: baseConfig } = await loadBaseConfig(material, slicer);
  if (!baseConfig) {
    if (verbose) {
      console.log(`No base config found for material: ${material}, skipping`);
    }
    return [];
  }

  // For PrusaSlicer, we typically generate one file per material
  // But we can also generate per printer/nozzle if needed
  const config = await generateConfig(material, slicer, version, options);

  return [
    {
      material,
      config,
      filename: `addnorth_${material}_${version}.ini`,
    },
  ];
}

/**
 * Save generated config to file
 */
export async function saveConfig(
  configData: PrusaConfigData,
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

  // Convert INI object to string
  const iniString = stringifyINI(configData.config);
  await fs.writeFile(outputPath, iniString, "utf-8");

  return outputPath;
}
