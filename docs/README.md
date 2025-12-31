# add:north material configs

Material configuration system for generating slicer configurations for add:north 3D-filaments.

## Download

To download the latest released config files, go to [releases](https://github.com/addnorth/material-configs/releases) and select the package for your printer.

## Overview

This repository generates slicer configuration files for different materials, printers, and nozzle sizes. It supports:

- **PrusaSlicer** (INI format)
- **Bambu Slicer** (JSON format)

Configurations are generated with parameter inheritance, allowing shared settings to be defined once and inherited across different combinations.

## Quick Start

### For Material Experts

See [docs/setup.md](setup.md) for a detailed setup guide.

**💡 Tip**: VS Code will automatically show errors in JSON and INI files as you edit them. Red squiggly lines indicate syntax errors that need to be fixed.

### For Developers

1. Install dependencies:

   ```bash
   npm install
   ```

2. **Important**: Always work in a separate branch (never commit directly to `main`) - see [Contributing Guide](contributing.md) for details

3. Build all configs:

   ```bash
   npm run build
   ```

4. Build a release:
   ```bash
   npm run build -- --release
   ```

## Documentation

- [Setup Guide](setup.md) - Setup instructions for material experts
- [Structure](structure.md) - Directory structure and organization
- [Contributing](contributing.md) - Contribution guidelines

## Project Structure

```
material-configs/
├── materials/          # Material configs (organized by slicer)
│   └── {material}/
│       ├── bambuslicer/
│       │   ├── base.json      # Base config
│       │   ├── nozzles.json   # Nozzle overrides
│       │   └── printers.json  # Printer overrides
│       └── prusaslicer/
│           ├── base.ini       # Base config
│           ├── nozzles.json   # Nozzle overrides
│           └── printers.json  # Printer overrides
├── build/              # Build scripts (TypeScript)
├── config/             # Build configs
├── output/             # Generated configs (gitignored)
├── scripts/            # CLI scripts
├── docs/               # Documentation
└── templates/          # Template files for new materials
```

## Usage

### Build Options

```bash
# Build all configs
npm run build

# Build specific material
npm run build -- --material pla

# Build specific slicer
npm run build -- --slicer bambuslicer

# Build release (with zips and manifest)
npm run build -- --release

# Validate only
npm run validate

# Dry run (see what would be generated)
npm run build -- --dry-run --verbose
```

## Releases

Releases are automatically created in two ways:

### Automatic Release on PR Merge

When a PR is merged to `main`, a release is automatically created:

- Version is auto-incremented (patch version: v0.0.1 → v0.0.2)
- Changelog is generated from commits since last release
- Zip files and manifest are created
- A git tag is created automatically

### Manual Release with Tag

You can also create a release by pushing a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow will:

- Build all configs
- Generate changelog from commits
- Create zip files per printer
- Create GitHub release with assets

## License

MIT
