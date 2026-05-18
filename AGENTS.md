# Agent instructions — material-configs

This repository builds **slicer filament profiles** (PrusaSlicer INI, Bambu Studio JSON) for add:north materials from layered source configs. Human-oriented docs live under `docs/`; start with `docs/README.md` and `docs/structure.md` for full detail.

## Access and CODEOWNERS

Before changing files, determine **who is driving the session** and treat `[.github/CODEOWNERS](.github/CODEOWNERS)` as the source of truth for roles.

### Detect GitHub username

1. Prefer `**gh api user --jq .login`** (GitHub CLI must be logged in). Compare the returned login to CODEOWNERS **without** a leading `@`.
2. If `gh` is missing or not authenticated, **ask the human** for their GitHub username, or whether this is an **admin** session vs **material/registry-only** session.

### Map CODEOWNERS to roles

Parse `.github/CODEOWNERS`: skip lines that are only comments; on owner lines, read `@username` tokens (this file uses users, not teams).


| Role                           | Meaning in this repo                              | How to detect from CODEOWNERS                                             |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- |
| **Admin**                      | May change any path (`build/`, `docs/`, CI, etc.) | Username appears on a line whose pattern is exactly `***`**.              |
| **Material/registry reviewer** | Typical scope for limited PRs                     | Username appears on `**/materials/`** and/or `**/config/printers.json**`. |


If the user is on the `*****` line, they are an **admin** (even if they also appear on reviewer lines).

Anyone **not** on the `***`** line is **non-admin** for the edit rules below.

**Teams:** If CODEOWNER entries use `@org/team` instead of users, membership cannot be verified from the CLI alone — ask the human to state **admin** vs **non-admin**, or restrict edits to `materials/` and `config/printers.json` until clarified.

### Edit restrictions for non-admins

If the session user is **not** an admin:

- **May edit only**: `**materials/`** (all material and slicer files, including override `printers.json` under each slicer) and `**config/printers.json**` (repo-wide machine registry — not other files under `**config/**`, e.g. `**slicers.json**`).
- **Do not edit**: `**build/`**, `**scripts/**`, `**docs/**`, `**AGENTS.md**`, `**.github/**`, `**package.json**`, `**templates/**`, root `**README.md**`, `**tsconfig.json**`, etc., even if elsewhere in this file suggests it.
- You may still **run** commands such as `**npm run validate`** / `**npm run build**` to check work.
- If the task needs changes outside the allowed paths, **stop and explain**; an admin must do that work (or merge it).

If a non-admin **explicitly orders** edits in a forbidden path, **refuse** unless they confirm an admin session (re-check `gh api user` against the `***`** owners line).

## What to change for typical tasks


| Goal                                                                              | Where to work                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tune speeds, temperatures, etc. for a material                                    | `materials/<material>/<slicer>/` — `base.ini` (PrusaSlicer) or `base.json` (Bambu), plus optional `nozzles.json`, `printers.json`, `combinations/`                                                                                                                                                                         |
| Add or rename **slicers** (folder ids, templates, `base.ini` / `base.json` names) | `**config/slicers.json`** (each row: `id`, `format`, `baseFilename`, `template` path). Printer rows in `**config/printers.json**` must use those `**id**` values in `**slicers**` arrays.                                                                                                                                  |
| Add or rename printers / nozzles in the build                                     | `**config/printers.json**` (machine registry): `vendors[]` with `id`, `name`, `url`, and nested `**printers[]**` (`id`, `name`, `slicers`, `nozzles`). Printer `name` is the human-readable model string (e.g. for Bambu `compatible_printers`). This file is **not** the same as `materials/.../printers.json` overrides. |
| Fix or extend the build pipeline                                                  | TypeScript in `build/` and `scripts/`                                                                                                                                                                                                                                                                                      |
| New material from scratch                                                         | `**npm run add-material`** or new `materials/<material>/` tree using templates from `**config/slicers.json**` (see `**docs/contributing.md**`)                                                                                                                                                                             |


**Printer IDs** in override JSON and combination filenames must match a printer `id` under some vendor’s `printers` in `**config/printers.json`** (e.g. `MK4`, `X1`, `A1mini`).

**Combination files**: `materials/<material>/<slicer>/combinations/<printerId>-<nozzle>.json` (e.g. `X1-0.4mm.json`). Nozzle keys use the same strings as in the registry (e.g. `0.4mm`).

## Merge order (later wins)

