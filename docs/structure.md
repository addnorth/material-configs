# Directory Structure

This document explains the organization of the material configuration repository.

## Overview

```
material-configs/
├── materials/              # Material base configs (slicer-native formats)
├── build/                  # Build scripts and logic (TypeScript)
├── config/                 # Build configuration and metadata
├── output/                 # Generated configs (gitignored)
├── scripts/                # Utility scripts
├── docs/                   # Documentation
├── templates/              # Template files for new materials
└── .github/workflows/      # GitHub Actions workflows
```

## Materials Directory

Each material has its own folder with base configs and overrides:

```
materials/
└── pla/
    ├── prusaslicer/             # PrusaSlicer-specific configs
    │   ├── base.ini             # Base PrusaSlicer config
    │   ├── nozzles.json         # Nozzle-specific overrides
    │   ├── printers.json        # Printer-specific overrides
    │   └── combinations/        # Specific combinations (optional)
    │       └── prusa-mk4-0.4mm.json
    └── bambuslicer/             # Bambu Slicer-specific configs
        ├── base.json            # Base Bambu Slicer config
        ├── nozzles.json
        ├── printers.json
        └── combinations/
            └── x1-0.4mm.json
```

### Base Configs

- **PrusaSlicer**: `prusaslicer/base.ini` - INI format with sections
- **Bambu Slicer**: `bambuslicer/base.json` - JSON format

### Override Files

Override files use JSON format and are organized by slicer:

- **nozzles.json**: Contains all nozzle sizes in one file

  ```json
  {
    "0.4mm": { "perimeter_speed": 50 },
    "0.6mm": { "perimeter_speed": 40 }
  }
  ```

- **printers.json**: Printer-specific overrides

  ```json
  {
    "Prusa MK4": { "travel_speed": 200 }
  }
  ```

- **combinations/**: Most specific overrides for printer+nozzle combinations

## Build Directory

TypeScript source files for the build system:

- `generators/` - Format-specific generators
- `loaders.ts` - Config loading logic
- `merge.ts` - Parameter merging
- `validate.ts` - Validation logic
- `changelog.ts` - Changelog generation
- `release.ts` - Release building

## Config Directory

Configuration and metadata files:

- `printers.json` - Supported printers list (used to generate compatible_printers for Bambu Slicer configs)

## Output Directory

Generated files (not committed to git):

- `prusaslicer/` - Generated PrusaSlicer configs
- `bambuslicer/` - Generated Bambu Slicer configs
- `zips/` - Printer-specific zip archives
- `releases/` - Release artifacts (manifest.json)

## File Naming Conventions

### Generated Files

- **PrusaSlicer**: `addnorth_{material}_{version}.ini`
- **Bambu Slicer**: `addnorth_{material}_{printer}_{version}.json`
- **Zip files**: `addnorth_{printer}_{version}.zip`

### Example

- `addnorth_pla_1.0.0.ini` (PrusaSlicer)
- `addnorth_pla_Bambu-Lab-X1_1.0.0.json` (Bambu Slicer)
- `addnorth_Bambu-Lab-X1_1.0.0.zip` (Zip archive)

## Parameter Inheritance

Configs are built by merging in this order:

1. Base material config
2. Printer overrides
3. Nozzle overrides (material-specific)
4. Combination overrides (most specific)

Later overrides take precedence over earlier ones.
