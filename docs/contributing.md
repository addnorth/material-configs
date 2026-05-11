# Contributing guidelines

Thank you for helping improve these material profiles.

**If you are new to Git, terminals, or GitHub**, read **[Start here](start-here.md)** first, then come back here for the project-specific rules.

## Getting started (short)

1. Read **[Setup](setup.md)** so your computer can run `npm run validate` (recommended).
2. Read **[Structure](structure.md)** so you know which files to touch.
3. **Do not commit directly to `main`.** Use a **branch** and a **pull request** (explained below).
4. Change files, **save**, run **`npm run validate`**, then open a pull request.
5. Wait for review before your changes are merged.

## Adding a new material

1. **Scaffold (recommended):** from the repo root run **`npm run add-material`**, enter a short folder name (e.g. `petg`), or run **`npm run add-material -- --material petg`**. This creates one folder per slicer in **`config/slicers.json`** (e.g. `bambuslicer/`, `prusaslicer/`) with the matching **`baseFilename`** from each row’s **`template`**, plus empty **`printers.json`** / **`nozzles.json`** and **`combinations/`** (with `.gitkeep`).
2. **Or manually:** create `materials/{material}/` (lowercase, no spaces). For each slicer row in **`config/slicers.json`**, create `materials/{material}/{id}/`, copy that row’s **`template`** to **`baseFilename`**, and replace `{MATERIAL}` / `{MATERIAL_TYPE}` yourself.
3. Tune temperatures and other settings for your filament.
4. Add entries to **`printers.json`**, **`nozzles.json`**, and optional **`combinations/<printerId>-<nozzle>.json`** when you need overrides beyond the base files.

## Adding Overrides

### Nozzle Overrides

Create `materials/{material}/{slicer}/nozzles.json`:

```json
{
  "0.4mm": {
    "perimeter_speed": 50,
    "layer_height": "0.1-0.3"
  },
  "0.6mm": {
    "perimeter_speed": 40,
    "layer_height": "0.15-0.45"
  }
}
```

### Printer Overrides

Create `materials/{material}/{slicer}/printers.json` **only for printers you need to override**. Keys are **short IDs** and must match a printer `id` in the machine registry [`config/printers.json`](../config/printers.json) (nested under some vendor’s `printers`). That registry also holds vendor `name` / `url`.

```json
{
  "printers": {
    "MK4": {
      "travel_speed": 200
    },
    "X1": {
      "chamber_temperatures": ["0"]
    }
  }
}
```

### Combination Overrides

For specific printer+nozzle combinations, create:
`materials/{material}/{slicer}/combinations/{printerId}-{nozzle}.json`

Example: `materials/pla/bambuslicer/combinations/X1-0.4mm.json`

## Testing Your Changes

Before submitting:

1. **Validate syntax**:

   ```bash
   npm run validate
   ```

2. **Test build**:

   ```bash
   npm run build -- --material your-material --verbose
   ```

3. **Check output**:
   - Verify files are generated correctly
   - Check file names match conventions
   - Verify content is correct

4. **Test release build** (if making significant changes):
   ```bash
   npm run build -- --release --dry-run
   ```

## Code Style

- Use consistent formatting
- Follow existing patterns
- Add comments for complex logic
- Keep JSON files properly formatted (2 spaces indentation)

## Pull request process

**Rule:** Always work on a **branch** with a clear name. Do **not** push straight to `main`.

### If you use GitHub Desktop (recommended for beginners)

1. **Fetch** the latest **main**: **Repository → Pull** (or sync).
2. **Branch → New Branch…** — name example: `add-petg-profiles`.
3. Edit files in your editor (for example VS Code or Cursor); **save**.
4. In GitHub Desktop: write a **short summary** of what you changed, click **Commit to …**, then **Push origin**.
5. On the GitHub website, open **Pull requests → New pull request**. Compare your branch to `main`, describe the change, submit.

### If you use the command line

1. **Create a branch from `main`**:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b your-branch-name
   ```

   **Branch name examples:** `feat/add-petg-material`, `fix/bambuslicer-temperature`, `docs/update-setup-guide`.

2. **Make your changes** on that branch.

3. **Test**:

   ```bash
   npm run validate
   npm run build
   ```

4. **Commit and push** (if you know `git`; otherwise use GitHub Desktop):

   ```bash
   git add .
   git commit -m "Short description of change"
   git push origin your-branch-name
   ```

5. On **GitHub**, open a **pull request** from your branch to **`main`**. Describe what you changed. Automated checks may run on the PR.

6. **Wait for review and approval** before merging.

### What is a pull request?

A **pull request** is a request on GitHub: “Please review and merge my branch into `main`.” **Reviewers** can leave comments; you can push more commits to the **same branch** to address feedback.

### Code owners

Reviews are enforced with [`.github/CODEOWNERS`](../.github/CODEOWNERS) (GitHub “Require review from Code Owners” on `main`):

- If the PR **only** changes `materials/` and/or `config/printers.json`, an approval from someone listed for those paths is enough.
- If the PR changes **any other** path (for example `build/`, `scripts/`, `.github/`, `templates/`, root files, or `docs/`), the catch-all owners in that file must approve too. If both kinds of files change, **every** matching rule must be satisfied (same person can count if they appear on multiple lines).

Listed users must have **write** access to this repository to approve as a code owner.

### Branch protection (maintainers)

In GitHub: **Settings → Branches → Branch protection rule** for `main`:

- Require a pull request before merging
- Require a number of approvals (typically at least 1)
- Require review from Code Owners
- Require status checks to pass before merging (include **`Validate / validate`** — that is the workflow `name` in [`.github/workflows/validate.yml`](../.github/workflows/validate.yml) plus the job id `validate`)
- Recommended: dismiss stale pull request approvals when new commits are pushed

**If the check does not appear in the “add checks” search:** GitHub only lists checks that have already completed for this repository’s default branch (or the protected branch). Do one of the following, then try again:

1. Merge this workflow to `main`, open **Actions → Validate → Run workflow**, choose branch **`main`**, and run it once; or
2. Open (or merge) any pull request to `main` so **Validate** runs on a commit reachable from `main`.

The name in the UI is usually **`Validate / validate`** (search for `validate` if needed).

## Validation

All PRs are automatically validated:

- JSON/INI syntax checking
- Build process verification
- Config generation testing

If validation fails, fix the issues and push again.

## Questions?

- Check existing materials for examples
- Ask your team for help
- Review the documentation

Thank you for contributing!
