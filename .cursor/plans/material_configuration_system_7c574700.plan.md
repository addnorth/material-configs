---
name: Material Configuration System
overview: Create a maintainable repository structure for generating slicer configurations that works with native slicer formats (PrusaSlicer INI, Bambu Slicer JSON), supporting variations by material, printer, nozzle, and other parameters, with automated build and release processes.
todos:
  - id: setup-project
    content: Initialize Node.js project with package.json, dependencies (ini parser, JSON processing, file operations), .gitignore, and basic directory structure
    status: pending
  - id: create-directory-structure
    content: Create all directory folders (materials/ organized by material with slicer-specific override subdirs, build/, output/, scripts/, .github/workflows/)
    status: pending
  - id: implement-prusaslicer-generator
    content: Build build/generators/prusaslicer.js to generate INI configs with section inheritance and wildcard patterns
    status: pending
  - id: implement-bambuslicer-generator
    content: Build build/generators/bambuslicer.js to generate JSON configs with compatible_printers arrays
    status: pending
  - id: implement-base-config-loader
    content: Create build/loaders.js to load base material configs and slicer-specific override files
    status: pending
  - id: implement-release-builder
    content: Build build/release.js to package configs, create zip archives per printer model, create manifest.json, and generate tagged filenames for releases
    status: pending
  - id: create-cli-script
    content: Create scripts/build.js CLI entry point with options for filtering and building configs
    status: pending
  - id: setup-github-actions
    content: Create .github/workflows/release.yml and validate.yml for automated releases and PR validation
    status: pending
  - id: create-example-configs
    content: Add example material base configs, slicer-specific override files, template files, and config/metadata files (printers.json, nozzles.json, build.json)
    status: pending
  - id: update-readme
    content: Create README.md with overview and links to docs/, CHANGELOG.md, and add documentation files in docs/ directory (setup guide for material experts, structure, contributing, etc.)
    status: pending
  - id: implement-validator
    content: Build build/validate.js to validate JSON/INI syntax and required fields with clear error messages
  - id: implement-changelog-generator
    content: Build build/changelog.js to generate changelog from git commits and update CHANGELOG.md
    status: pending
---

# Material Configuration System Architecture

## Directory Structure

```
material-configuration/
├── materials/              # Material base configs (slicer-native formats)
│   ├── pla/
│   │   ├── prusaslicer.ini # Base PrusaSlicer config for PLA (with wildcards/patterns)
│   │   ├── prusaslicer/    # PrusaSlicer-specific overrides
│   │   │   ├── nozzles.json # Nozzle-specific overrides (all sizes in one file)
│   │   │   ├── printers.json # Printer-specific overrides
│   │   │   └── combinations/ # Slicer+Printer+Material specific (optional)
│   │   │       └── prusa-mk4-0.4mm.json
│   │   ├── bambuslicer.json # Base Bambu Slicer config for PLA
│   │   └── bambuslicer/    # Bambu Slicer-specific overrides
│   │       ├── nozzles.json # Nozzle-specific overrides (all sizes in one file)
│   │       ├── printers.json # Printer-specific overrides
│   │       └── combinations/ # Slicer+Printer+Material specific (optional)
│   │           └── x1-0.4mm.json
│   ├── petg/
│   └── ...
├── build/                  # Build scripts and logic
│   ├── generators/         # Format-specific generators
│   │   ├── prusaslicer.js  # Generates PrusaSlicer INI files
│   │   └── bambuslicer.js  # Generates Bambu Slicer JSON files
│   ├── loaders.js          # Loads base configs and applies overrides
│   ├── merge.js            # Parameter merging logic (format-aware)
│   ├── validate.js          # Validates JSON/INI syntax and required fields
│   ├── changelog.js         # Generates changelog from git commits
│   └── release.js           # Release asset generator
├── config/                 # Build configuration and metadata
│   ├── printers.json       # Supported printers list and metadata
│   ├── nozzles.json        # Supported nozzle sizes
│   └── build.json          # Build settings (version source, etc.)
├── output/                 # Generated configs (gitignored)
│   ├── prusaslicer/        # PrusaSlicer configs
│   ├── bambuslicer/        # Bambu Slicer configs
│   ├── zips/               # Printer-specific zip archives
│   │   ├── addnorth_prusa-mk4_v1.0.0.zip
│   │   └── ...
│   └── releases/            # Release artifacts
├── scripts/                # Utility scripts
│   └── build.js            # CLI entry point
├── docs/                   # Documentation
│   ├── setup.md            # Setup guide for material experts (non-developers)
│   ├── structure.md        # Directory structure and organization
│   ├── contributing.md     # Contribution guidelines
│   └── ...
├── templates/              # Template files for new materials
│   ├── prusaslicer.ini.template
│   └── bambuslicer.json.template
├── .github/
│   └── workflows/
│       ├── release.yml     # Automated release workflow
│       └── validate.yml   # PR validation workflow
├── .gitignore              # Ignore output/ and node_modules/
├── package.json
├── CHANGELOG.md            # Version changelog
└── README.md
```

