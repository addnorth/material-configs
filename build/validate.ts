/**
 * Validates JSON/INI syntax and required fields
 * Provides clear error messages with file locations
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ini from "ini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/, so go up two levels to reach project root
const rootDir = path.resolve(__dirname, "../..");

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate JSON file syntax
 */
export async function validateJSON(
  filePath: string
): Promise<ValidationResult | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    JSON.parse(content);
    return { isValid: true, error: null };
  } catch (error: any) {
    // File doesn't exist or can't be read (permission issues) - not an error
    if (error.code === "ENOENT" || error.code === "EPERM") {
      return null;
    }
    return {
      isValid: false,
      error: `Invalid JSON syntax in ${filePath}: ${error.message}`,
    };
  }
}

/**
 * Validate INI file syntax
 */
export async function validateINI(
  filePath: string
): Promise<ValidationResult | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    ini.parse(content);
    return { isValid: true, error: null };
  } catch (error: any) {
    // File doesn't exist or can't be read (permission issues) - not an error
    if (error.code === "ENOENT" || error.code === "EPERM") {
      return null;
    }
    return {
      isValid: false,
      error: `Invalid INI syntax in ${filePath}: ${error.message}`,
    };
  }
}

/**
 * Validate a generated Bambu Slicer config
 */
export function validateBambuConfig(
  config: Record<string, any>
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (
    !config.compatible_printers ||
    !Array.isArray(config.compatible_printers)
  ) {
    errors.push("Missing or invalid compatible_printers array");
  }

  if (
    !config.filament_settings_id ||
    !Array.isArray(config.filament_settings_id)
  ) {
    errors.push("Missing or invalid filament_settings_id");
  }

  if (!config.filament_type || !Array.isArray(config.filament_type)) {
    errors.push("Missing or invalid filament_type");
  }

  // Check that compatible_printers has exactly one entry
  if (config.compatible_printers && config.compatible_printers.length !== 1) {
    warnings.push(
      `Expected exactly one printer in compatible_printers, found ${config.compatible_printers.length}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a generated PrusaSlicer config
 */
export function validatePrusaConfig(
  config: Record<string, Record<string, any>>
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Should have vendor section
  if (!config.vendor) {
    errors.push("Missing [vendor] section");
  } else {
    if (!config.vendor.name) {
      errors.push("Missing vendor.name in [vendor] section");
    }
    if (!config.vendor.config_version) {
      warnings.push("Missing vendor.config_version in [vendor] section");
    }
  }

  // Should have at least one filament section
  const hasFilamentSection = Object.keys(config).some((key) =>
    key.startsWith("filament:")
  );
  if (!hasFilamentSection) {
    warnings.push("No [filament:*] sections found");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all override files for a material
 */
export async function validateMaterialOverrides(
  material: string
): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const materialDir = path.join(rootDir, "materials", material);

  for (const slicer of ["prusaslicer", "bambuslicer"]) {
    const slicerDir = path.join(materialDir, slicer);

    // Validate printers.json
    const printersPath = path.join(slicerDir, "printers.json");
    const printersResult = await validateJSON(printersPath);
    if (printersResult && !printersResult.isValid && printersResult.error) {
      errors.push(printersResult.error);
    }

    // Validate nozzles.json
    const nozzlesPath = path.join(slicerDir, "nozzles.json");
    const nozzlesResult = await validateJSON(nozzlesPath);
    if (nozzlesResult && !nozzlesResult.isValid && nozzlesResult.error) {
      errors.push(nozzlesResult.error);
    }

    // Validate combination files
    const combinationsDir = path.join(slicerDir, "combinations");
    try {
      const files = await fs.readdir(combinationsDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(combinationsDir, file);
          const result = await validateJSON(filePath);
          if (result && !result.isValid && result.error) {
            errors.push(result.error);
          }
        }
      }
    } catch (error: any) {
      // Directory doesn't exist or can't be read (permission issues), that's okay
      if (error.code !== "ENOENT" && error.code !== "EPERM") {
        throw error;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all base configs for a material
 */
export async function validateMaterialBaseConfigs(
  material: string
): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const materialDir = path.join(rootDir, "materials", material);

  // Dynamically discover and validate all slicers
  const { getSlicersForMaterial } = await import("./loaders.js");
  const slicers = await getSlicersForMaterial(material);

  for (const slicer of slicers) {
    const iniPath = path.join(materialDir, slicer, "base.ini");
    const jsonPath = path.join(materialDir, slicer, "base.json");

    // Check both INI and JSON
    const iniResult = await validateINI(iniPath);
    const jsonResult = await validateJSON(jsonPath);

    // If INI exists and is invalid, report error
    if (iniResult && !iniResult.isValid && iniResult.error) {
      errors.push(iniResult.error);
    }

    // If JSON exists and is invalid, report error
    if (jsonResult && !jsonResult.isValid && jsonResult.error) {
      errors.push(jsonResult.error);
    }

    // Only warn if neither exists
    if (!iniResult && !jsonResult) {
      warnings.push(
        `[${material}/${slicer}] base config not found: ${iniPath} or ${jsonPath}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all materials
 */
export async function validateAll(): Promise<ConfigValidationResult> {
  const { getAllMaterials } = await import("./loaders.js");
  const materials = await getAllMaterials();

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const material of materials) {
    const baseResult = await validateMaterialBaseConfigs(material);
    const overrideResult = await validateMaterialOverrides(material);

    allErrors.push(...baseResult.errors.map((e) => `[${material}] ${e}`));
    allErrors.push(...overrideResult.errors.map((e) => `[${material}] ${e}`));
    allWarnings.push(...baseResult.warnings.map((w) => `[${material}] ${w}`));
    allWarnings.push(
      ...overrideResult.warnings.map((w) => `[${material}] ${w}`)
    );
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
