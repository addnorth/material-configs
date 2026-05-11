# Setup guide for contributors

This guide helps you put the **material-configs** project on your computer and run checks (optional) that make sure your edits are valid.

If **terminals**, **npm**, or **GitHub** are new to you, read **[Start here](start-here.md)** first. This page assumes you can open a terminal and type (or paste) commands.

## Step 1: Install Cursor (recommended)

**[Cursor](https://cursor.com/)** is the preferred editor for this project. It is built on the same foundation as Visual Studio Code, so it highlights JSON and INI files, shows many mistakes **before** you run any build, and adds **AI-assisted editing** (inline suggestions, chat, and explanations in the editor).

### Install

1. Open your web browser.
2. Go to [https://cursor.com/](https://cursor.com/).
3. Download the version for your system (**Windows**, **Mac**, or **Linux**).
4. Run the installer and accept the default options unless your organisation tells you otherwise.
5. Start Cursor.

### Open this project

1. In Cursor: **File → Open Folder…** (Windows/Linux) or **File → Open…** (Mac).
2. Select the **`material-configs`** folder (the folder you got from Git clone or GitHub Desktop, **not** a zip inside Downloads unless you unzipped it first).
3. If Cursor asks to install **recommended extensions**, say **Install**. They help with JSON and formatting.

### What the colours and lines mean

- **Red squiggles** under text: often a **syntax** error (missing comma, wrong bracket, etc.). Move the mouse over the red text to read the hint.
- **Saving** the file: **Ctrl+S** (Windows/Linux) or **Cmd+S** (Mac). Save often.

### Visual Studio Code (optional)

If you prefer not to use Cursor, **Visual Studio Code** (“VS Code”) is a free alternative with the same JSON/INI editing and squiggles. Install it from [https://code.visualstudio.com/](https://code.visualstudio.com/), then open the `material-configs` folder with **File → Open Folder** and follow the rest of this guide the same way.

## Step 2: Install Node.js

**Node.js** runs the scripts the **validate** script.

Use **Node.js 24 or newer**. If your installer offers several versions, pick one that satisfies that.

### Windows

1. Open [https://nodejs.org/](https://nodejs.org/).
2. Download an installer for **Node.js 24+** (the site’s **Current** or **LTS** line is fine as long as the version is 24 or higher).
3. Run it; accept defaults.
4. **Close and reopen** any terminal windows you had open, or restart the PC if `npm` is still “not found”.

### Mac

1. Open [https://nodejs.org/](https://nodejs.org/).
2. Download a **Node.js 24+** `.pkg` (Current or LTS, as long as the version is 24 or higher) and run it.
3. Enter your Mac password if asked.

### Linux

- Easiest: use the **official installer or package** instructions for your distribution from [https://nodejs.org/](https://nodejs.org/), and install **Node.js 24 or newer**.
- Many distributions provide **`nodejs`** and **`npm`** in their app store or package manager—for example on Debian/Ubuntu you might run:

```bash
sudo apt-get update
sudo apt-get install -y nodejs npm
```

(Exact command depends on your distro; ask your team if unsure.)

### Check that it worked

Open a **new** terminal window and run:

```bash
node --version
npm --version
```

Each command should print a **version number**. For `node --version`, confirm **v24** or higher; npm will warn if your Node version does not match **`package.json`** `engines`. If you see “command not found,” Node is not installed correctly or the terminal needs to be restarted.

## Step 3: Get a copy of the repository

You need the project files on disk. Pick **one** path.

### Option A: GitHub Desktop (good for beginners)

1. Create a free account on [GitHub](https://github.com/) if you do not have one.
2. Install [GitHub Desktop](https://desktop.github.com/).
3. Sign in to GitHub inside the app.
4. **File → Clone repository**. Choose this repo and a folder on your computer (for example `Documents`).
5. After clone finishes, open that folder in Cursor (**File → Open Folder**), or in VS Code if you use that instead.

### Option B: Command line (`git`)

1. Open a terminal.
2. Go to the parent folder where you want the project (example on Mac):

   ```bash
   cd ~/Documents
   ```

3. Clone (replace the URL with the one your team uses if different):

   ```bash
   git clone https://github.com/addnorth/material-configs.git
   ```

4. Enter the new folder:

   ```bash
   cd material-configs
   ```

## Step 4: Install project dependencies

1. Open a terminal **inside** the `material-configs` folder (see [Start here](start-here.md) if `cd` is new).
2. Run:

   ```bash
   npm install
   ```

3. Wait until it finishes. The first run may take a few minutes.

## Step 5: Test with validate

This checks that your validate script can run:

```bash
npm run validate
```

If you see errors, see **Troubleshooting** below.

## Step 6: Where output goes

When you run a real build (`npm run build`), generated files usually appear under:

- `output/prusaslicer/` — PrusaSlicer INI files
- `output/bambuslicer/` — Bambu JSON files
- `output/zips/` — when you use `--release`

The `output/` folder is **not** part of normal Git history; it is rebuilt when you run the build.

## Editing material configs

- Most contributor edits are under **`materials/`** and sometimes **`config/printers.json`** (machine registry).
- **Templates** for a new material live in **`templates/`** (see [Contributing](contributing.md)).

### JSON and INI

- **JSON** files use `{` `}` `[` `]` commas between entries, and **double quotes** `"` around text. One missing comma causes a red squiggle in Cursor (or VS Code).
- **INI** files use **sections** like `[vendor]` and **lines** like `key = value`. Typos in section headers matter.

### Validate before you commit

```bash
npm run validate
```

Optional while iterating — validates once, then again whenever files under `materials/` or `config/` change (not build code or `templates/`):

```bash
npm run validate:watch
```

To build the files locally to see the output, run:

```bash
npm run build
```

## Troubleshooting

### “command not found” / “npm: command not found”

- Node.js is missing or the terminal was opened **before** Node was installed. Install **Node.js 24+**, then **close all terminals** and open a new one.
- On Windows, a restart sometimes fixes PATH issues.

### “Cannot find module”

- Run `npm install` again from the **`material-configs`** folder (not from `C:\` or your home folder only).

### Build or validate fails with validation errors

- Open the file mentioned in the error.
- Fix JSON/INI syntax (Cursor or your editor helps).
- Run `npm run validate` again.

### Need help

- [Structure](structure.md) — what each folder is for
- [Contributing](contributing.md) — workflow and rules
- Ask your team and share the **full error text** (copy-paste or screenshot).

## Next steps

1. [Structure](structure.md) — how files fit together
2. [Contributing](contributing.md) — branches and pull requests
3. Start editing under `materials/`
