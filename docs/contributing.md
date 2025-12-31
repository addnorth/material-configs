# Contributing Guidelines

Thank you for contributing to the material configuration system!

## Getting Started

1. Read the [Setup Guide](setup.md) to set up your environment
2. Read the [Structure Guide](structure.md) to understand the organization
3. **Read the Commit Messages section below** - Commit messages are strictly enforced
4. **Create a branch** - Never commit directly to `main` (see Pull Request Process below)
5. Make your changes
6. Test your changes
7. Submit a pull request to `main`

## Adding a New Material

1. Create a new folder in `materials/` with the material name (lowercase, no spaces)
2. Create slicer directories and copy template files:
   - `templates/bambuslicer.json.template` → `materials/{material}/bambuslicer/base.json`
   - `templates/prusaslicer.ini.template` → `materials/{material}/prusaslicer/base.ini`
3. Edit the templates with your material settings
4. Replace placeholders like `{MATERIAL}` and `{MATERIAL_TYPE}`
5. Add override files if needed

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

Create `materials/{material}/{slicer}/printers.json`:

```json
{
  "Prusa MK4": {
    "travel_speed": 200
  },
  "Bambu Lab X1": {
    "chamber_temperatures": [60]
  }
}
```

### Combination Overrides

For specific printer+nozzle combinations, create:
`materials/{material}/{slicer}/combinations/{printer}-{nozzle}.json`

Example: `materials/pla/bambuslicer/combinations/Bambu-Lab-X1-0.4mm.json`

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

## Commit Messages

⚠️ **REQUIRED**: All commit messages **must** follow the conventional commit format. Invalid commit messages will be rejected.

### Allowed Types

Only these three types are permitted:

- **`feat:`** - New features or additions
- **`fix:`** - Bug fixes or corrections
- **`docs:`** - Documentation changes only

### Format

```
type: description
```

Or with optional scope:

```
type(scope): description
```

### Examples

✅ **Valid:**

- `feat: Add PLA material configuration`
- `fix: Correct nozzle temperature for 0.6mm`
- `docs: Update setup guide with troubleshooting`
- `feat(bambuslicer): Add new printer support`
- `fix(prusaslicer): Resolve temperature issue`

❌ **Invalid:**

- `Add PLA material` (missing type prefix)
- `chore: Update dependencies` (chore not allowed)
- `update: Fix bug` (update not allowed, should be fix)
- `feat Add feature` (missing colon)

### Automatic Validation

Commit messages are **automatically validated** and **cannot be bypassed**:

- **Local (Git Hook)**: Every commit is validated before it's created. Invalid messages will prevent the commit.
- **Pull Requests**: All commits in a PR are validated by GitHub Actions. PRs with invalid commit messages will fail validation.

### Editing Commit Messages

If you need to fix a commit message:

**Most recent commit (not pushed):**

```bash
git commit --amend -m "feat: Your corrected message"
```

**Most recent commit (already pushed):**

```bash
git commit --amend -m "feat: Your corrected message"
git push --force-with-lease
```

**Older commits:**

```bash
git rebase -i HEAD~3  # Edit last 3 commits
# Change 'pick' to 'reword' for commits to edit
```

⚠️ **Warning**: Only force push if you're the only one working on the branch.

## Pull Request Process

⚠️ **Important**: Always work in a separate branch. Never commit directly to `main`.

### Step-by-Step

1. **Create a branch from `main`**:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b your-branch-name
   ```

   Use descriptive branch names:

   - `feat/add-petg-material`
   - `fix/bambuslicer-temperature`
   - `docs/update-setup-guide`

2. **Make your changes** on the branch

3. **Use proper commit messages** (see Commit Messages section above):

   ```bash
   git commit -m "feat: Add PETG material configuration"
   ```

4. **Test thoroughly**:

   ```bash
   npm run validate
   npm run build
   ```

5. **Update documentation** if needed

6. **Push your branch**:

   ```bash
   git push origin your-branch-name
   ```

7. **Create a Pull Request**:

   - Go to GitHub and create a PR from your branch to `main`
   - Add a clear description of your changes
   - The PR will be automatically validated (including commit message validation)

8. **Wait for review and approval** before merging

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

Thank you for contributing! 🎉
