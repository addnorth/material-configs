/**
 * Generator registry - maps formats to generator functions
 */

import * as bambuGenerator from "./bambuslicer.js";
import * as prusaGenerator from "./prusaslicer.js";

export type GeneratorType = "ini" | "json";

export interface GeneratorInfo {
  type: GeneratorType;
  name: string;
  generateAllConfigs: (
    material: string,
    slicer: string,
    version: string,
    options?: any
  ) => Promise<any[]>;
  saveConfig: (config: any, outputDir: string, options?: any) => Promise<string>;
}

/**
 * Detect format from file path
 * This is more reliable than detecting from content
 */
export function detectFormatFromPath(filePath: string): GeneratorType | null {
  if (filePath.endsWith(".ini")) {
    return "ini";
  }
  if (filePath.endsWith(".json")) {
    return "json";
  }
  return null;
}

/**
 * Detect format from base config content (fallback method)
 */
export function detectFormat(baseConfig: any, filePath?: string): GeneratorType | null {
  // Prefer file extension if available
  if (filePath) {
    const format = detectFormatFromPath(filePath);
    if (format) {
      return format;
    }
  }

  if (!baseConfig || typeof baseConfig !== "object") {
    return null;
  }

  // Check if it's INI format (has vendor section or filament: sections)
  // INI format has top-level keys that are section names (like "vendor", "filament:*")
  if (
    !Array.isArray(baseConfig) &&
    Object.keys(baseConfig).some(
      (key) => key.includes("vendor") || key.includes("filament:")
    )
  ) {
    return "ini";
  }

  // Check if it's JSON format (object with array values, has compatible_printers, etc.)
  if (
    !Array.isArray(baseConfig) &&
    (baseConfig.compatible_printers ||
      baseConfig.filament_settings_id ||
      baseConfig.filament_type)
  ) {
    return "json";
  }

  // Default to JSON if it's a plain object
  if (!Array.isArray(baseConfig)) {
    return "json";
  }

  return null;
}

/**
 * Get generator for a format
 */
export function getGenerator(format: GeneratorType): GeneratorInfo | null {
  switch (format) {
    case "ini":
      return {
        type: "ini",
        name: "PrusaSlicer",
        generateAllConfigs: prusaGenerator.generateAllConfigs,
        saveConfig: prusaGenerator.saveConfig,
      };
    case "json":
      return {
        type: "json",
        name: "BambuSlicer",
        generateAllConfigs: bambuGenerator.generateAllConfigs,
        saveConfig: bambuGenerator.saveConfig,
      };
    default:
      return null;
  }
}

/**
 * Validate that a slicer can be processed
 */
export function validateSlicer(
  material: string,
  slicer: string,
  baseConfig: any,
  filePath?: string | null
): { valid: boolean; error?: string; format?: GeneratorType } {
  if (!baseConfig) {
    return {
      valid: false,
      error: `No base config found for ${material}/${slicer}`,
    };
  }

  const format = detectFormat(baseConfig, filePath || undefined);
  if (!format) {
    return {
      valid: false,
      error: `Unable to detect format for ${material}/${slicer}. Config must be either INI format (base.ini) or JSON format (base.json).`,
    };
  }

  const generator = getGenerator(format);
  if (!generator) {
    return {
      valid: false,
      error: `No generator available for format '${format}' in ${material}/${slicer}`,
    };
  }

  return { valid: true, format };
}
