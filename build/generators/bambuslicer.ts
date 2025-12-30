/**
 * Bambu Slicer JSON config generator
 * Generates one JSON file per printer (even if settings are identical)
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { deepMerge } from "../merge.js";
import { loadBaseConfig, loadAllOverrides, AllOverrides } from "../loaders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/generators/, so go up three levels to reach project root
const rootDir = path.resolve(__dirname, "../../..");

export interface GenerateOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ConfigData {
  material: string;
  printer: string;
  nozzle: string;
  printerString: string;
  config: Record<string, any>;
  filename: string;
}

/**
 * Extract printer name from compatible printer string
 */
function extractPrinterName(printerString: string): string {
  return printerString.replace(/\s+\d+\.\d+\s+nozzle$/, "");
}

/**
 * Extract nozzle size from compatible printer string
 */
function extractNozzleSize(printerString: string): string | null {
  const match = printerString.match(/(\d+\.\d+)\s+nozzle$/);
  return match ? match[1] : null;
}

/**
 * Apply printer-specific overrides to config
 */
function applyPrinterOverrides(
  config: Record<string, any>,
  overrides: AllOverrides,
  printer: string
): Record<string, any> {
  if (!overrides?.printers?.[printer]) {
    return config;
  }

  return deepMerge(config, overrides.printers[printer]);
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
  overrides: AllOverrides,
  printer: string,
  nozzle: string
): Record<string, any> {
  if (!overrides?.combination) {
    return config;
  }

  return deepMerge(config, overrides.combination);
}

/**
 * Generate a single config file for a material, printer, and nozzle combination
 */
export async function generateConfig(
  material: string,
  slicer: string,
  printer: string,
  version: string,
  options: GenerateOptions = {}
): Promise<Record<string, any>> {
  const { dryRun = false, verbose = false } = options;

  // Load base config
  const { config: baseConfig } = await loadBaseConfig(material, slicer);
  if (!baseConfig) {
    throw new Error(`Base config not found for material: ${material}`);
  }

  // Extract printer name and nozzle size
  const printerName = extractPrinterName(printer);
  const nozzleSize = extractNozzleSize(printer);

  if (!nozzleSize) {
    throw new Error(
      `Could not extract nozzle size from printer string: ${printer}`
    );
  }

  // Load all overrides
  const overrides = await loadAllOverrides(
    material,
    slicer,
    printerName,
    nozzleSize
  );

  // Start with base config
  let config = JSON.parse(JSON.stringify(baseConfig)) as Record<string, any>; // Deep clone

  // Apply overrides in order of specificity
  // 1. Printer overrides
  config = applyPrinterOverrides(config, overrides, printerName);

  // 2. Nozzle overrides
  config = applyNozzleOverrides(config, overrides, nozzleSize);

  // 3. Combination overrides (most specific)
  config = applyCombinationOverrides(
    config,
    overrides,
    printerName,
    nozzleSize
  );

  // Update compatible_printers to only include this printer
  config.compatible_printers = [printer];

  // Update version if present
  if (config.version) {
    config.version = version;
  }

  if (verbose) {
    console.log(`Generated config for ${material} - ${printer} (${version})`);
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
  const { dryRun = false, verbose = false } = options;

  const { config: baseConfig } = await loadBaseConfig(material, slicer);
  if (!baseConfig) {
    if (verbose) {
      console.log(`No base config found for material: ${material}, skipping`);
    }
    return [];
  }

  // Load printer and nozzle configs to generate compatible_printers list
  const printersConfigPath = path.join(rootDir, "config", "printers.json");
  const printersConfig = JSON.parse(
    await fs.readFile(printersConfigPath, "utf-8")
  );

  // Generate list of compatible printers from config
  const compatiblePrinters: string[] = [];
  for (const [printerKey, printerData] of Object.entries(
    printersConfig.printers
  )) {
    const printer = printerData as { slicers: string[]; nozzles: string[] };
    if (printer.slicers.includes("bambuslicer")) {
      for (const nozzle of printer.nozzles) {
        // Format: "{printerKey} {nozzle} nozzle" (printerKey already includes "Bambu Lab")
        const nozzleSize = nozzle.replace("mm", "");
        compatiblePrinters.push(`${printerKey} ${nozzleSize} nozzle`);
      }
    }
  }

  const results: ConfigData[] = [];

  for (const printer of compatiblePrinters) {
    try {
      const config = await generateConfig(
        material,
        slicer,
        printer,
        version,
        options
      );
      const printerName = extractPrinterName(printer);
      const nozzleSize = extractNozzleSize(printer);

      if (!nozzleSize) {
        throw new Error(`Could not extract nozzle size from: ${printer}`);
      }

      results.push({
        material,
        printer: printerName,
        nozzle: nozzleSize,
        printerString: printer,
        config,
        filename: `addnorth_${material}_${printerName.replace(
          /\s+/g,
          "-"
        )}_${nozzleSize}mm_${version}.json`,
      });
    } catch (error: any) {
      if (verbose) {
        console.error(
          `Error generating config for ${material} - ${printer}:`,
          error.message
        );
      }
      throw error;
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
  await fs.writeFile(
    outputPath,
    JSON.stringify(configData.config, null, 4),
    "utf-8"
  );

  return outputPath;
}
