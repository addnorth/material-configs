/**
 * Validates JSON/INI syntax and required fields
 * Provides clear error messages with file locations
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- validation of loose parsed configs */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ini from "ini";
import {
  getMachineRegistryPath,
  getSlicersConfigPath,
  findRegistryPrinter,
  listRegistryPrinters,
  loadSlicersConfig,
  type MachineRegistryData,
} from "./loaders.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/, so go up two levels to reach project root
const rootDir = path.resolve(__dirname, "../..");

/** Repo-relative POSIX path for error messages */
function rel(filePath: string): string {
  const r = path.relative(rootDir, path.resolve(filePath));
  return r.split(path.sep).join("/") || ".";
}

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
export async function validateJSON(filePath: string): Promise<ValidationResult | null> {
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
      error: `${rel(filePath)}: invalid JSON (${error.message})`,
    };
  }
}

/**
 * Validate INI file syntax
 */
export async function validateINI(filePath: string): Promise<ValidationResult | null> {
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
      error: `${rel(filePath)}: invalid INI (${error.message})`,
    };
  }
}

/**
 * Validate a generated Bambu Slicer config
 */
export function validateBambuConfig(
  config: Record<string, any>,
  context?: string
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pfx = context ? `${context}: ` : "";

  // Required fields
  if (!config.compatible_printers || !Array.isArray(config.compatible_printers)) {
    errors.push(
      `${pfx}missing or invalid field compatible_printers (expected non-empty array, got ${typeof config.compatible_printers})`
    );
  }

  if (!config.filament_settings_id || !Array.isArray(config.filament_settings_id)) {
    errors.push(
      `${pfx}missing or invalid field filament_settings_id (expected non-empty array, got ${typeof config.filament_settings_id})`
    );
  }

  if (!config.filament_type || !Array.isArray(config.filament_type)) {
    errors.push(
      `${pfx}missing or invalid field filament_type (expected non-empty array, got ${typeof config.filament_type})`
    );
  }

  // Check that compatible_printers has exactly one entry
  if (config.compatible_printers && config.compatible_printers.length !== 1) {
    warnings.push(
      `${pfx}compatible_printers should contain exactly one entry for per-printer exports; found ${config.compatible_printers.length} (${JSON.stringify(config.compatible_printers)})`
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
  config: Record<string, Record<string, any>>,
  context?: string
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pfx = context ? `${context}: ` : "";

  // Should have vendor section
  if (!config.vendor) {
    errors.push(`${pfx}missing [vendor] section (top-level keys present: ${Object.keys(config).slice(0, 12).join(", ")}${Object.keys(config).length > 12 ? ", …" : ""})`);
  } else {
    if (!config.vendor.name) {
      errors.push(`${pfx}missing vendor.name inside [vendor]`);
    }
    if (!config.vendor.config_version) {
      warnings.push(`${pfx}missing vendor.config_version inside [vendor]`);
    }
  }

  // Should have at least one filament section
  const hasFilamentSection = Object.keys(config).some((key) => key.startsWith("filament:"));
  if (!hasFilamentSection) {
    warnings.push(`${pfx}no [filament:*] sections found (filament profiles usually need at least one filament section)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

async function validateMaterialSlicerPrintersJson(
  material: string,
  materialDir: string,
  slicer: string,
  printersConfig: any,
  errors: string[]
): Promise<void> {
  if (!Array.isArray(printersConfig?.vendors)) {
    return;
  }

  const registry = printersConfig as MachineRegistryData;

  const printersPath = path.join(materialDir, slicer, "printers.json");
  const printersResult = await validateJSON(printersPath);
  if (printersResult && !printersResult.isValid && printersResult.error) {
    errors.push(printersResult.error);
    return;
  }

  let rows: Record<string, unknown>;
  try {
    const content = await fs.readFile(printersPath, "utf-8");
    rows = (JSON.parse(content) as { printers?: Record<string, unknown> }).printers ?? {};
  } catch {
    rows = {};
  }

  const registryPath = getMachineRegistryPath();
  const knownPrinterIds = [...new Set(listRegistryPrinters(registry).map((p) => p.id))].sort();

  for (const key of Object.keys(rows)) {
    const regP = findRegistryPrinter(registry, key);
    if (!regP) {
      errors.push(
        `${rel(printersPath)}: unknown printer id "${key}" under "printers" — no such printer in ${rel(registryPath)} (known ids: ${knownPrinterIds.join(", ")})`
      );
      continue;
    }
    if (!regP.slicers.includes(slicer)) {
      errors.push(
        `${rel(printersPath)}: printer "${key}" has overrides under materials/${material}/${slicer}/ but ${rel(registryPath)} lists only these slicers for that printer: ${regP.slicers.join(", ")}`
      );
    }
  }
}

/**
 * Validate `config/slicers.json`: syntax and required fields per slicer row.
 */
export async function validateSlicersConfig(): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const configPath = getSlicersConfigPath();
  const rp = rel(configPath);
  const jsonResult = await validateJSON(configPath);
  if (jsonResult && !jsonResult.isValid && jsonResult.error) {
    errors.push(jsonResult.error);
    return { isValid: false, errors, warnings };
  }
  if (!jsonResult) {
    errors.push(`${rp}: file missing or unreadable (expected slicer definitions JSON)`);
    return { isValid: false, errors, warnings };
  }

  let data: any;
  try {
    data = JSON.parse(await fs.readFile(configPath, "utf-8"));
  } catch (e: any) {
    errors.push(`${rp}: JSON parse failed — ${e.message}`);
    return { isValid: false, errors, warnings };
  }

  const list = data.slicers;
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(
      `${rp}: property "slicers" must be a non-empty array (got ${Array.isArray(list) ? `array of length ${list.length}` : typeof list})`
    );
    return { isValid: false, errors, warnings };
  }

  const slicerIdFirstIndex = new Map<string, number>();
  for (let i = 0; i < list.length; i++) {
    const s = list[i] as Record<string, unknown>;
    const row = `${rp} → slicers[${i}]`;
    const id = typeof s.id === "string" && s.id.trim() ? s.id : "";
    if (!id) {
      errors.push(`${row}: field "id" must be a non-empty string (got ${JSON.stringify(s.id)})`);
    } else {
      const prev = slicerIdFirstIndex.get(id);
      if (prev !== undefined) {
        errors.push(
          `${rp}: duplicate slicer id "${id}" — first at slicers[${prev}], repeated at slicers[${i}]`
        );
      } else {
        slicerIdFirstIndex.set(id, i);
      }
    }
    if (typeof s.label !== "string" || !s.label.trim()) {
      errors.push(`${row}: field "label" must be a non-empty string (got ${JSON.stringify(s.label)})`);
    }
    if (s.format !== "ini" && s.format !== "json") {
      errors.push(
        `${row}: field "format" must be "ini" or "json" (got ${JSON.stringify(s.format)})`
      );
    }
    if (typeof s.baseFilename !== "string" || !s.baseFilename.trim()) {
      errors.push(
        `${row}: field "baseFilename" must be a non-empty string (got ${JSON.stringify(s.baseFilename)})`
      );
    }
    if (typeof s.template !== "string" || !s.template.trim()) {
      errors.push(
        `${row}: field "template" must be a non-empty string (got ${JSON.stringify(s.template)})`
      );
    } else if (s.template.includes("..") || path.posix.normalize(s.template).startsWith("..")) {
      errors.push(`${row}: field "template" must not contain ".." (got ${JSON.stringify(s.template)})`);
    }
    if (s.format === "ini" && typeof s.baseFilename === "string") {
      if (!s.baseFilename.endsWith(".ini")) {
        warnings.push(`${row}: with format "ini", baseFilename normally ends with .ini (got ${JSON.stringify(s.baseFilename)})`);
      }
    }
    if (s.format === "json" && typeof s.baseFilename === "string") {
      if (!s.baseFilename.endsWith(".json")) {
        warnings.push(`${row}: with format "json", baseFilename normally ends with .json (got ${JSON.stringify(s.baseFilename)})`);
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
 * Validate config/printers.json (vendors with nested printers).
 * @param allowedSlicerIds When set (from a valid `slicers.json`), printer `slicers` entries must be listed there.
 */
export async function validateMachineRegistryConfig(
  allowedSlicerIds?: Set<string>
): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const configPath = getMachineRegistryPath();
  const rp = rel(configPath);
  const slicersRp = rel(getSlicersConfigPath());
  const allowedSorted =
    allowedSlicerIds && allowedSlicerIds.size > 0 ? [...allowedSlicerIds].sort().join(", ") : "";

  const jsonResult = await validateJSON(configPath);
  if (jsonResult && !jsonResult.isValid && jsonResult.error) {
    errors.push(jsonResult.error);
    return { isValid: false, errors, warnings };
  }
  if (!jsonResult) {
    errors.push(`${rp}: file missing or unreadable (expected machine registry JSON)`);
    return { isValid: false, errors, warnings };
  }

  let data: any;
  try {
    data = JSON.parse(await fs.readFile(configPath, "utf-8"));
  } catch (e: any) {
    errors.push(`${rp}: JSON parse failed — ${e.message}`);
    return { isValid: false, errors, warnings };
  }

  if (data.printers != null) {
    errors.push(
      `${rp}: remove top-level property "printers" — nest printer rows under each vendor's "printers" array`
    );
  }

  const vendors = data.vendors;
  if (!Array.isArray(vendors)) {
    errors.push(
      `${rp}: property "vendors" must be an array (got ${typeof vendors})`
    );
    return { isValid: false, errors, warnings };
  }

  const vendorFirstIndex = new Map<string, number>();
  const printerFirstLoc = new Map<string, string>();

  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i] as Record<string, unknown>;
    const vBase = `${rp} → vendors[${i}]`;
    const vid = typeof v.id === "string" ? v.id.trim() : "";
    if (!vid) {
      errors.push(`${vBase}: field "id" must be a non-empty string (got ${JSON.stringify(v.id)})`);
    } else {
      const fi = vendorFirstIndex.get(vid);
      if (fi !== undefined) {
        errors.push(
          `${rp}: duplicate vendor id "${vid}" — first at vendors[${fi}], repeated at vendors[${i}]`
        );
      } else {
        vendorFirstIndex.set(vid, i);
      }
    }
    if (typeof v.name !== "string" || !v.name.trim()) {
      errors.push(`${vBase}: field "name" must be a non-empty string (got ${JSON.stringify(v.name)})`);
    }
    if (typeof v.url !== "string" || !v.url.trim()) {
      errors.push(`${vBase}: field "url" must be a non-empty string (got ${JSON.stringify(v.url)})`);
    }

    const plist = v.printers;
    if (!Array.isArray(plist)) {
      errors.push(`${vBase}: field "printers" must be an array (got ${typeof plist})`);
      continue;
    }

    const vendorLabel = vid || `vendors[${i}]`;

    for (let j = 0; j < plist.length; j++) {
      const e = plist[j] as Record<string, unknown>;
      const loc = `${vBase} → printers[${j}]`;
      const id = typeof e.id === "string" && e.id.trim() ? e.id : "";
      const printerLabel = id || `${vendorLabel} printers[${j}]`;

      if (!id) {
        errors.push(`${loc}: field "id" must be a non-empty string (got ${JSON.stringify(e.id)})`);
      } else {
        const prevLoc = printerFirstLoc.get(id);
        if (prevLoc !== undefined) {
          errors.push(`${rp}: duplicate printer id "${id}" — first at ${prevLoc}, repeated at ${loc}`);
        } else {
          printerFirstLoc.set(id, loc);
        }
      }

      if (typeof e.name !== "string" || !e.name.trim()) {
        errors.push(
          `${loc} (printer id ${JSON.stringify(id || "(missing)")}): field "name" must be a non-empty string (got ${JSON.stringify(e.name)})`
        );
      }
      if (!Array.isArray(e.slicers) || e.slicers.length === 0) {
        errors.push(
          `${loc} (printer "${printerLabel}"): field "slicers" must be a non-empty array (got ${JSON.stringify(e.slicers)})`
        );
      } else {
        for (let si = 0; si < e.slicers.length; si++) {
          const sid = e.slicers[si];
          if (typeof sid !== "string" || !sid.trim()) {
            errors.push(
              `${loc} (printer "${printerLabel}") → slicers[${si}]: must be a non-empty string (got ${JSON.stringify(sid)})`
            );
          } else if (allowedSlicerIds && !allowedSlicerIds.has(sid)) {
            errors.push(
              `${loc} (printer "${printerLabel}") → slicers[${si}]: unknown slicer "${sid}" — not listed in ${slicersRp}${allowedSorted ? ` (allowed: ${allowedSorted})` : ""}`
            );
          }
        }
      }
      if (!Array.isArray(e.nozzles) || e.nozzles.length === 0) {
        errors.push(
          `${loc} (printer "${printerLabel}"): field "nozzles" must be a non-empty array (got ${JSON.stringify(e.nozzles)})`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/** @deprecated Use validateMachineRegistryConfig */
export const validatePrintersRegistryConfig = validateMachineRegistryConfig;

/**
 * Validate all override files for a material
 */
export async function validateMaterialOverrides(material: string): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const materialDir = path.join(rootDir, "materials", material);

  const { loadSlicersConfig, getSlicersForMaterial } = await import("./loaders.js");

  try {
    const { slicers: defs } = await loadSlicersConfig();
    const configuredIds = new Set(defs.map((d) => d.id));
    const entries = await fs.readdir(materialDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) {
        continue;
      }
      if (!configuredIds.has(e.name)) {
        const slicersCfgPath = rel(getSlicersConfigPath());
        warnings.push(
          `${rel(path.join(materialDir, e.name))}: directory name "${e.name}" is not a slicer id — configure slicers in ${slicersCfgPath} (allowed ids: ${[...configuredIds].sort().join(", ")})`
        );
      }
    }
  } catch {
    // Slicers config invalid or missing; skip unknown-dir check.
  }

  const slicers = await getSlicersForMaterial(material);

  let printersConfig: any = null;
  try {
    const printersConfigContent = await fs.readFile(getMachineRegistryPath(), "utf-8");
    printersConfig = JSON.parse(printersConfigContent);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      warnings.push(
        `${rel(getMachineRegistryPath())}: could not load machine registry (${error.code ?? "error"}) — ${error.message}`
      );
    }
  }

  for (const slicer of slicers) {
    const slicerDir = path.join(materialDir, slicer);

    if (printersConfig) {
      await validateMaterialSlicerPrintersJson(
        material,
        materialDir,
        slicer,
        printersConfig,
        errors
      );
    } else {
      const printersPath = path.join(slicerDir, "printers.json");
      const printersResult = await validateJSON(printersPath);
      if (printersResult && !printersResult.isValid && printersResult.error) {
        errors.push(printersResult.error);
      }
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

          if (printersConfig && result?.isValid) {
            const filenameWithoutExt = file.replace(/\.json$/, "");
            const matchWithMm = filenameWithoutExt.match(/^(.+)-(\d+\.\d+mm)$/);
            const matchWithoutMm = filenameWithoutExt.match(/^(.+)-(\d+\.\d+)$/);
            const match = matchWithMm || matchWithoutMm;

            if (match) {
              const printerId = match[1];
              let nozzle = match[2];
              if (!nozzle.endsWith("mm")) {
                nozzle = `${nozzle}mm`;
              }

              const regPrinter = findRegistryPrinter(
                printersConfig as MachineRegistryData,
                printerId
              );
              const registryPathMsg = rel(getMachineRegistryPath());

              if (!regPrinter) {
                errors.push(
                  `${rel(filePath)}: basename implies printer id "${printerId}", which is not defined in ${registryPathMsg}`
                );
              } else if (!regPrinter.slicers.includes(slicer)) {
                errors.push(
                  `${rel(filePath)}: printer "${printerId}" does not list slicer "${slicer}" in ${registryPathMsg} (this printer lists: ${regPrinter.slicers.join(", ")})`
                );
              } else if (!regPrinter.nozzles?.includes(nozzle)) {
                const allowed = regPrinter.nozzles?.length
                  ? regPrinter.nozzles.join(", ")
                  : "(no nozzles defined)";
                errors.push(
                  `${rel(filePath)}: nozzle "${nozzle}" is not valid for printer "${printerId}" in ${registryPathMsg} (allowed: ${allowed})`
                );
              }
            } else {
              warnings.push(
                `${rel(filePath)}: filename must match {printerId}-{nozzle}.json (e.g. X1-0.4mm.json or MK4-0.25mm.json); got "${file}"`
              );
            }
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

  // Dynamically discover slicers for this material
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
        `material "${material}", slicer "${slicer}": missing base profile — create ${rel(iniPath)} or ${rel(jsonPath)} for this slicer`
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
 * Every material must ship a folder + base file for each slicer id referenced by any printer
 * in `config/printers.json`. Otherwise the build skips that slicer silently for that material.
 */
export async function validateMaterialRegistrySlicerCoverage(): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let slicersData: Awaited<ReturnType<typeof loadSlicersConfig>>;
  try {
    slicersData = await loadSlicersConfig();
  } catch (e: any) {
    return {
      isValid: false,
      errors: [`${rel(getSlicersConfigPath())}: failed to load slicers config — ${String(e?.message ?? e)}`],
      warnings,
    };
  }

  let registry: MachineRegistryData;
  try {
    const raw = await fs.readFile(getMachineRegistryPath(), "utf-8");
    registry = JSON.parse(raw) as MachineRegistryData;
  } catch (e: any) {
    return {
      isValid: false,
      errors: [`${rel(getMachineRegistryPath())}: failed to read or parse registry — ${String(e?.message ?? e)}`],
      warnings,
    };
  }

  const printersBySlicer = new Map<string, Set<string>>();
  for (const p of listRegistryPrinters(registry)) {
    for (const sid of p.slicers ?? []) {
      let ids = printersBySlicer.get(sid);
      if (!ids) {
        ids = new Set<string>();
        printersBySlicer.set(sid, ids);
      }
      ids.add(p.id);
    }
  }

  const registryPrinterRefs = (slicerId: string): string => {
    const ids = [...(printersBySlicer.get(slicerId) ?? [])].sort();
    return ids.length ? ids.join(", ") : "(unknown)";
  };

  const defById = new Map(slicersData.slicers.map((s) => [s.id, s]));

  const { getAllMaterials } = await import("./loaders.js");
  const materials = await getAllMaterials();

  const requiredSlicerIds = [...printersBySlicer.keys()].sort();

  for (const material of materials) {
    for (const sid of requiredSlicerIds) {
      const def = defById.get(sid);
      if (!def) {
        continue;
      }

      const slicerDir = path.join(rootDir, "materials", material, sid);
      const basePath = path.join(slicerDir, def.baseFilename);
      const printerRefs = registryPrinterRefs(sid);
      const regPath = rel(getMachineRegistryPath());

      try {
        const st = await fs.stat(slicerDir);
        if (!st.isDirectory()) {
          errors.push(
            `${rel(slicerDir)} exists but is not a directory — ${regPath} expects a slicer folder "${sid}" for printer(s): ${printerRefs}`
          );
          continue;
        }
      } catch {
        errors.push(
          `material "${material}" is missing ${rel(slicerDir)}/ — ${regPath} lists slicer "${sid}" for printer(s): ${printerRefs}`
        );
        continue;
      }

      try {
        await fs.stat(basePath);
      } catch {
        errors.push(
          `material "${material}" is missing ${rel(basePath)} — add ${def.baseFilename} under ${rel(slicerDir)}/ (required because ${regPath} lists slicer "${sid}" for printer(s): ${printerRefs})`
        );
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
 * Validate all materials
 */
export async function validateAll(): Promise<ConfigValidationResult> {
  const { getAllMaterials } = await import("./loaders.js");
  const materials = await getAllMaterials();

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  const slicersResult = await validateSlicersConfig();
  allErrors.push(...slicersResult.errors);
  allWarnings.push(...slicersResult.warnings);

  let allowedSlicerIds: Set<string> | undefined;
  if (slicersResult.isValid) {
    try {
      const raw = JSON.parse(await fs.readFile(getSlicersConfigPath(), "utf-8"));
      allowedSlicerIds = new Set((raw.slicers as { id: string }[]).map((s) => s.id));
    } catch {
      allowedSlicerIds = undefined;
    }
  }

  const registryResult = await validateMachineRegistryConfig(allowedSlicerIds);
  allErrors.push(...registryResult.errors);
  allWarnings.push(...registryResult.warnings);

  const coverageResult = await validateMaterialRegistrySlicerCoverage();
  allErrors.push(...coverageResult.errors);
  allWarnings.push(...coverageResult.warnings);

  for (const material of materials) {
    const baseResult = await validateMaterialBaseConfigs(material);
    const overrideResult = await validateMaterialOverrides(material);

    allErrors.push(...baseResult.errors.map((e) => `[${material}] ${e}`));
    allErrors.push(...overrideResult.errors.map((e) => `[${material}] ${e}`));
    allWarnings.push(...baseResult.warnings.map((w) => `[${material}] ${w}`));
    allWarnings.push(...overrideResult.warnings.map((w) => `[${material}] ${w}`));
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
