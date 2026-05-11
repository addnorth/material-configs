# Directory structure

This document explains how folders and files are organized in **material-configs**.

**New here?** Read **[Start here](start-here.md)** for basic words (folder, JSON, terminal). This page goes deeper into **this repo only**.

## Words used in this repo

| Term           | Meaning here                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| **Material**   | One filament type (or family), e.g. PLA. Each has a folder under `materials/`.                           |
| **Slicer**     | The program that turns a 3D model into g-code (**PrusaSlicer** or **Bambu Studio** / Bambu Slicer JSON). |
| **Base file**  | The main profile for that material + slicer (`base.ini` or `base.json`).                                 |
| **Override**   | Extra JSON that adjusts the base for a nozzle, printer, or printer+nozzle combo.                         |
| **Printer ID** | Short code in `config/printers.json` (nested under a vendor), e.g. `MK4`, `X1`, `A1mini`.                |
| **JSON**       | Text format with `{` `}` and `"quoted"` names.                                                           |
| **INI**        | Text format with `[sections]` and `key = value` lines.                                                   |
| **Build**      | Running `npm run build` to create files under `output/`.                                                 |

## Overview

```
material-configs/
├── materials/              # Material base configs (slicer-native formats)
├── build/                  # Build scripts and logic (TypeScript)
├── config/                 # printers.json (registry), slicers.json (slicer ids + templates)
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
    │       └── MK4-0.4mm.json   # printer id from config/printers.json
    └── bambuslicer/             # Bambu Slicer-specific configs
        ├── base.json            # Base Bambu Slicer config
        ├── nozzles.json
        ├── printers.json
        └── combinations/
            └── X1-0.4mm.json
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

- **printers.json** (under each material/slicer): Optional **overrides** keyed by printer id. Keys must match a printer `id` under some vendor in **`config/printers.json`**. Only list printers you override.

  ```json
  {
    "printers": {
      "MK4": { "travel_speed": 200 }
    }
  }
  ```

- **combinations/**: Most specific overrides for printer+nozzle combinations (`{printerId}-{nozzle}.json`)

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

- **`config/printers.json`** — **Machine registry**: `vendors` array; each vendor has `id`, `name`, `url`, and **`printers`**: `{ id, name, slicers, nozzles }`. Each printer's **`slicers`** array lists **slicer ids** defined in **`config/slicers.json`**. Bambu Studio `compatible_printers` strings use each printer’s `name`. (Different file from `materials/.../printers.json` overrides.)

- **`config/slicers.json`** — **Slicer list**: `slicers[]` with `id` (folder name under `materials/<material>/` and `output/`), `label`, `format` (`ini` | `json`), `baseFilename` (e.g. `base.ini`), and `template` (path under the repo root for `npm run add-material`).

## Output Directory

Generated files (not committed to git):

- `prusaslicer/` - Generated PrusaSlicer configs
- `bambuslicer/` - Generated Bambu Slicer configs
- `zips/` - Printer-specific zip archives
- `releases/` - Release artifacts (manifest.json)

## File Naming Conventions

### Generated Files

- **PrusaSlicer**: `addnorth_{material}_{version}.ini`
- **Bambu Slicer**: `addnorth_{material}_{printerId}_{nozzle}mm_{version}.json` (`printerId` from `config/printers.json`, e.g. `X1`)
- **Zip files**: `addnorth_{printerId}_{version}.zip`

### Example (names include version)

- PrusaSlicer: `addnorth_pla_v1.0.0.ini` (example)
- Bambu Slicer: `addnorth_pla_X1_0.4mm_v1.0.0.json` (printer ID `X1`, nozzle `0.4mm`)
- Zip (release): `addnorth_X1_1.0.0.zip` (example; exact name depends on version)

## Parameter Inheritance

Configs are built by merging in this order:

1. Base material config
2. Printer overrides
3. Nozzle overrides (material-specific)
4. Combination overrides (most specific)

Later overrides take precedence over earlier ones.
