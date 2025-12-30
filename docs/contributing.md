# Contributing Guidelines

Thank you for contributing to the material configuration system!

## Getting Started

1. Read the [Setup Guide](setup.md) to set up your environment
2. Read the [Structure Guide](structure.md) to understand the organization
3. Make your changes
4. Test your changes
5. Submit a pull request

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

Use clear, descriptive commit messages:

- `feat: Add PLA material configuration`
- `fix: Correct nozzle temperature for 0.6mm`
- `docs: Update setup guide with troubleshooting`

## Pull Request Process

1. Create a branch for your changes
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit PR with clear description
6. The PR will be automatically validated

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
