# Start here

This page is for you if you want to help with material profiles but are **not** used to developer tools yet. You can do a lot with a normal file editor; the extra steps below are only needed if you want to **run checks on your computer** or **submit changes through GitHub**.

---

## What this project is

This **repository** (“repo”) is a collection of **text files** that describe 3D-print settings for different filaments and printers. A **build** step turns those files into profiles you can import into **PrusaSlicer** or **Bambu Studio**.

You **do not** need to understand programming to **read** or **edit** many of these files.

---

## Words that appear everywhere

| Word                        | Meaning                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**                    | One document on the computer, for example `base.json`.                                                                                        |
| **Folder** (directory)      | A container for files and other folders.                                                                                                      |
| **Save**                    | Write your changes to disk. Use **Save** often (keyboard: **Ctrl+S** on Windows/Linux, **Cmd+S** on Mac).                                     |
| **Path**                    | How you get from the disk root to a file, for example `materials/pla/bambuslicer/base.json`.                                                  |
| **Browser**                 | The program you use for websites (Chrome, Edge, Firefox, Safari).                                                                             |
| **Download**                | Copy a file from the internet to your computer.                                                                                               |
| **Copy / paste**            | **Copy**: select text, then **Ctrl+C** (Windows/Linux) or **Cmd+C** (Mac). **Paste**: click where it should go, then **Ctrl+V** or **Cmd+V**. |
| **GitHub**                  | A website where this project’s files are stored and where people suggest changes.                                                             |
| **Terminal** (command line) | A text window where you type commands instead of clicking. It can feel scary at first; you only need a few commands here.                     |

---

## I only want ready-made profiles

You **do not** need this repo on your computer.

1. Open your web **browser**.
2. Go to the project’s **Releases** page (your team can give you the link; it looks like `https://github.com/.../releases`).
3. **Download** the file or **zip** that matches your **printer**.
4. Import that file into your slicer using the slicer’s **import** or **import config** option (see your Printer’s app help).

---

## I want to edit settings files on my computer

1. Get a copy of the project on your machine (see the [Setup guide](setup.md)): either **GitHub Desktop** (clicks) or **git** in the terminal.
2. Install an editor: **[Visual Studio Code](https://code.visualstudio.com/)** (“VS Code”, **free**) is a good default. If you want **AI guidance** while editing, **[Cursor](https://cursor.com/)** works the same way for opening folders and reading JSON/INI. Use **File → Open Folder** to open the `material-configs` folder.
3. Edit files under `materials/` (and sometimes `config/`) as described in [Structure](structure.md) and [Contributing](contributing.md).
4. Red **squiggles** in the editor usually mean a **syntax** problem (for example a missing comma in JSON). Fix those before you share your work.

If typing commands is new for you, read **“Your first commands in the terminal”** below before running `npm install` or `npm run validate`.

---

## Your first commands in the terminal

The terminal is a window with a **prompt** (often ends with `%` or `>`). You **type a line** and press **Enter**. The computer runs it and may print many lines; that is normal.

### Open the terminal

- **Windows:** Press the **Windows key**, type **cmd**, press **Enter**. Or search for **Terminal** / **PowerShell** and open it.
- **Mac:** Press **Cmd+Space**, type **Terminal**, press **Enter**.

### Go to the project folder (`cd`)

The command `**cd`** means “**c**hange **d\*\*irectory” (go to a folder).

**Windows example** (quotes matter if the path has spaces):

```text
cd C:\Users\YOURNAME\Documents\material-configs
```

**Mac example:**

```text
cd ~/Documents/material-configs
```

Replace the path with **your** actual folder (the place where GitHub Desktop or `git clone` put the project).

**Tip:** In VS Code or Cursor, you can use **Terminal → New Terminal**; it often opens **already inside** the project folder.

### Copy-paste a command safely

1. **Copy** the command from the docs (whole line).
2. Click inside the terminal window.
3. **Paste** and press **Enter**.
4. If the text says **“command not found”** for `node` or `npm`, install **Node.js 24 or newer** from [nodejs.org](https://nodejs.org/) (see **[Setup guide](setup.md)**), **close** the terminal, open it again, and try again.

### Commands used in this project

You run these **from the project folder** (after `cd`):

```bash
npm install
```

(Downloads helper tools. Only needed once after you clone, or if someone says dependencies changed.)

```bash
npm run validate
```

(Checks that config files are valid.)

```bash
npm run build
```

(Generates files under `output/`.)

If a command fails, read the **last few lines** of the message; they usually say what is wrong.

---

## I want to suggest changes on GitHub (pull request)

A **pull request** (“PR”) means: “Please take my changes and merge them into the main project.”

You need a **GitHub account** (free). The easiest path for beginners is **[GitHub Desktop](https://desktop.github.com/)**:

1. Install GitHub Desktop and **sign in**.
2. **Clone** this repository (Repository → Clone).
3. Before editing, create a **new branch** (Branch → New branch) with a short name, for example `add-my-petg`.
4. Edit files, **save**, then in GitHub Desktop **commit** your changes with a **short message** describing what you did.
5. **Push** to GitHub, then use the website button to **open a pull request**.

More detail: [Contributing](contributing.md).

---

## Where to read next

| If you want to…                   | Read…                            |
| --------------------------------- | -------------------------------- |
| Install tools and clone the repo  | [Setup guide](setup.md)          |
| Understand folders and file types | [Structure](structure.md)        |
| Submit changes and naming rules   | [Contributing](contributing.md)  |
| Overview and build commands       | [Documentation index](README.md) |

If you get stuck, ask someone on your team and tell them **which step** you are on and **the exact message** you see on screen (a screenshot helps).
