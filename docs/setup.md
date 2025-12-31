# Setup Guide for Contributers

This guide will help you set up the material configs system on your computer, even if you're not a developer.

## Prerequisites

You'll need:

- A computer (Windows, Mac, or Linux)
- Internet connection
- Basic file editing skills

## Step 1: Install VS Code (Recommended)

VS Code is a free code editor that will help you edit JSON and INI files with automatic error checking.

### Why VS Code?

- **Automatic error detection**: Shows errors in JSON/INI files as you type
- **Auto-formatting**: Keeps your files properly formatted
- **Easy to use**: Works like a text editor but with helpful features

### Installation

1. Go to [code.visualstudio.com](https://code.visualstudio.com/)
2. Download VS Code for your operating system
3. Install it (accept all defaults)
4. Open VS Code

### First Time Setup

1. Open this project folder in VS Code:
   - File → Open Folder
   - Select the `material-configs` folder
2. VS Code will suggest installing recommended extensions - click "Install"
3. You're all set! VS Code will now:
   - Show errors in JSON files (red squiggly lines)
   - Show errors in INI files
   - Auto-format files when you save
   - Highlight syntax errors

### What You'll See

- **Red squiggly lines** = Syntax error (missing comma, bracket, etc.)
- **Yellow warnings** = Potential issues
- **Green checkmark** = File is valid

## Step 2: Install Node.js

Node.js is the software that runs the build scripts. (You can skip this if you only want to edit files - VS Code will still validate your JSON/INI files)

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

## Step 3: Get the Repository

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
   git clone https://github.com/addnorth/material-configs.git
   ```
4. Go into the folder:
   ```bash
   cd material-configs
   ```

## Step 4: Install Dependencies

1. Open a terminal in the project folder
2. Run:
   ```bash
   npm install
   ```

This will download all the required software packages. It may take a few minutes.

## Step 5: Test the Setup

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

Files related to configuring the profiles are located in `materials/`, `config/` and `templates/`

### VS Code Validation

When editing files in VS Code, you'll see:

- **Red squiggly lines** = Syntax error (missing comma, bracket, quote, etc.)
  - Hover over the red line to see what's wrong
  - Common errors: missing commas, unclosed brackets, typos in quotes
- **Yellow warnings** = Potential issues
- **No errors** = File is valid ✅

**Example errors you might see:**

- `Expected ',' or '}'` - Missing comma between properties
- `Expected property name` - Syntax error in JSON
- `Unexpected token` - Invalid character or structure

**How to fix:**

1. Click on the red line
2. Read the error message
3. Fix the syntax issue
4. Save the file (Ctrl+S / Cmd+S)
5. The error should disappear if fixed correctly

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