1. Base (`base.ini` / `base.json`)
2. Printer overrides (`printers.json`)
3. Nozzle overrides (`nozzles.json`)
4. Combination overrides (`combinations/*.json`)

## Commands (run from repo root)

- `**npm ci`** then `**npm run validate**` — matches CI: compiles TypeScript (`tsc`) and validates all configs (also the right check before a PR).
- `**npm run validate:watch**` — runs `**npm run validate**` once, then re-runs it when `**materials/**` or `**config/**` change (uses `**chokidar-cli**`; debounced ~400ms). After editing TypeScript or templates, run `**npm run validate**` yourself.
- `**npm run lint**` / `**npm run lint:fix**` — ESLint over `**build/**`, `**scripts/**`, `**eslint.config.js**` (see `**eslint.config.js**`).
- `**npm run format:check**` / `**npm run format**` — Prettier (`**.prettierrc.json**`, `**.prettierignore**`).
- `**npm run build**` — full generate into `output/` (clears per-slicer dirs under `output/` first).
- `**npm run build:watch**` — runs `**npm run build**` whenever `**build/**`, `**scripts/**`, `**materials/**`, `**config/**`, or `**templates/**` change (runs once on start).
- `**npm run build -- --material <name> --verbose**` — scoped build while iterating.
- `**npm run build -- --validate-only**` — validation only (same idea as `npm run validate`).
- `**npm run build -- --release --dry-run**` — inspect release layout without writing everything.

**Version labels** in outputs: `VERSION` env overrides; otherwise `git describe --tags --exact-match HEAD`, else `package.json` `version` with a `v` prefix (see `build/changelog.ts`).

## TypeScript and layout

- **ES modules** (`"type": "module"`), **strict** TypeScript, output in `dist/`. Source: `build/**/*.ts`, `scripts/**/*.ts` (`tsconfig.json`).
- After editing `.ts` files, `**npx tsc`** (or `npm run build` / `validate`, which compile first) before running `node dist/...` directly.
- Entry CLI: `scripts/build.ts` → `dist/scripts/build.js`.

**Generators**: Slicer `**id`** and `**format**` (`ini` vs `json`) come from `**config/slicers.json**`. `ini` → `build/generators/prusaslicer.ts`; `json` → `build/generators/bambuslicer.ts`. Registry and format detection: `build/generators/registry.ts`.

## Validation and CI

- GitHub Actions **Validate** workflow: `npm ci`, `npx tsc`, `npm run validate` (`.github/workflows/validate.yml`).
- Do not commit `**output/`** — generated and gitignored.

## Conventions for agents

- Prefer **small, focused changes**; match existing patterns in nearby files.
- Keep JSON **2-space** indentation; ensure **valid JSON/INI** — broken syntax fails `validate`.
- When adding printer-specific behavior, ensure the printer exists in `**config/printers.json`** and that `slicers` / `nozzles` align with what you reference in overrides.
- For workflow/process (branches, PRs), follow `**docs/contributing.md**`.
- **Keep documentation in sync**: when you change directory layout, registry shape, CLI flags, build steps, CI, validation rules, or contributor workflow, update the relevant `**docs/`** pages (especially `README.md`, `structure.md`, `setup.md`, `contributing.md`) and `**README.md**` at the repo root so they stay accurate. **Non-admins** should not edit those files; mention needed doc updates for an admin instead.

## When stuck

- **Directory map and naming**: `docs/structure.md`
- **Setup / Node**: `docs/setup.md`
- **Contributor steps**: `docs/contributing.md`

## Cursor Cloud specific instructions

This is a pure Node.js CLI project with **no runtime services** (no servers, databases, or Docker). The update script handles `nvm install 24` and `npm ci`.

- **Node.js 24+** is required (`engines` field in `package.json`). The VM uses nvm; ensure `nvm use 24` is active in your shell (the update script sets it as default).
- The `fatal: no tag exactly matches ...` message during `npm run build` is **normal** on non-tagged commits — the build falls back to the `package.json` version.
- `npm run format:check` may report pre-existing style issues; do not fix them unless the task specifically asks for formatting.
- All commands are documented in the **Commands** section above and in `docs/README.md`. Key quick reference:
  - Validate: `npm run validate`
  - Lint: `npm run lint`
  - Build: `npm run build`
  - Scoped build: `npm run build -- --material <name> --verbose`
- There are **no automated test suites** (no `npm test`). Validation (`npm run validate`) is the primary correctness check. Always run it before committing.

