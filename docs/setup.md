# Setup Guide for Material Experts

This guide will help you set up the material configuration system on your computer, even if you're not a developer.

## Prerequisites

You'll need:
- A computer (Windows, Mac, or Linux)
- Internet connection
- Basic file editing skills

## Step 1: Install Node.js

Node.js is the software that runs the build scripts.

### Windows

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the "LTS" version (recommended)
3. Run the installer
4. Follow the installation wizard (accept all defaults)
5. Restart your computer

### Mac

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the "LTS" version (recommended)
3. Open the downloaded `.pkg` file
4. Follow the installation wizard
5. You may need to enter your password

### Linux

Open a terminal and run:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Verify Installation

Open a terminal (or Command Prompt on Windows) and type:
```bash
node --version
npm --version
```

You should see version numbers. If you see an error, Node.js is not installed correctly.

## Step 2: Get the Repository

### Option A: Using GitHub Desktop (Easier)

1. Download [GitHub Desktop](https://desktop.github.com/)
2. Install and sign in with your GitHub account
3. Click "Clone a repository from the Internet"
4. Find this repository and click "Clone"
5. Choose where to save it on your computer

### Option B: Using Command Line

1. Open a terminal
2. Navigate to where you want the project:
   ```bash
   cd ~/Documents  # or wherever you want it
   ```
3. Clone the repository:
   ```bash
   git clone https://github.com/your-org/material-configuration.git
   ```
4. Go into the folder:
   ```bash
   cd material-configuration
   ```

## Step 3: Install Dependencies

1. Open a terminal in the project folder
2. Run:
   ```bash
   npm install
   ```

This will download all the required software packages. It may take a few minutes.

## Step 4: Test the Setup

Run a test build:
```bash
npm run build -- --dry-run --verbose
```

You should see output showing what would be generated. If you see errors, check:
- Node.js is installed correctly
- You're in the correct folder
- Dependencies were installed

## Step 5: Understanding the Output

After running `npm run build`, you'll find generated files in:
- `output/prusaslicer/` - PrusaSlicer config files
- `output/bambuslicer/` - Bambu Slicer config files
- `output/zips/` - Zip files (when using `--release`)

## Editing Material Configs

### Adding a New Material

1. Create a new folder in `materials/` with the material name (e.g., `materials/pla/`)
2. Copy the template files from `templates/`:
   - `bambuslicer.json.template` → `materials/pla/bambuslicer/base.json`
   - `prusaslicer.ini.template` → `materials/pla/prusaslicer/base.ini`
3. Edit the files with your material settings
4. Run `npm run build` to generate configs

### Adding Overrides

Create override files in:
- `materials/{material}/{slicer}/nozzles.json` - Nozzle-specific settings
- `materials/{material}/{slicer}/printers.json` - Printer-specific settings
- `materials/{material}/{slicer}/combinations/{printer}-{nozzle}.json` - Specific combinations

## Testing Changes

Before committing changes:

1. Validate your configs:
   ```bash
   npm run validate
   ```

2. Test build:
   ```bash
   npm run build -- --material your-material --verbose
   ```

3. Check the output files in `output/`

## Troubleshooting

### "command not found" or "npm: command not found"

- Node.js is not installed or not in your PATH
- Restart your terminal after installing Node.js
- On Windows, restart your computer

### "Cannot find module" errors

- Run `npm install` again
- Make sure you're in the project folder

### Build fails with validation errors

- Check your JSON/INI files for syntax errors
- Use a JSON validator online for JSON files
- Make sure all quotes and brackets are properly closed

### Need Help?

- Check the [Structure Guide](structure.md) for file organization
- Check the [Contributing Guide](contributing.md) for best practices
- Ask your team for help

## Next Steps

Once setup is complete:
1. Read the [Structure Guide](structure.md) to understand the file organization
2. Read the [Contributing Guide](contributing.md) for best practices
3. Start editing material configs!
