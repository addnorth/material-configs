> ## Download finished profiles
>
> You do **not** need to install anything to **use** released profiles.
>
> 1. Open this link in your browser: [releases](https://github.com/addnorth/material-configs/releases).
> 2. Download the package that matches your **printer** (often a **zip** file).
> 3. Import it in **PrusaSlicer** or **Bambu Studio** using that program’s import instructions.

# add:north Material Configs

Material configuration system for generating slicer configurations for add:north 3D filaments.

## Overview

This repository stores **text files** (mostly JSON and INI) that describe print settings. A **build** step combines them into slicer-ready files.

Supported slicers:

- **PrusaSlicer** (INI format)
- **Bambu Studio** (JSON format)

Settings are **layered**: a base profile is adjusted for printer, nozzle, and specific combinations. You do not repeat every number in every file.

## Quick start

### If you edit material files

1. Follow **[Start here](start-here.md)** if any step is unfamiliar.
2. Follow **[Setup guide](setup.md)** to install an editor (**VS Code** recommended, or **Cursor** if you want AI guidance) and Node.js.
3. Open the project folder in your editor. Edit files under `materials/` and (when needed) `config/`.
4. **Validate** changes with `npm run validate`.
5. **Tip:** Red underlines in JSON/INI usually mean a **syntax** error (for example a missing comma). Fix those before you submit work.
6. Submit work to a new **branch** and then create a **pull request**. Details: **[Contributing](contributing.md)**.

## Documentation

| Document                        | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| [Start here](start-here.md)     | Very beginner-friendly: folders, terminal, GitHub basics    |
| [Setup guide](setup.md)         | Install VS Code or Cursor, Node.js, clone repo, first build |
| [Structure](structure.md)       | What each folder and file type is for                       |
| [Contributing](contributing.md) | Branches, pull requests, validation, code owners            |

## Project structure (short)

```
material-configs/
├── materials/          # Material configs (what most contributors edit)
│   └── {material}/
│       ├── bambuslicer/
│       │   ├── base.json
│       │   ├── nozzles.json
│       │   └── printers.json
│       └── prusaslicer/
│           ├── base.ini
│           ├── nozzles.json
│           └── printers.json
├── config/             # printers.json (registry), slicers.json (slicer ids + scaffold templates)
├── templates/        # Referenced from config/slicers.json for new materials
├── build/              # Build system (TypeScript)
├── output/             # Generated files (after build; not stored in git)
├── scripts/            # Command-line entry point
└── docs/               # This documentation
```

## Common commands

Run these **from the project folder** in a terminal.

```bash
# Check that configs are valid
npm run validate

# Check that configs are valid while editing (hot-reload)
npm run validate:watch

# Build everything
npm run build

# Build everything after each edit (hot-reload)
npm run build:watch

# Build one material only
npm run build -- --material pla

# Build one slicer only (id from config/slicers.json)
npm run build -- --slicer bambuslicer

# Release build (zips + manifest)
npm run build -- --release

# See what would be built without writing files
npm run build -- --dry-run --verbose
```

## Releases

### Automatic release when `main` changes

When changes are merged to `main`, automation will:

- Bump the version (for example patch)
- Build configs and zip files
- Publish a GitHub release

## License

MIT
