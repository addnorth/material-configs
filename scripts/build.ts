#!/usr/bin/env node
/**
 * CLI entry point for building material configurations
 */

import { buildRelease } from "../build/release.js";
import { validateAll } from "../build/validate.js";
import {
  getAllMaterials,
  getSlicersForMaterial,
  getAllSlicers,
  loadBaseConfig,
} from "../build/loaders.js";
import {
  detectFormat,
  getGenerator,
  validateSlicer,
  type GeneratorInfo,
} from "../build/generators/registry.js";
import { getVersion } from "../build/changelog.js";
import fs from "fs/promises";
import path from "path";

interface BuildOptions {
  slicer?: string;
  material?: string;
  printer?: string;
  nozzle?: string;
  output?: string;
  release?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  validateOnly?: boolean;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--slicer":
        options.slicer = args[++i];
        break;
      case "--material":
        options.material = args[++i];
        break;
      case "--printer":
        options.printer = args[++i];
        break;
      case "--nozzle":
        options.nozzle = args[++i];
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--release":
        options.release = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--validate-only":
        options.validateOnly = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: npm run build [options]

Options:
  --slicer <slicer>        Filter by slicer (prusaslicer, bambuslicer)
  --material <material>     Filter by material name
  --printer <printer>       Filter by printer name
  --nozzle <nozzle>         Filter by nozzle size
  --output <dir>            Output directory (default: output/)
  --release                 Build full release with zips and manifest
  --verbose, -v             Verbose output
  --dry-run                 Show what would be generated without creating files
  --validate-only           Only validate configs without generating
  --help, -h                Show this help message

Examples:
  npm run build                              # Build all configs
  npm run build -- --material pla            # Build only PLA configs
  npm run build -- --slicer bambuslicer      # Build only Bambu Slicer configs
  npm run build -- --release                 # Build full release
  npm run build -- --validate-only           # Validate all configs
`);
}

async function validate() {
  console.log("Validating all configs...");
  const result = await validateAll();

  if (result.errors.length > 0) {
    console.error("Validation errors:");
    for (const error of result.errors) {
      console.error(`  ❌ ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn("Validation warnings:");
    for (const warning of result.warnings) {
      console.warn(`  ⚠️  ${warning}`);
    }
  }

  if (result.isValid) {
    console.log("✅ All validations passed!");
    return true;
  } else {
    console.error("❌ Validation failed!");
    return false;
  }
}

/**
 * Clear output directories before building
 */
async function clearOutputDirs(outputBase: string, dryRun: boolean) {
  // Dynamically discover all slicers
  const slicers = await getAllSlicers();
  const outputDirs = slicers.map((slicer) => path.join(outputBase, slicer));

  for (const dir of outputDirs) {
    try {
      if (dryRun) {
        console.log(`[DRY RUN] Would clear: ${dir}`);
      } else {
        // Remove directory and recreate it
        await fs.rm(dir, { recursive: true, force: true });
        await fs.mkdir(dir, { recursive: true });
      }
    } catch (error: any) {
      // Directory might not exist, that's okay
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

async function build(options: BuildOptions) {
  const version = await getVersion();

  if (options.validateOnly) {
    const isValid = await validate();
    process.exit(isValid ? 0 : 1);
    return;
  }

  // Validate first
  if (!options.dryRun) {
    const isValid = await validate();
    if (!isValid) {
      console.error("Validation failed. Aborting build.");
      process.exit(1);
    }
  }

  // Clear output directories before building
  const outputBase = options.output || "output";
  if (options.verbose) {
    console.log("Clearing output directories...");
  }
  await clearOutputDirs(outputBase, options.dryRun || false);

  if (options.release) {
    // Build full release
    console.log("Building release...");
    const result = await buildRelease({
      version,
      outputDir: options.output,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });

    console.log(`\n✅ Release built successfully!`);
    console.log(`   Version: ${result.version}`);
    console.log(`   Manifest: ${result.manifest}`);
    console.log(`   Zip files: ${result.zips.length}`);
    if (options.verbose) {
      for (const zip of result.zips) {
        console.log(`     - ${zip}`);
      }
    }
  } else {
    // Build specific configs
    const materials = options.material
      ? [options.material]
      : await getAllMaterials();

    for (const material of materials) {
      if (options.verbose) {
        console.log(`Building configs for: ${material}`);
      }

      // Dynamically discover slicers for this material
      const slicers = await getSlicersForMaterial(material);

      const slicerResults: Map<string, number> = new Map();

      for (const slicer of slicers) {
        // Filter by slicer if specified
        if (options.slicer && options.slicer !== slicer) {
          continue;
        }

        // Check if base config exists
        const { config: baseConfig, filePath } = await loadBaseConfig(
          material,
          slicer
        );

        // Validate slicer and detect format
        const validation = validateSlicer(
          material,
          slicer,
          baseConfig,
          filePath
        );
        if (!validation.valid) {
          console.error(`❌ ${validation.error}`);
          if (!options.dryRun) {
            throw new Error(validation.error);
          }
          continue;
        }

        const format = validation.format!;
        const generator = getGenerator(format);
        if (!generator) {
          const error = `No generator available for format '${format}' in ${material}/${slicer}`;
          console.error(`❌ ${error}`);
          if (!options.dryRun) {
            throw new Error(error);
          }
          continue;
        }

        try {
          // Generate configs using the appropriate generator
          const configs = await generator.generateAllConfigs(
            material,
            slicer,
            version,
            {
              verbose: options.verbose,
              dryRun: options.dryRun,
              printer: options.printer,
              nozzle: options.nozzle,
            }
          );

          // Filter configs if printer/nozzle specified (for JSON generators)
          const filteredConfigs = configs.filter((config: any) => {
            if (options.printer && config.printer !== options.printer) {
              return false;
            }
            if (options.nozzle && config.nozzle !== options.nozzle) {
              return false;
            }
            return true;
          });

          // Validate that at least one config was generated
          if (filteredConfigs.length === 0) {
            const error = `No configs generated for ${material}/${slicer}. This slicer must produce at least one configuration.`;
            console.error(`❌ ${error}`);
            if (!options.dryRun) {
              throw new Error(error);
            }
            continue;
          }

          // Save configs
          let savedCount = 0;
          for (const config of filteredConfigs) {
            const outputDir = options.output
              ? `${options.output}/${slicer}`
              : `output/${slicer}`;
            await generator.saveConfig(config, outputDir, {
              dryRun: options.dryRun,
            });
            savedCount++;
          }

          slicerResults.set(slicer, savedCount);

          if (options.verbose) {
            console.log(
              `✅ Generated ${savedCount} config(s) for ${material}/${slicer} (${generator.name} format)`
            );
          }
        } catch (error: any) {
          const errorMsg = `Failed to build ${slicer} configs for ${material}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          if (!options.dryRun) {
            throw new Error(errorMsg);
          }
        }
      }

      // Validate that at least one slicer produced configs
      if (slicerResults.size === 0) {
        const error = `No configs were generated for material: ${material}. At least one slicer must produce configurations.`;
        console.error(`❌ ${error}`);
        if (!options.dryRun) {
          throw new Error(error);
        }
      }
    }

    console.log("✅ Build complete!");
  }
}

async function main() {
  const options = parseArgs();
  try {
    await build(options);
  } catch (error: any) {
    console.error("Error:", error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
