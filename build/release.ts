/**
 * Release asset generator
 * Packages configs, creates zip archives per printer model, creates manifest.json
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
import { createWriteStream } from "fs";
import { execSync } from "child_process";
import {
  getAllMaterials,
  getSlicersForMaterial,
  loadBaseConfig,
} from "./loaders.js";
import {
  detectFormat,
  getGenerator,
  validateSlicer,
} from "./generators/registry.js";
import {
  generateChangelog,
  updateChangelogFile,
  getVersion,
} from "./changelog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/, so go up two levels to reach project root
const rootDir = path.resolve(__dirname, "../..");

export interface ReleaseOptions {
  version?: string;
  outputDir?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ManifestEntry {
  slicer: string;
  material: string;
  printer?: string;
  nozzle?: string;
  filename: string;
  url: string;
}

export interface Manifest {
  version: string;
  generated: string;
  configs: ManifestEntry[];
}

/**
 * Get all unique printers from configs
 */
function extractPrintersFromConfigs(
  configs: Array<{ printer: string }>
): Set<string> {
  const printers = new Set<string>();
  for (const config of configs) {
    printers.add(config.printer);
  }
  return printers;
}

/**
 * Clear output directories before building
 */
async function clearOutputDirs(outputBase: string, dryRun: boolean) {
  // Dynamically discover all slicers
  const { getAllSlicers } = await import("./loaders.js");
  const slicers = await getAllSlicers();
  const outputDirs = [
    ...slicers.map((slicer) => path.join(outputBase, slicer)),
    path.join(outputBase, "zips"),
    path.join(outputBase, "releases"),
  ];

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

/**
 * Create zip archive for a printer
 */
async function createPrinterZip(
  printer: string,
  configs: ManifestEntry[],
  version: string,
  outputDir: string,
  options: ReleaseOptions = {}
): Promise<string> {
  const { dryRun = false, verbose = false } = options;
  const zipFilename = `addnorth_${printer.replace(/\s+/g, "-")}_${version}.zip`;
  const zipPath = path.join(outputDir, "zips", zipFilename);

  if (dryRun) {
    if (verbose) {
      console.log(`[DRY RUN] Would create zip: ${zipPath}`);
      console.log(`  Would include ${configs.length} config files`);
    }
    return zipPath;
  }

  await fs.mkdir(path.dirname(zipPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      if (verbose) {
        console.log(`Created zip: ${zipPath} (${archive.pointer()} bytes)`);
      }
      resolve(zipPath);
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all config files for this printer
    // Reconstruct path from filename and slicer
    for (const config of configs) {
      const filePath = path.join(outputDir, config.slicer, config.filename);
      archive.file(filePath, { name: config.filename });
    }

    archive.finalize();
  });
}

/**
 * Generate all configs for all materials
 */
async function generateAllConfigs(
  version: string,
  options: ReleaseOptions = {}
): Promise<ManifestEntry[]> {
  const { verbose = false } = options;
  const materials = await getAllMaterials();
  const manifestEntries: ManifestEntry[] = [];

  for (const material of materials) {
    if (verbose) {
      console.log(`Generating configs for material: ${material}`);
    }

    // Generate configs for each slicer
    const slicers = await getSlicersForMaterial(material);
    const materialConfigCount = new Map<string, number>();

    for (const slicer of slicers) {
      const { config: baseConfig, filePath } = await loadBaseConfig(
        material,
        slicer
      );

      // Validate slicer and detect format
      const validation = validateSlicer(material, slicer, baseConfig, filePath);
      if (!validation.valid) {
        if (verbose) {
          console.warn(`⚠️  ${validation.error}`);
        }
        if (!options.dryRun) {
          throw new Error(
            validation.error || `Invalid slicer: ${material}/${slicer}`
          );
        }
        continue;
      }

      const format = validation.format!;
      const generator = getGenerator(format);
      if (!generator) {
        const error = `No generator available for format '${format}' in ${material}/${slicer}`;
        if (verbose) {
          console.error(`❌ ${error}`);
        }
        if (!options.dryRun) {
          throw new Error(error);
        }
        continue;
      }

      try {
        const configs = await generator.generateAllConfigs(
          material,
          slicer,
          version,
          options
        );

        // Validate that at least one config was generated
        if (configs.length === 0) {
          const error = `No configs generated for ${material}/${slicer}. This slicer must produce at least one configuration.`;
          if (verbose) {
            console.error(`❌ ${error}`);
          }
          if (!options.dryRun) {
            throw new Error(error);
          }
          continue;
        }

        for (const config of configs) {
          const outputPath = path.join(
            rootDir,
            "output",
            slicer,
            config.filename
          );
          await generator.saveConfig(config, path.dirname(outputPath), options);
          manifestEntries.push({
            slicer: slicer,
            material,
            printer: config.printer,
            nozzle: config.nozzle,
            filename: config.filename,
            url: "", // Will be set in createManifest
          });
        }

        materialConfigCount.set(slicer, configs.length);
      } catch (error: any) {
        const errorMsg = `Failed to generate ${slicer} configs for ${material}: ${error.message}`;
        if (verbose) {
          console.error(`❌ ${errorMsg}`);
        }
        if (!options.dryRun) {
          throw new Error(errorMsg);
        }
      }
    }

    // Validate that at least one slicer produced configs for this material
    if (materialConfigCount.size === 0) {
      const error = `No configs were generated for material: ${material}. At least one slicer must produce configurations.`;
      if (verbose) {
        console.error(`❌ ${error}`);
      }
      if (!options.dryRun) {
        throw new Error(error);
      }
    }
  }

  return manifestEntries;
}

/**
 * Get GitHub repository info for generating release URLs
 */
function getGitHubRepoInfo(): { owner: string; repo: string } | null {
  // Try to get from environment variable (GitHub Actions)
  const repoEnv = process.env.GITHUB_REPOSITORY;
  if (repoEnv) {
    const [owner, repo] = repoEnv.split("/");
    if (owner && repo) {
      return { owner, repo };
    }
  }

  // Try to get from git remote
  try {
    const remoteUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf-8",
      cwd: rootDir,
    }).trim();

    // Parse git remote URL (handles both https and ssh formats)
    const match = remoteUrl.match(/(?:github\.com[/:]|git@github\.com:)([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  } catch (error) {
    // Git command failed, ignore
  }

  return null;
}

/**
 * Generate GitHub release URL for a file
 */
function generateReleaseUrl(filename: string, version: string): string {
  const repoInfo = getGitHubRepoInfo();
  if (repoInfo) {
    return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/releases/download/v${version}/${filename}`;
  }
  // Fallback: return a placeholder URL if we can't determine the repo
  return `https://github.com/OWNER/REPO/releases/download/v${version}/${filename}`;
}

/**
 * Create manifest.json
 */
async function createManifest(
  version: string,
  configs: ManifestEntry[],
  outputDir: string,
  options: ReleaseOptions = {}
): Promise<string> {
  const { dryRun = false } = options;

  // Update configs to use URLs instead of empty strings
  const configsWithUrls = configs.map((config) => ({
    ...config,
    url: generateReleaseUrl(config.filename, version),
  }));

  const manifest: Manifest = {
    version,
    generated: new Date().toISOString(),
    configs: configsWithUrls,
  };

  const manifestPath = path.join(
    outputDir,
    "releases",
    `manifest-${version}.json`
  );

  if (dryRun) {
    console.log(`[DRY RUN] Would create manifest: ${manifestPath}`);
    return manifestPath;
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  return manifestPath;
}

/**
 * Build release
 */
export async function buildRelease(options: ReleaseOptions = {}): Promise<{
  version: string;
  manifest: string;
  zips: string[];
  changelog: string;
}> {
  const version = options.version || (await getVersion());
  const outputDir = options.outputDir || path.join(rootDir, "output");
  const { verbose = false, dryRun = false } = options;

  // Clear output directories before building
  if (verbose) {
    console.log("Clearing output directories...");
  }
  await clearOutputDirs(outputDir, dryRun);

  if (verbose) {
    console.log(`Building release version: ${version}`);
  }

  // Generate all configs
  const configs = await generateAllConfigs(version, options);

  if (verbose) {
    console.log(`Generated ${configs.length} config files`);
  }

  // Create manifest
  const manifestPath = await createManifest(
    version,
    configs,
    outputDir,
    options
  );

  // Get all printers from config/printers.json
  const printersConfigPath = path.join(rootDir, "config", "printers.json");
  const printersConfig = JSON.parse(
    await fs.readFile(printersConfigPath, "utf-8")
  );

  // Group configs by slicer type
  const jsonConfigs = configs.filter((c) => c.printer); // Bambu Slicer configs (have printer field)
  const iniConfigs = configs.filter((c) => !c.printer); // PrusaSlicer configs (no printer field)

  // Get all printers that should have zip files
  // 1. Printers with Bambu Slicer configs
  const printersFromConfigs = extractPrintersFromConfigs(
    jsonConfigs.map((c) => ({
      printer: c.printer || "",
    }))
  );

  // 2. Printers that support PrusaSlicer (from printers.json)
  const prusaPrinters = new Set<string>();
  for (const [printerKey, printerData] of Object.entries(
    printersConfig.printers
  )) {
    const printer = printerData as { slicers: string[]; nozzles: string[] };
    if (printer.slicers.includes("prusaslicer")) {
      prusaPrinters.add(printerKey);
    }
  }

  // Combine all printers
  const allPrinters = new Set([...printersFromConfigs, ...prusaPrinters]);

  // Create zip files per printer
  const zipPaths: string[] = [];
  for (const printer of allPrinters) {
    // Get Bambu Slicer configs for this printer
    const printerConfigs = jsonConfigs.filter(
      (c: ManifestEntry) => c.printer === printer
    );

    // Get PrusaSlicer configs if this printer supports PrusaSlicer
    const prusaConfigsForPrinter = prusaPrinters.has(printer)
      ? iniConfigs.filter((c: ManifestEntry) => c.slicer === "prusaslicer")
      : [];

    // Combine all configs for this printer
    const allPrinterConfigs = [...printerConfigs, ...prusaConfigsForPrinter];

    // Only create zip if there are configs for this printer
    if (allPrinterConfigs.length > 0) {
      const zipPath = await createPrinterZip(
        printer,
        allPrinterConfigs,
        version,
        outputDir,
        options
      );
      zipPaths.push(zipPath);
    }
  }

  // Generate changelog
  const changelog = await generateChangelog({ version });

  // Update CHANGELOG.md
  if (!dryRun) {
    await updateChangelogFile(version, changelog);
  }

  return {
    version,
    manifest: manifestPath,
    zips: zipPaths,
    changelog,
  };
}