## Key Design Principles

### 1. Slicer-Native Format Support

**PrusaSlicer (INI format):**

- Base configs use INI format with sections like `[filament:*PLA*]`, `[print:*MK4*]`
- Uses wildcard patterns and inheritance (`inherits = *common*`)
- Generator applies overrides by modifying/adding INI sections
- Output: Single INI file or material-specific INI files

**Bambu Slicer (JSON format):**

- Base configs use JSON format (like the example file)
- `compatible_printers` array lists all supported printers
- Generator creates separate files per printer (even if settings are identical)
- Each output file has `compatible_printers` array with single printer entry
- Output: JSON files with naming like `addnorth_{material}_{printer}_{version}.json` (one file per printer)

### 2. Parameter Inheritance & Overrides

Configs are built by (all slicer-specific):

1. **Load base material config** → `materials/{material}/{slicer}.{ext}` (INI or JSON)
2. **Apply printer overrides** → `materials/{material}/{slicer}/printers.json` (if exists)
3. **Apply nozzle overrides** (in order of specificity):

   - Combination → `materials/{material}/{slicer}/combinations/{printer}-{nozzle}.json` (most specific, optional)
   - Material → `materials/{material}/{slicer}/nozzles.json` (material-specific for all printers)

4. **Generate final config** → Format-specific generator applies all overrides

### 3. Build System

- **Format-aware generators**: Each slicer has its own generator that understands the format
- **Version Management**: Version read from git tag (for releases) or `package.json` (for local builds)
- **Naming Convention**:
  - PrusaSlicer: `addnorth_{material}_{version}.ini` or single combined file
  - Bambu Slicer: `addnorth_{material}_{printer}_{version}.json` (one file per printer, even if settings are identical)
- **Output Organization**: Configs organized by slicer in output directories
- **Printer ZIPs**: Creates zip archives per printer model containing all configs for that printer (all materials, all nozzles)
- **Release Assets**: Only zip files are attached as GitHub release assets (individual files saved to output folder)
- **Output Folder**: All individual config files saved to `output/` folder, accessible in GitHub Actions workflow
- **Validation**: All configs validated for syntax correctness before generation completes
- **Error Handling**: Clear error messages with file locations when validation fails

### 4. Slicer-Specific Override Format

Override files are slicer-specific and use JSON format for easy merging. Each slicer's overrides are structured appropriately for that slicer's format:

**PrusaSlicer overrides** (applied as INI section modifications):

```json
{
  "nozzles": {
    "0.4mm": {
      "perimeter_speed": 50,
      "layer_height": "0.1-0.3"
    }
  },
  "printers": {
    "MK4": {
      "travel_speed": 200
    }
  }
}
```

**Bambu Slicer overrides** (applied as JSON property updates):

```json
{
  "nozzles": {
    "0.4mm": {
      "nozzle_temperature": [235, 235],
      "filament_max_volumetric_speed": [14, 14]
    }
  },
  "printers": {
    "Bambu Lab X1": {
      "chamber_temperatures": [60]
    }
  }
}
```

These are applied to base configs by format-specific generators.

## Implementation Files

### PrusaSlicer Generator (`build/generators/prusaslicer.js`)

- Parses INI format using ini parser library
- Applies overrides by modifying/adding INI sections
- Handles wildcard patterns and inheritance
- Generates INI files with proper section structure and `addnorth_` prefix
- Can generate single file or material-specific files

### Bambu Slicer Generator (`build/generators/bambuslicer.js`)

- Loads JSON base config
- Applies parameter overrides (deep merge)
- Generates one JSON file per printer (even if settings are identical)
- Each file has `compatible_printers` array with single printer entry
- Generates JSON files with `addnorth_` prefix: `addnorth_{material}_{printer}_{version}.json`

