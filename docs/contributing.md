# Contributing Guidelines

Thank you for contributing to the material configuration system!

## Getting Started

1. Read the [Setup Guide](setup.md) to set up your environment
2. Read the [Structure Guide](structure.md) to understand the organization
3. **Create a branch** - Never commit directly to `main` (see Pull Request Process below)
4. Make your changes
5. Test your changes
6. Submit a pull request to `main`

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

3. **Test thoroughly**:

   ```bash
   npm run validate
   npm run build
   ```

4. **Update documentation** if needed

5. **Push your branch**:

   ```bash
   git push origin your-branch-name
   ```

6. **Create a Pull Request**:

   - Go to GitHub and create a PR from your branch to `main`
   - Add a clear description of your changes
   - The PR will be automatically validated

7. **Wait for review and approval** before merging

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
