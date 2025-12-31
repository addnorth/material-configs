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

See [docs/setup.md](docs/setup.md) for a detailed setup guide.

### For Developers

1. Install dependencies:

   ```bash
   npm install
   ```

2. **Important**:

   - Always work in a separate branch (never commit directly to `main`)
   - Commit messages must follow the format `feat:`, `fix:`, or `docs:`
   - See [Contributing Guide](docs/contributing.md) for details

3. Build all configs:

   ```bash
   npm run build
   ```

4. Build a release:
   ```bash
   npm run build -- --release
   ```

## Documentation

- [Setup Guide](docs/setup.md) - Setup instructions for material experts
- [Structure](docs/structure.md) - Directory structure and organization
- [Contributing](docs/contributing.md) - Contribution guidelines

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

Releases are automatically created when version tags are pushed:

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