### Config Loader (`build/loaders.js`)

- Loads base material configs (format-aware)
- Loads slicer-specific override files for the material
- Returns structured data for generators

### Parameter Merger (`build/merge.js`)

- Deep merges JSON objects
- Format-aware merging for INI (section-based) vs JSON (object-based)
- Handles array merging strategies
- Validates required fields

### Validator (`build/validate.js`)

- Validates JSON syntax for override files and Bambu Slicer configs
- Validates INI syntax for PrusaSlicer configs
- Checks for required fields in generated configs
- Provides clear error messages with file locations
- Can be run standalone or integrated into build process

### Changelog Generator (`build/changelog.js`)

- Generates changelog from git commits between tags (or since last release)
- Formats commits into readable changelog entries
- Groups commits by type (feat, fix, docs, etc.) if using conventional commits
- Can generate markdown format for release descriptions
- Updates CHANGELOG.md file with new version entry
- Can be run standalone or integrated into release process

### Release Builder (`build/release.js`)

- Collects all generated configs organized by slicer
- Saves all individual config files to `output/{slicer}/` directories
- Creates manifest with searchable metadata (includes slicer, material, printer, nozzle info)
- Creates zip archives per printer model: `addnorth_{printer}_{version}.zip` containing all configs for that printer
- Saves zip files to `output/zips/` directory
- Generates tagged filenames with `addnorth_` prefix matching slicer conventions
- Integrates with changelog generator for release descriptions

### CLI Script (`scripts/build.js`)

- Command-line interface
- Options: `--slicer`, `--material`, `--printer`, `--nozzle`, `--output`, `--release`, `--verbose`, `--dry-run`
- Can build subsets or full release
- Format-aware: understands which generator to use
- `--verbose`: Detailed logging for debugging
- `--dry-run`: Shows what would be generated without creating files
- `--validate-only`: Only validates configs without generating

### GitHub Actions Workflows

**Release Workflow (`.github/workflows/release.yml`):**

- Triggers on version tags (e.g., `v1.0.0`)
- Reads version from git tag or `package.json`
- Generates changelog from commits since last release (or all commits if first release)
- Runs build process with validation
- Saves all individual config files to `output/` folder (accessible in workflow artifacts)
- Creates GitHub release with changelog in release description
- Updates CHANGELOG.md file with new version entry
- Uploads only printer zip archives as release assets (not individual config files)
- Optionally uploads manifest.json as release asset
- Individual config files remain in output folder for access via repository or workflow artifacts

**Validation Workflow (`.github/workflows/validate.yml`):**

- Triggers on pull requests
- Validates all JSON/INI syntax
- Runs build process to ensure configs generate correctly
- Fails PR if validation errors found
- Provides clear error messages in PR comments

## Documentation

### Setup Guide for Material Experts (`docs/setup.md`)

User-friendly guide for non-developers covering:

- Installing Node.js (with download links and step-by-step instructions)
- Cloning the repository (using GitHub Desktop or command line)
- Installing dependencies (`npm install`)
- Running the build process (`npm run build`)
- Understanding the output files
- Basic troubleshooting
- How to edit material configs and overrides
- Testing changes locally before committing

### Example Workflow

1. **Add Material Base Config**: Create `materials/pla/prusaslicer.ini` and `materials/pla/bambuslicer.json` with base settings
2. **Add Slicer-Specific Overrides**: Create `materials/pla/prusaslicer/nozzles.json` and `materials/pla/bambuslicer/nozzles.json` with nozzle-specific settings
3. **Add Combination Overrides** (if needed): Create `materials/pla/prusaslicer/combinations/prusa-mk4-0.4mm.json` for specific combinations
4. **Build**: Run `npm run build` to generate all config permutations
5. **Release**: Tag version → GitHub Actions creates release with assets

## Benefits

- **Format-Native**: Works with actual slicer formats (INI, JSON)
- **Slicer-Specific**: Each slicer's overrides are completely separate and format-appropriate
- **Maintainable**: Clear separation between base configs and slicer-specific overrides
- **Scalable**: Easy to add new materials, slicers, printers
- **Automated**: Release process handles compilation and tagging
- **Parseable**: Consistent naming and manifest for frontend integration
- **Flexible**: Supports both single-file (Bambu) and multi-section (PrusaSlicer) approaches